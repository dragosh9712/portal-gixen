import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, eur, fmtDate } from '../utils'
import { calculeazaCos, getPromotiiNotificabile } from '../promoEngine.js'

const TVA = 0.21

function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

function ProductImg({ src, name }) {
  const [err, setErr] = useState(false)
  if (!src || err) return (
    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🧻</div>
  )
  return <img src={src} alt={name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} onError={() => setErr(true)} />
}

export default function AdminComandaNoua() {
  const { user } = useAuth()
  const { db, createOrder, getPretPentruClient, getExchangeRate, checkCreditLimit } = useStore()
  const navigate = useNavigate()

  const firms = (db.firms || []).filter(f => f.status === 'activ')
  const agents = db.agents || []
  const locations = db.locations || []
  const defaultLocation = locations.find(l => l.is_default_order)

  // Firma selectată
  const [selectedFirmId, setSelectedFirmId] = useState('')
  const firma = firms.find(f => f.id === selectedFirmId) || null
  const isEur = firma?.currency === 'EUR'
  const exRate = getExchangeRate('EUR')
  const agent = agents.find(a => a.id === firma?.agent_id)

  // Produse vizibile pentru firma selectată
  const produse = useMemo(() => {
    if (!firma) return []
    const vizProduse = firma.vizibilitate_produse || 'gixen_si_proprii'
    return (db.products || []).filter(p => {
      if (!p.activ) return false
      const isPrivatAl  = p.private_brand_firm_id === firma.id
      const isGixen     = !p.private_brand_firm_id
      const isAltClient = p.private_brand_firm_id && !isPrivatAl
      if (isAltClient) return false
      if (vizProduse === 'doar_proprii' && !isPrivatAl) return false
      if (vizProduse === 'gixen_only'   && !isGixen)   return false
      return true
    })
  }, [firma, db.products])

  const [cart, setCart] = useState({})
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('toate')
  const [dataLivrare, setDataLivrare] = useState('')
  const [observatii, setObservatii] = useState('')
  const [adresaLivrare, setAdresaLivrare] = useState('')
  const [transportType, setTransportType] = useState('Van')
  const [paymentType, setPaymentType] = useState('OP')
  const [locationId, setLocationId] = useState(defaultLocation?.id || '')
  const [noteAdmin, setNoteAdmin] = useState('')
  const [toast, setToast] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [creditWarning, setCreditWarning] = useState(null)

  // Când se schimbă firma, resetăm coșul și precompletăm câmpurile
  useEffect(() => {
    setCart({})
    setCreditWarning(null)
    if (firma) {
      setAdresaLivrare(firma.adresa_livrare || firma.adresa || '')
      setTransportType(firma.default_transport_type || 'Van')
    }
  }, [selectedFirmId])

  function getUomCoeficient(product, uomCode) {
    const uom = (product.product_uom || []).find(u => u.uom_code === uomCode)
    return uom?.coeficient || 1
  }

  // Unitatea de măsură atribuită clientului (paletizarea preferată)
  const assignedUom = firma?.paletizare_preferata || null

  function getFirstUom(product) {
    const uoms = (product.product_uom || []).filter(u => u.is_orderable).sort((a, b) => a.sort_order - b.sort_order)
    if (assignedUom && uoms.some(u => u.uom_code === assignedUom)) return assignedUom
    return uoms[0]?.uom_code || 'ROLA'
  }

  const liniiCos = useMemo(() => {
    if (!firma) return []
    return Object.entries(cart).map(([productId, { cantitate, unitateSel }]) => {
      const produs = produse.find(p => p.id === productId)
      if (!produs || !cantitate) return null
      const coef = getUomCoeficient(produs, unitateSel)
      const cantRole = cantitate * coef
      const pretClient = getPretPentruClient(productId, firma.id)
      return { productId, cantitate, unitateSel, cantRole, produs, totalBrutLinie: pretClient * cantRole, pretUnitar: pretClient }
    }).filter(Boolean)
  }, [cart, produse, firma])

  const { liniiCalculate, discountLinii, totalBrut, totalDiscount, totalNet } = useMemo(() => {
    if (!firma) return { liniiCalculate: [], discountLinii: [], totalBrut: 0, totalDiscount: 0, totalNet: 0 }
    return calculeazaCos(liniiCos, firma, db)
  }, [liniiCos, firma, db])

  const notificari = useMemo(() => {
    if (!firma) return []
    return getPromotiiNotificabile(liniiCos, firma, db)
  }, [liniiCos, firma, db])

  const totalCuTva = Math.round(totalNet * (1 + TVA) * 100) / 100

  function setQty(productId, cantitate, unitateSel) {
    setCart(prev => ({
      ...prev,
      [productId]: { cantitate: Math.max(0, cantitate), unitateSel: unitateSel || prev[productId]?.unitateSel || getFirstUom(produse.find(p => p.id === productId)) }
    }))
  }

  function setUom(productId, unitateSel) {
    setCart(prev => ({ ...prev, [productId]: { ...prev[productId], unitateSel } }))
  }

  function removeFromCart(productId) {
    setCart(prev => { const next = { ...prev }; delete next[productId]; return next })
  }

  function getPretPerUom(product, uomCode) {
    if (!firma) return 0
    const pretRola = getPretPentruClient(product.id, firma.id)
    const coef = getUomCoeficient(product, uomCode)
    return Math.round(pretRola * coef * 100) / 100
  }

  function fmtVal(val) {
    if (isEur && exRate) return `${eur(val / exRate.applied_rate)}`
    return lei(val)
  }

  async function handleConfirm() {
    if (!firma) return setToast({ msg: 'Selectează firma client!', type: 'error' })
    if (!liniiCos.length) return setToast({ msg: 'Coșul este gol!', type: 'error' })
    const creditCheck = await checkCreditLimit(firma.id, totalCuTva)
    if (creditCheck.warning) {
      setCreditWarning(creditCheck.message)
      if (creditCheck.block) { setToast({ msg: creditCheck.message, type: 'error' }); return }
    }
    setConfirming(true)
  }

  function handlePlaceOrder() {
    const lines = liniiCalculate.map(l => ({
      productId: l.productId, cantitate: l.cantitate, unitateSel: l.unitateSel,
      uom_id: (l.produs.product_uom || []).find(u => u.uom_code === l.unitateSel)?.uom_id,
      pretUnitar: Math.round(l.pretAfisatPerUm * 100) / 100,
      total: Math.round(l.totalBrutLinie * 100) / 100,
    }))

    const order = createOrder(
      firma.id, user.id, lines, dataLivrare, observatii, adresaLivrare, discountLinii,
      { transport_type: transportType, payment_type: paymentType, location_id: locationId || defaultLocation?.id }
    )

    // Adaugă nota admin dacă există
    if (noteAdmin && order) {
      // Nota se adaugă prin activityLog direct — deja în createOrder
    }

    setConfirming(false)
    setCreditWarning(null)
    setCart({})
    setToast({ msg: `✓ Comanda ${order?.nr || ''} plasată pentru ${firma.name}!`, type: 'success' })
    setTimeout(() => navigate('/admin/comenzi'), 2000)
  }

  const categories = ['toate', ...new Set(produse.map(p => p.categorie).filter(Boolean))]

  const filteredProduse = produse.filter(p => {
    const matchCat = catFilter === 'toate' || p.categorie === catFilter
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.cod || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <Layout title="Comandă nouă (Admin)" subtitle={firma ? `Comandă pentru: ${firma.name}` : 'Selectează firma client'}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Selector firmă — sticky top */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px', background: 'var(--bg)', border: '2px solid var(--blue)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>🏢 Firma client:</span>
            <select style={{ flex: 1, fontWeight: 600 }} value={selectedFirmId} onChange={e => setSelectedFirmId(e.target.value)}>
              <option value="">— Selectează firma —</option>
              {firms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.currency}) — {f.grupClient} — {agents.find(a => a.id === f.agent_id)?.name || '?'}
                </option>
              ))}
            </select>
          </div>

          {firma && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
              <span>Agent: <strong style={{ color: 'var(--text)' }}>{agent?.name || '—'}</strong></span>
              <span>Valută: <strong style={{ color: isEur ? '#b45309' : 'var(--text)' }}>{firma.currency}</strong></span>
              <span>Grup: <strong>{firma.grupClient}</strong></span>
              <span>Transport: <strong>{firma.default_transport_type}</strong></span>
              {isEur && exRate && <span>Curs: <strong>{exRate.applied_rate.toFixed(4)} RON/EUR</strong></span>}
            </div>
          )}
        </div>
      </div>

      {!firma ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 32px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Selectează firma client de mai sus</div>
          <div style={{ fontSize: 13 }}>Prețurile vor fi calculate automat conform agentului și discounturilor configurate.</div>
        </div>
      ) : (
        <>
          {/* Notificări promoții */}
          {notificari.map((n, i) => (
            <div key={i} style={{ background: 'var(--orange-bg)', border: '1px solid rgba(234,88,12,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: 'var(--orange-text)' }}>
              💡 {n.mesaj}
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
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
                  const allOrderable = (product.product_uom || []).filter(u => u.is_orderable).sort((a, b) => a.sort_order - b.sort_order)
                  // Blocăm pe unitatea atribuită clientului dacă produsul o suportă
                  const lockedUom = assignedUom && allOrderable.some(u => u.uom_code === assignedUom) ? assignedUom : null
                  const currentUom = lockedUom || inCart?.unitateSel || getFirstUom(product)
                  const pretUom = getPretPerUom(product, currentUom)
                  const uoms = lockedUom ? allOrderable.filter(u => u.uom_code === lockedUom) : allOrderable

                  return (
                    <div key={product.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ProductImg src={product.imagine} name={product.name} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1 }}>{product.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {product.brand} · {product.cod}
                          {product.stoc > 0
                            ? <span style={{ color: 'var(--green-text)', marginLeft: 6 }}>Stoc: {product.stoc}</span>
                            : <span style={{ color: 'var(--red-text)', marginLeft: 6 }}>Stoc 0</span>}
                        </div>
                      </div>

                      {/* Preț per UoM curentă */}
                      <div style={{ textAlign: 'right', minWidth: 90 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>{lei(pretUom)}</div>
                        {isEur && exRate && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{eur(pretUom / exRate.applied_rate)}</div>}
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>/{currentUom.toLowerCase()}</div>
                      </div>

                      {/* UoM selector */}
                      {uoms.length > 1 && (
                        <select value={currentUom} onChange={e => setUom(product.id, e.target.value)}
                          style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer' }}
                          onClick={e => e.stopPropagation()}>
                          {uoms.map(u => <option key={u.uom_code} value={u.uom_code}>{u.uom_name}</option>)}
                        </select>
                      )}

                      {/* Qty */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => setQty(product.id, (inCart?.cantitate || 0) - 1, currentUom)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>−</button>
                        <input type="number" min="0" value={inCart?.cantitate || ''} placeholder="0"
                          onChange={e => setQty(product.id, parseInt(e.target.value) || 0, currentUom)}
                          style={{ width: 54, textAlign: 'center', fontSize: 13, padding: '3px 6px' }} />
                        <button onClick={() => setQty(product.id, (inCart?.cantitate || 0) + 1, currentUom)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+</button>
                      </div>

                      {inCart?.cantitate > 0 && (
                        <button onClick={() => removeFromCart(product.id)} className="btn btn-danger btn-sm">✕</button>
                      )}
                    </div>
                  )
                })}

                {filteredProduse.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
                    Niciun produs disponibil pentru această firmă.
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar — coș + detalii */}
            <div style={{ position: 'sticky', top: 16 }}>

              {/* Coș */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 12 }}>Coș ({liniiCos.length} produse)</div>

                {liniiCos.length === 0 ? (
                  <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Adaugă produse</div>
                ) : (
                  <>
                    {liniiCalculate.map(linie => {
                      const disc = discountLinii.filter(d => d.refLinieIdx === linie.idx)
                      return (
                        <div key={linie.productId} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{linie.produs?.name}</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{lei(linie.totalBrutLinie)}</div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {linie.cantitate} {linie.unitateSel?.toLowerCase()} × {lei(linie.pretClient)}
                          </div>
                          {disc.map((d, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--green-text)', marginTop: 1 }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>
                        <span>TVA 21%</span><span>{lei(Math.round(totalNet * TVA * 100) / 100)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, marginTop: 6 }}>
                        <span>Total cu TVA</span>
                        <span style={{ color: 'var(--blue)' }}>
                          {isEur && exRate ? eur(totalCuTva / exRate.applied_rate) : lei(totalCuTva)}
                        </span>
                      </div>
                      {isEur && exRate && (
                        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text3)' }}>{lei(totalCuTva)}</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Detalii comandă */}
              {liniiCos.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 12 }}>Detalii comandă</div>

                  <div className="form-group">
                    <label>Gestiune comandă</label>
                    <select className="w-full" value={locationId} onChange={e => setLocationId(e.target.value)}>
                      {(db.locations || []).map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}{l.is_default_order ? ' ★ DEFAULT' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Data livrare</label>
                    <input type="date" className="w-full" value={dataLivrare} onChange={e => setDataLivrare(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>

                  <div className="form-group">
                    <label>Tip transport</label>
                    <select className="w-full" value={transportType} onChange={e => setTransportType(e.target.value)}>
                      <option value="Van">Duba (Van)</option>
                      <option value="Truck">TIR (Camion)</option>
                    </select>
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
                    <label>Adresă livrare</label>
                    <textarea className="w-full" rows={2} value={adresaLivrare} onChange={e => setAdresaLivrare(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Observații client</label>
                    <textarea className="w-full" rows={2} value={observatii} onChange={e => setObservatii(e.target.value)} placeholder="Instrucțiuni pentru client..." />
                  </div>

                  <div className="form-group">
                    <label style={{ color: 'var(--orange-text)' }}>📝 Notă internă admin</label>
                    <textarea className="w-full" rows={2} value={noteAdmin} onChange={e => setNoteAdmin(e.target.value)} placeholder="Notă vizibilă doar pentru admin..." />
                  </div>

                  {creditWarning && (
                    <div style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--orange-text)' }}>
                      ⚠ {creditWarning}
                    </div>
                  )}

                  <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={handleConfirm}>
                    Plasează comanda pentru {firma.name} →
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal confirmare */}
      {confirming && firma && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 460, width: '100%', padding: '28px 32px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Confirmă comanda</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Comandă plasată în numele: <strong>{firma.name}</strong></p>

            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              {[
                ['Produse', `${liniiCos.length} linii`],
                ['Net fără TVA', lei(totalNet)],
                ['TVA 21%', lei(Math.round(totalNet * TVA * 100) / 100)],
                ['Gestiune', (db.locations || []).find(l => l.id === locationId)?.name || '—'],
                ['Transport', transportType === 'Van' ? 'Duba' : 'TIR'],
                ['Plată', paymentType],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text3)' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span>TOTAL CU TVA</span>
                <span style={{ color: 'var(--blue)' }}>{isEur && exRate ? eur(totalCuTva / exRate.applied_rate) : lei(totalCuTva)}</span>
              </div>
              {isEur && exRate && (
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text3)' }}>{lei(totalCuTva)}</div>
              )}
            </div>

            {creditWarning && (
              <div style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: 'var(--orange-text)' }}>
                ⚠ {creditWarning}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setConfirming(false); setCreditWarning(null) }}>
                Înapoi
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handlePlaceOrder}>
                ✓ Confirmă și plasează
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
