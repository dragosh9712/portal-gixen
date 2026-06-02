import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei } from '../utils'
import { calculeazaCos, toRole, pretPerUnitate, getTierPret, getPromotiiNotificabile } from '../promoEngine.js'

const TVA = 0.21

function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

function ProductImg({ src, name }) {
  const [err, setErr] = useState(false)
  if (!src || err) return (
    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🧻</div>
  )
  return <img src={src} alt={name} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} onError={() => setErr(true)} />
}

function UomSelector({ product, value, onChange }) {
  const opts = []
  if (product.unitateTertiara) opts.push(product.unitateTertiara)
  if (product.unitateSecundara) opts.push(product.unitateSecundara)
  if (product.unitatePrimara) opts.push(product.unitatePrimara)
  if (!opts.length) return <span style={{ fontSize: 12, color: 'var(--text3)' }}>{product.unitate}</span>
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer' }}
      onClick={e => e.stopPropagation()}>
      {opts.map(u => <option key={u} value={u}>{u}</option>)}
    </select>
  )
}

export default function ComandaNoua() {
  const { user } = useAuth()
  const { db, createOrder } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const firma = db.firms.find(f => f.id === user.firmId)
  const marciPermise = firma?.marciPermise || []

  // Produse vizibile pentru acest client
  const produse = db.products.filter(p =>
    p.activ && (marciPermise.length === 0 || marciPermise.includes(p.marca))
  )

  const [cart, setCart] = useState(() => {
    if (!location.state?.reorder) return {}
    const initial = {}
    location.state.reorder.lines.forEach(l => {
      const prod = db.products.find(p => p.id === l.productId)
      initial[l.productId] = {
        cantitate: l.cantitate,
        unitateSel: l.unitateSel || prod?.unitateTertiara || prod?.unitate || 'rolă'
      }
    })
    return initial
  })
  const [dataLivrare, setDataLivrare] = useState('')
  const [observatii, setObservatii] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [confirming, setConfirming] = useState(false)

  function setQty(productId, val, unitateSel) {
    const qty = Math.max(0, parseInt(val) || 0)
    setCart(prev => {
      const next = { ...prev }
      if (qty === 0) {
        delete next[productId]
      } else {
        next[productId] = { cantitate: qty, unitateSel: unitateSel || next[productId]?.unitateSel || 'rolă' }
      }
      return next
    })
  }

  function setUom(productId, uom) {
    setCart(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] || { cantitate: 0 }), unitateSel: uom }
    }))
  }

  // Construiește liniile pentru motor
  const liniiMotor = useMemo(() => {
    return Object.entries(cart).map(([pid, { cantitate, unitateSel }]) => {
      const produs = db.products.find(p => p.id === pid)
      if (!produs || cantitate === 0) return null
      const cantRole = toRole(cantitate, unitateSel, produs)
      const tierPret = getTierPret(produs, cantRole)
      return {
        productId: pid,
        cantitate,
        cantRole,
        unitateSel,
        pretBazaPerRola: produs.pretBaza,
        totalBrutLinie: tierPret * cantRole,
        produs,
      }
    }).filter(Boolean)
  }, [cart, db])

  const { liniiCalculate, discountLinii, totalBrut, totalDiscount, totalNet } = useMemo(() =>
    calculeazaCos(liniiMotor, db.firms.find(f => f.id === user.firmId), db),
    [liniiMotor, db, user.firmId]
  )

  const tvaVal = Math.round(totalNet * TVA * 100) / 100
  const totalCuTva = Math.round((totalNet + tvaVal) * 100) / 100

  // Notificări promoții
  const notificari = useMemo(() =>
    getPromotiiNotificabile(liniiMotor, db.firms.find(f => f.id === user.firmId), db),
    [liniiMotor, db, user.firmId]
  )

  const filtered = produse.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cod.toLowerCase().includes(search.toLowerCase())
  )

  function handlePlaseaza() {
    const lines = liniiCalculate.map(l => ({
      productId: l.productId,
      cantitate: l.cantRole, // stocăm în role
      unitateSel: l.unitateSel,
      pretUnitar: l.tierPret,
      total: l.totalBrutLinie,
    }))
    createOrder(user.firmId, user.id, lines, dataLivrare, observatii, firma?.adresa || '', discountLinii)
    setToast({ msg: 'Comandă plasată cu succes!', type: 'success' })
    setTimeout(() => navigate('/comenzile-mele'), 1800)
  }

  // Discount-uri pe linie pentru afișare
  const discByLinie = {}
  discountLinii.forEach(d => {
    if (d.refLinieIdx >= 0) {
      if (!discByLinie[d.refLinieIdx]) discByLinie[d.refLinieIdx] = []
      discByLinie[d.refLinieIdx].push(d)
    }
  })
  const discTotal = discountLinii.filter(d => d.refLinieIdx === -1)

  return (
    <Layout title="Comandă nouă">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Notificări promoții */}
      {notificari.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {notificari.map((n, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
              border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13
            }}>
              <span style={{ fontSize: 18 }}>🏷️</span>
              <span style={{ flex: 1, color: '#92400e' }}>{n.mesaj}</span>
              {n.productIdSugerat && (
                <button className="btn btn-sm" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}
                  onClick={() => {
                    const prod = db.products.find(p => p.id === n.productIdSugerat)
                    if (prod) setQty(prod.id, 1, prod.unitateTertiara || prod.unitate)
                  }}>
                  + Adaugă în coș
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="order-layout">
        {/* Catalog */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <input type="text" className="w-full" placeholder="Caută produs..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.map((product, idx) => {
              const entry = cart[product.id]
              const qty = entry?.cantitate || 0
              const unitateSel = entry?.unitateSel || product.unitateTertiara || product.unitate || 'rolă'
              const cantRole = toRole(qty, unitateSel, product)
              const tierPret = getTierPret(product, Math.max(cantRole, 1))
              const pretUm = pretPerUnitate(tierPret, unitateSel, product)
              const totalLinie = tierPret * cantRole
              const inCart = qty > 0

              return (
                <div key={product.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr auto auto auto',
                  alignItems: 'center', gap: 12, padding: '11px 16px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--border2)' : 'none',
                  background: inCart ? 'rgba(37,99,235,0.025)' : 'transparent',
                }}>
                  <ProductImg src={product.imagine} name={product.name} />

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{product.cod} · {product.marca}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                      {product.tag && (
                        <span style={{ fontSize: 10, background: 'var(--blue-bg)', color: 'var(--blue-text)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                          {product.tag}
                        </span>
                      )}
                      {product.conversii && (
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                          1 palet = {product.conversii.baxuriPerPalet} bax = {product.conversii.rolePerPalet} role
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preț per unitate selectată */}
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>
                      {lei(pretUm)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>/{unitateSel}</div>
                    {tierPret < product.pretBaza && (
                      <div style={{ fontSize: 10, color: 'var(--green-text)' }}>
                        tier activ ↓
                      </div>
                    )}
                  </div>

                  {/* UoM + Qty */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UomSelector product={product} value={unitateSel}
                      onChange={uom => setUom(product.id, uom)} />
                    <button onClick={() => setQty(product.id, qty - 1, unitateSel)}
                      style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 16, cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input type="number" className="qty-input" min={0} value={qty || ''}
                      placeholder="0" onChange={e => setQty(product.id, e.target.value, unitateSel)}
                      style={{ width: 60, textAlign: 'center' }} />
                    <button onClick={() => setQty(product.id, qty + 1, unitateSel)}
                      style={{ width: 28, height: 28, borderRadius: 6, background: inCart ? 'var(--blue)' : 'var(--bg2)', border: '1px solid var(--border)', fontSize: 16, cursor: 'pointer', color: inCart ? '#fff' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>

                  {/* Total linie */}
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    {inCart
                      ? <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{lei(totalLinie)}</span>
                      : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">Niciun produs găsit</div>
              </div>
            )}
          </div>
        </div>

        {/* Sumar */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Sumar comandă</div>

            {liniiCalculate.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                <div style={{ fontSize: 13 }}>Niciun produs adăugat</div>
              </div>
            ) : (
              <>
                {liniiCalculate.map((l, i) => {
                  const discLinii = discByLinie[i] || []
                  const totalNetLinie = l.totalBrutLinie + discLinii.reduce((s, d) => s + d.valoare, 0)
                  return (
                    <div key={l.productId} style={{ marginBottom: 8 }}>
                      {/* Linie produs */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <ProductImg src={l.produs.imagine} name={l.produs.name} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.produs.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {l.cantitate} {l.unitateSel} ({l.cantRole} role) × {lei(pretPerUnitate(l.tierPret, l.unitateSel, l.produs))}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {lei(l.totalBrutLinie)}
                        </div>
                      </div>
                      {/* Linii discount sub produs */}
                      {discLinii.map((d, di) => (
                        <div key={di} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          paddingLeft: 54, marginTop: 3
                        }}>
                          <div style={{ flex: 1, fontSize: 11, color: 'var(--green-text)', fontStyle: 'italic' }}>
                            └ {d.eticheta}{d.procent ? ` (−${d.procent}%)` : ''}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--green-text)' }}>
                            {lei(d.valoare)}
                          </div>
                        </div>
                      ))}
                      {discLinii.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 54, marginTop: 2 }}>
                          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Net linia {i + 1}</div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--blue)' }}>{lei(totalNetLinie)}</div>
                        </div>
                      )}
                      {i < liniiCalculate.length - 1 && <div className="divider" style={{ margin: '6px 0' }} />}
                    </div>
                  )
                })}

                {/* Discounturi pe total */}
                {discTotal.length > 0 && (
                  <>
                    <div className="divider" />
                    {discTotal.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--green-text)', fontWeight: 500, marginBottom: 4 }}>
                        <span>└ {d.eticheta}{d.procent ? ` (−${d.procent}%)` : ''}</span>
                        <span>{lei(d.valoare)}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="divider" />
                <div style={{ display: 'grid', gap: 5, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span>Subtotal brut</span><span>{lei(totalBrut)}</span>
                  </div>
                  {totalDiscount < 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green-text)', fontWeight: 600 }}>
                      <span>Total reduceri</span><span>{lei(totalDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span>Total net (fără TVA)</span><span style={{ fontWeight: 600 }}>{lei(totalNet)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span>TVA {Math.round(TVA * 100)}%</span><span>{lei(tvaVal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                    <span>Total cu TVA</span><span style={{ color: 'var(--blue)' }}>{lei(totalCuTva)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="divider" />
            <div className="form-group">
              <label>Dată livrare dorită</label>
              <input type="date" className="w-full" value={dataLivrare}
                onChange={e => setDataLivrare(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label>Observații</label>
              <textarea className="w-full" rows={2} value={observatii}
                onChange={e => setObservatii(e.target.value)}
                placeholder="ex: livrare dimineața..." />
            </div>

            <button className="btn btn-primary w-full"
              style={{ justifyContent: 'center', padding: 10 }}
              disabled={liniiCalculate.length === 0}
              onClick={() => setConfirming(true)}>
              Plasează comanda →
            </button>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              Plată prin ordin de plată (OP)
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 380 }}>
            <div className="modal-hdr">
              <h3>Confirmi comanda?</h3>
              <button className="modal-close" onClick={() => setConfirming(false)}>×</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              {liniiCalculate.length} produs(e) · Net fără TVA: <b>{lei(totalNet)}</b> · Total cu TVA: <b>{lei(totalCuTva)}</b>
            </div>
            {totalDiscount < 0 && (
              <div style={{ background: 'var(--green-bg)', color: 'var(--green-text)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 12, fontWeight: 500 }}>
                ✓ Economii aplicate: {lei(totalDiscount)}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirming(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={() => { setConfirming(false); handlePlaseaza() }}>
                Da, plasează
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
