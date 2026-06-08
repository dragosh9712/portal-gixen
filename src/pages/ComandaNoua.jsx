import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, eur } from '../utils'
import { calculeazaCos, getPromotiiNotificabile } from '../promoEngine.js'

const TVA = 0.21

function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

function ProductImg({ src, name }) {
  const [err, setErr] = useState(false)
  if (!src || err) return (
    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🧻</div>
  )
  return <img src={src} alt={name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} onError={() => setErr(true)} />
}

// Calculează UoM corect în funcție de tipul de transport al clientului
function getRelevantUoms(product, transportType) {
  const allUoms = (product.product_uom || []).filter(u => u.is_orderable)
  if (!allUoms.length) return []
  // Excludem PALET incompatibil cu transportul
  return allUoms.filter(u => {
    if (u.uom_code === 'PALET_DUBA' && transportType === 'Truck') return false
    if (u.uom_code === 'PALET_CAMION' && transportType === 'Van') return false
    return true
  }).sort((a, b) => a.sort_order - b.sort_order)
}

// Auto-detectare tip transport din coș
function detectTransportType(liniiCos, products) {
  let totalRole = 0
  for (const l of liniiCos) {
    totalRole += l.cantRole || 0
  }
  // Dacă > 1 palet camion mediu → sugerăm camion
  // Luăm produsul cu cel mai mare palet camion din coș
  let maxPaletCamion = 0
  for (const l of liniiCos) {
    const uom = (l.produs?.product_uom || []).find(u => u.uom_code === 'PALET_CAMION')
    if (uom && uom.coeficient > maxPaletCamion) maxPaletCamion = uom.coeficient
  }
  if (maxPaletCamion > 0 && totalRole >= maxPaletCamion) return 'Truck'
  return 'Van'
}

export default function ComandaNoua() {
  const { user } = useAuth()
  const { db, createOrder, getPretPentruClient, getExchangeRate, checkCreditLimit } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const clientId = user.customerId || user.firmId || null
  const firma = (db.firms || []).find(f => f.id === clientId)
  const isEur = firma?.currency === 'EUR'
  const exRate = getExchangeRate('EUR')
  const vizProduse = firma?.vizibilitate_produse || 'gixen_si_proprii'

  const produse = (db.products || []).filter(p => {
    if (!p.activ) return false
    const isPrivatAl  = p.private_brand_firm_id === clientId
    const isGixen     = !p.private_brand_firm_id
    const isAltClient = p.private_brand_firm_id && !isPrivatAl
    if (isAltClient) return false
    if (vizProduse === 'doar_proprii' && !isPrivatAl) return false
    if (vizProduse === 'gixen_only'   && !isGixen)   return false
    return true
  })

  const [cart, setCart] = useState({})
  const [dataLivrare, setDataLivrare] = useState('')
  const [observatii, setObservatii] = useState('')
  // Bug 16: delivery location per comandă
  const [deliveryLocationId, setDeliveryLocationId] = useState('main')
  const [paymentType, setPaymentType] = useState('OP')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('toate')
  const [toast, setToast] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [creditWarning, setCreditWarning] = useState(null)

  // Adresa de livrare selectată (sediu sau locație delegat)
  const deliveryLocations = [
    { id: 'main', name: 'Sediu principal', adresa: firma?.adresa || '' },
    ...(firma?.delivery_locations || []).map(dl => ({ id: dl.id, name: dl.name, adresa: dl.adresa }))
  ]
  const selectedDelivery = deliveryLocations.find(d => d.id === deliveryLocationId) || deliveryLocations[0]

  useEffect(() => {
    if (location.state?.reorderLines) {
      const newCart = {}
      location.state.reorderLines.forEach(line => {
        newCart[line.productId] = { cantitate: line.cantitate, unitateSel: line.uom_code || 'BAX' }
      })
      setCart(newCart)
    }
  }, [])

  function getUomCoeficient(product, uomCode) {
    const uom = (product.product_uom || []).find(u => u.uom_code === uomCode)
    return uom?.coeficient || 1
  }

  // Unitatea de măsură atribuită clientului (paletizarea preferată)
  const assignedUom = firma?.paletizare_preferata || null

  function getDefaultUom(product) {
    const uoms = (product.product_uom || []).filter(u => u.is_orderable).sort((a, b) => a.sort_order - b.sort_order)
    // Dacă firma are o unitate atribuită și produsul o suportă, o folosim forțat
    if (assignedUom && uoms.some(u => u.uom_code === assignedUom)) return assignedUom
    // Default BAX (nu rolă singulară)
    return uoms.find(u => u.uom_code === 'BAX')?.uom_code || uoms[0]?.uom_code || 'BAX'
  }

  const liniiCos = useMemo(() => {
    return Object.entries(cart).map(([productId, { cantitate, unitateSel }]) => {
      const produs = produse.find(p => p.id === productId)
      if (!produs || !cantitate) return null
      const coef = getUomCoeficient(produs, unitateSel)
      const cantRole = cantitate * coef
      const pretClient = getPretPentruClient(productId, clientId)
      return { productId, cantitate, unitateSel, cantRole, produs, totalBrutLinie: pretClient * cantRole, pretUnitar: pretClient }
    }).filter(Boolean)
  }, [cart, produse, user.firmId])

  // Bug 14: auto-detectare transport din cantitate
  const autoTransportType = useMemo(() => detectTransportType(liniiCos, produse), [liniiCos])

  const { liniiCalculate, discountLinii, totalBrut, totalDiscount, totalNet } = useMemo(() => {
    return calculeazaCos(liniiCos, firma, db)
  }, [liniiCos, firma, db])

  const notificari = useMemo(() => getPromotiiNotificabile(liniiCos, firma, db), [liniiCos, firma, db])
  const totalCuTva = Math.round(totalNet * (1 + TVA) * 100) / 100

  function setQty(productId, cantitate, unitateSel) {
    setCart(prev => ({
      ...prev,
      [productId]: { cantitate: Math.max(0, cantitate), unitateSel: unitateSel || prev[productId]?.unitateSel || getDefaultUom(produse.find(p => p.id === productId)) }
    }))
  }

  function setUom(productId, unitateSel) {
    setCart(prev => ({ ...prev, [productId]: { ...prev[productId], unitateSel } }))
  }

  function removeFromCart(productId) {
    setCart(prev => { const next = { ...prev }; delete next[productId]; return next })
  }

  function getPretPerUom(product, uomCode) {
    const pretRola = getPretPentruClient(product.id, user.firmId)
    const coef = getUomCoeficient(product, uomCode)
    return Math.round(pretRola * coef * 100) / 100
  }

  function fmtVal(val) {
    if (isEur && exRate) return eur(val / exRate.applied_rate)
    return lei(val)
  }

  async function handleConfirm() {
    if (!liniiCos.length) return setToast({ msg: 'Coșul este gol!', type: 'error' })
    const creditCheck = await checkCreditLimit(clientId, totalCuTva)
    if (creditCheck.warning) {
      setCreditWarning({ ...creditCheck, orderTotal: totalCuTva })
      if (creditCheck.block) { setToast({ msg: creditCheck.message, type: 'error' }); return }
    }
    setConfirming(true)
  }

  function handlePlaceOrder() {
    const lines = liniiCos.map(l => ({
      productId: l.productId, cantitate: l.cantitate, unitateSel: l.unitateSel,
      uom_id: (l.produs.product_uom || []).find(u => u.uom_code === l.unitateSel)?.uom_id,
      pretUnitar: Math.round(l.pretUnitar * getUomCoeficient(l.produs, l.unitateSel) * 100) / 100, total: Math.round(l.totalBrutLinie * 100) / 100
    }))
    createOrder(
      clientId, user.id, lines, dataLivrare, observatii,
      selectedDelivery?.adresa || '', discountLinii,
      { payment_type: paymentType, transport_type: autoTransportType }
    )
    setConfirming(false); setCreditWarning(null); setCart({})
    setToast({ msg: '✓ Comandă plasată cu succes!', type: 'success' })
    setTimeout(() => navigate('/comenzile-mele'), 2000)
  }

  const categories = ['toate', ...new Set(produse.map(p => p.categorie).filter(Boolean))]
  const filteredProduse = produse.filter(p => {
    const matchCat = catFilter === 'toate' || p.categorie === catFilter
    const q = search.toLowerCase()
    return matchCat && (!q || p.name.toLowerCase().includes(q) || (p.cod || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q))
  })

  return (
    <Layout title="Comandă nouă" subtitle={firma?.name}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Notificări promoții + buton adaugă */}
      {notificari.map((n, i) => (
        <div key={i} style={{ background: 'var(--orange-bg)', border: '1px solid rgba(234,88,12,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: 'var(--orange-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>💡 {n.mesaj}</span>
          {n.productIdSugerat && (
            <button className="btn btn-sm" style={{ background: 'var(--orange-text)', color: '#fff', border: 'none', fontSize: 11 }}
              onClick={() => setQty(n.productIdSugerat, (cart[n.productIdSugerat]?.cantitate || 0) + 1, cart[n.productIdSugerat]?.unitateSel || 'BAX')}>
              + Adaugă
            </button>
          )}
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* Produse */}
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" placeholder="Caută produse..." style={{ flex: 1 }} value={search} onChange={e => setSearch(e.target.value)} />
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c === 'toate' ? 'Toate categoriile' : c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredProduse.map(product => {
              const inCart = cart[product.id]
              // Dacă firma are unitate atribuită și produsul o suportă → blocăm pe acea unitate
              const lockedUom = assignedUom && (product.product_uom || []).some(u => u.is_orderable && u.uom_code === assignedUom) ? assignedUom : null
              const currentUom = lockedUom || inCart?.unitateSel || getDefaultUom(product)
              // Bug 13: UoM la nivel de bax/palet (nu rolă ca default)
              // Bug 14: filtrăm palet incompatibil cu transportul auto-detectat
              const relevantUoms = lockedUom
                ? (product.product_uom || []).filter(u => u.uom_code === lockedUom)
                : getRelevantUoms(product, autoTransportType)
              const pretUom = getPretPerUom(product, currentUom)

              return (
                <div key={product.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <ProductImg src={product.imagine || product.image_url} name={product.name} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1, whiteSpace: 'normal', wordBreak: 'break-word' }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {product.brand} · {product.product_type}
                      {/* Bug 15: clientul NU vede stocul */}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, marginTop: 1 }}>
                      {lei(pretUom)} / {(relevantUoms.find(u => u.uom_code === currentUom)?.uom_name || currentUom).toLowerCase()}
                      {isEur && exRate && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>({eur(pretUom / exRate.applied_rate)})</span>}
                    </div>
                    {/* Mini UoM preview */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                      {relevantUoms.map(u => (
                        <span key={u.uom_code} style={{ fontSize: 10, padding: '1px 5px', background: u.uom_code === currentUom ? 'var(--blue-bg)' : 'var(--bg3)', color: u.uom_code === currentUom ? 'var(--blue-text)' : 'var(--text3)', borderRadius: 4, cursor: 'pointer' }}
                          onClick={() => setUom(product.id, u.uom_code)}>
                          {u.uom_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* UoM selector */}
                  {relevantUoms.length > 1 && (
                    <select value={currentUom} onChange={e => setUom(product.id, e.target.value)}
                      style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer' }}
                      onClick={e => e.stopPropagation()}>
                      {relevantUoms.map(u => (
                        <option key={u.uom_code} value={u.uom_code}>{u.uom_name} (×{u.coeficient})</option>
                      ))}
                    </select>
                  )}

                  {/* Qty */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setQty(product.id, (inCart?.cantitate || 0) - 1, currentUom)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input type="number" min="0" value={inCart?.cantitate || ''} placeholder="0"
                      onChange={e => setQty(product.id, parseInt(e.target.value) || 0, currentUom)}
                      style={{ width: 56, textAlign: 'center', fontSize: 13, padding: '4px 6px' }} />
                    <button onClick={() => setQty(product.id, (inCart?.cantitate || 0) + 1, currentUom)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>

                  {inCart?.cantitate > 0 && (
                    <button onClick={() => removeFromCart(product.id)} className="btn btn-danger btn-sm">✕</button>
                  )}
                </div>
              )
            })}
            {filteredProduse.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>Niciun produs găsit.</div>
            )}
          </div>
        </div>

        {/* Sidebar coș */}
        <div style={{ position: 'sticky', top: 16 }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Coș ({liniiCos.length} produse)</div>

            {/* Paletizare preferată client */}
            {firma?.paletizare_preferata && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '6px 12px', marginBottom: 8, fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📦</span>
                <span>Paletizare preferată: <strong>{firma.paletizare_preferata}</strong></span>
              </div>
            )}

            {/* Transport auto-detectat */}
            {liniiCos.length > 0 && (
              <div style={{ background: autoTransportType === 'Truck' ? 'var(--purple-bg)' : 'var(--blue-bg)', borderRadius: 8, padding: '7px 12px', marginBottom: 10, fontSize: 12, color: autoTransportType === 'Truck' ? 'var(--purple-text)' : 'var(--blue-text)' }}>
                🚚 Transport auto-detectat: <strong>{autoTransportType === 'Truck' ? 'TIR / Camion' : 'Duba (Van)'}</strong>
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>Calculat din cantitatea totală a comenzii</div>
              </div>
            )}

            {liniiCos.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Adaugă produse</div>
            ) : (
              <>
                {liniiCalculate.map(linie => {
                  const disc = discountLinii.filter(d => d.refLinieIdx === linie.idx)
                  const uomLabel = (linie.produs?.product_uom || []).find(u => u.uom_code === linie.unitateSel)?.uom_name || linie.unitateSel
                  return (
                    <div key={linie.productId} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, flex: 1, paddingRight: 8 }}>{linie.produs?.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{lei(linie.totalBrutLinie)}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {linie.cantitate} {uomLabel?.toLowerCase()} × {lei(linie.pretClient)}/rolă
                        <span style={{ marginLeft: 6, color: 'var(--text3)' }}>= {linie.cantRole} role</span>
                      </div>
                      {disc.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--green-text)', marginTop: 2 }}>
                          <span>{d.eticheta}</span><span>{lei(d.valoare)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {discountLinii.filter(d => d.refLinieIdx === -1).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--green-text)', marginBottom: 4 }}>
                    <span>{d.eticheta}</span><span>{lei(d.valoare)}</span>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>
                    <span>Net fără TVA</span><span>{lei(totalNet)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                    <span>TVA 21%</span><span>{lei(Math.round(totalNet * TVA * 100) / 100)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                    <span>Total cu TVA</span>
                    <span style={{ color: 'var(--blue)' }}>{fmtVal(totalCuTva)}</span>
                  </div>
                  {isEur && exRate && (
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text3)' }}>{lei(totalCuTva)}</div>
                  )}
                </div>
              </>
            )}
          </div>

          {liniiCos.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Detalii comandă</div>

              {/* Bug 16: selector locație livrare per comandă */}
              <div className="form-group">
                <label>Adresă livrare</label>
                <select className="w-full" value={deliveryLocationId} onChange={e => setDeliveryLocationId(e.target.value)}>
                  {deliveryLocations.map(dl => (
                    <option key={dl.id} value={dl.id}>{dl.name}</option>
                  ))}
                </select>
                {selectedDelivery?.adresa && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{selectedDelivery.adresa}</div>
                )}
              </div>

              <div className="form-group">
                <label>Data livrare dorită</label>
                <input type="date" className="w-full" value={dataLivrare} onChange={e => setDataLivrare(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>

              <div className="form-group">
                <label>Tip plată</label>
                <select className="w-full" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                  <option value="OP">Ordin de plată (OP)</option>
                  <option value="CRD">Card</option>
                  <option value="NUM">Numerar</option>
                </select>
              </div>

              <div className="form-group">
                <label>Observații</label>
                <textarea className="w-full" rows={2} value={observatii} onChange={e => setObservatii(e.target.value)} placeholder="Instrucțiuni speciale..." />
              </div>

              {/* Credit warning preview */}
              {creditWarning && !confirming && (
                <div style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--orange-text)' }}>
                  ⚠ {creditWarning.message}
                  {creditWarning.block && (
                    <div style={{ marginTop: 4, fontWeight: 600 }}>
                      La plasare, se va genera automat o proformă pentru diferența de {lei(creditWarning.orderTotal - (db.credit_limits?.find(c => c.firm_id === user.firmId)?.available_credit || 0))} și comanda va fi în așteptarea plății.
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={handleConfirm}>
                Plasează comanda →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal confirmare */}
      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 460, width: '100%', padding: '28px 32px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Confirmă comanda</h3>

            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              {[
                ['Produse', `${liniiCos.length} linii`],
                ['Transport', autoTransportType === 'Truck' ? 'TIR / Camion' : 'Duba (Van)'],
                ['Livrare la', selectedDelivery?.name || '—'],
                ['Net fără TVA', lei(totalNet)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text3)' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span>Total cu TVA</span>
                <span style={{ color: 'var(--blue)' }}>{fmtVal(totalCuTva)}</span>
              </div>
            </div>

            {creditWarning && (
              <div style={{ background: creditWarning.block ? 'var(--red-bg)' : 'var(--orange-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: creditWarning.block ? 'var(--red-text)' : 'var(--orange-text)' }}>
                ⚠ {creditWarning.message}
                {creditWarning.block && (
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    ℹ Comanda va intra în aprobare după achitarea proformei generate automat.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setConfirming(false) }}>Înapoi</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handlePlaceOrder}>
                {creditWarning?.block ? '✓ Plasează (cu proformă)' : '✓ Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
