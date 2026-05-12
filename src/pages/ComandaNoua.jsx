import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, calcLinePrice } from '../utils'

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

function ProductImg({ src, name }) {
  const [err, setErr] = useState(false)
  if (!src || err) return (
    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🧻</div>
  )
  return <img src={src} alt={name} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} onError={() => setErr(true)} />
}

export default function ComandaNoua() {
  const { user } = useAuth()
  const { db, createOrder } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [cart, setCart] = useState({})
  const [dataLivrare, setDataLivrare] = useState('')
  const [observatii, setObservatii] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const products = db.products.filter(p => p.activ)
  const firmId = user.firmId

  useEffect(() => {
    if (location.state?.reorder) {
      const newCart = {}
      location.state.reorder.lines.forEach(l => { newCart[l.productId] = l.cantitate })
      setCart(newCart)
    }
  }, [location.state])

  function setQty(productId, val) {
    const qty = Math.max(0, parseInt(val) || 0)
    setCart(prev => {
      const next = { ...prev }
      if (qty === 0) delete next[productId]
      else next[productId] = qty
      return next
    })
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cod.toLowerCase().includes(search.toLowerCase())
  )

  const cartLines = Object.entries(cart).map(([pid, qty]) => {
    const product = db.products.find(p => p.id === pid)
    if (!product) return null
    const pricing = calcLinePrice(product, qty, firmId, db)
    return { product, qty, ...pricing }
  }).filter(Boolean)

  const subtotal = cartLines.reduce((s, l) => s + l.pretBazaTier * l.qty, 0)
  const totalFinal = cartLines.reduce((s, l) => s + l.total, 0)
  const totalDiscount = subtotal - totalFinal

  function handlePlaseaza() {
    if (cartLines.length === 0) return
    const lines = cartLines.map(l => ({
      productId: l.product.id, cantitate: l.qty,
      pretUnitar: l.pretUnitar, discount: l.discTotal, total: l.total
    }))
    createOrder(firmId, user.id, lines, dataLivrare, observatii)
    setToast({ msg: 'Comandă plasată cu succes!', type: 'success' })
    setTimeout(() => navigate('/comenzile-mele'), 1800)
  }

  return (
    <Layout title="Comandă nouă">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="order-layout">
        {/* Left: product list */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <input type="text" className="w-full" placeholder="Caută produs după nume sau cod..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.map((product, idx) => {
              const qty = cart[product.id] || 0
              const pricing = calcLinePrice(product, Math.max(qty, 1), firmId, db)

              return (
                <div key={product.id} style={{
                  display: 'grid', gridTemplateColumns: '48px 1fr auto auto auto',
                  alignItems: 'center', gap: 14, padding: '12px 16px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--border2)' : 'none',
                  background: qty > 0 ? 'rgba(37,99,235,0.02)' : 'transparent',
                  transition: 'background 0.15s'
                }}>
                  {/* Image */}
                  <ProductImg src={product.imagine} name={product.name} />

                  {/* Name + badges */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{product.cod}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {pricing.promoLabel && <span className="promo-badge">🏷 -{pricing.discPromo}%</span>}
                      {pricing.discClient > 0 && <span className="client-disc">-{pricing.discClient}% cont</span>}
                      {product.stoc > 0 && product.stoc < 500 && (
                        <span style={{ fontSize: 10, color: 'var(--orange-text)', fontWeight: 500 }}>⚠ stoc limitat</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{lei(pricing.pretUnitar)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>/{product.unitate}</div>
                    {pricing.pretUnitar < product.pretBaza && (
                      <div style={{ fontSize: 10, color: 'var(--green-text)', textDecoration: 'line-through var(--text3)' }}>
                        {lei(product.pretBaza)}
                      </div>
                    )}
                  </div>

                  {/* Qty input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => setQty(product.id, (qty || 0) - 1)}
                      style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>−</button>
                    <input type="number" className="qty-input" min={0} value={qty || ''}
                      placeholder="0" onChange={e => setQty(product.id, e.target.value)}
                      style={{ width: 56, textAlign: 'center' }} />
                    <button
                      onClick={() => setQty(product.id, (qty || 0) + 1)}
                      style={{ width: 28, height: 28, borderRadius: 6, background: qty > 0 ? 'var(--blue)' : 'var(--bg2)', border: '1px solid var(--border)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: qty > 0 ? '#fff' : 'var(--text2)' }}>+</button>
                  </div>

                  {/* Line total */}
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    {qty > 0 ? (
                      <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{lei(pricing.total)}</span>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: summary */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Sumar comandă</div>

            {cartLines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                Niciun produs adăugat
              </div>
            ) : (
              <>
                {cartLines.map(l => (
                  <div key={l.product.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                    <ProductImg src={l.product.imagine} name={l.product.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.product.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.qty} × {lei(l.pretUnitar)}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{lei(l.total)}</div>
                  </div>
                ))}

                <div className="divider" />
                <div className="summary-box">
                  <div className="summary-line">
                    <span>Subtotal</span><span>{lei(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="summary-line summary-discount">
                      <span>Reduceri aplicate</span><span>-{lei(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="summary-line total">
                    <span>Total</span><span>{lei(totalFinal)}</span>
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
              <textarea className="w-full" rows={3} placeholder="ex: livrare dimineața..."
                value={observatii} onChange={e => setObservatii(e.target.value)} />
            </div>

            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '10px' }}
              disabled={cartLines.length === 0} onClick={() => setConfirming(true)}>
              Plasează comanda →
            </button>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
              Plată prin ordin de plată (OP)
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-hdr">
              <h3>Confirmi comanda?</h3>
              <button className="modal-close" onClick={() => setConfirming(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              {cartLines.length} produs(e), total <b>{lei(totalFinal)}</b>. Comanda intră în fluxul de aprobare.
            </p>
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
