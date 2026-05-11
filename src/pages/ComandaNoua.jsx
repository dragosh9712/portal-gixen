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

export default function ComandaNoua() {
  const { user } = useAuth()
  const { db, createOrder } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [cart, setCart] = useState({}) // { productId: qty }
  const [dataLivrare, setDataLivrare] = useState('')
  const [observatii, setObservatii] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const products = db.products.filter(p => p.activ)
  const firmId = user.firmId

  // Handle reorder
  useEffect(() => {
    if (location.state?.reorder) {
      const reorder = location.state.reorder
      const newCart = {}
      reorder.lines.forEach(l => { newCart[l.productId] = l.cantitate })
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

  // Compute cart summary
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
      productId: l.product.id,
      cantitate: l.qty,
      pretUnitar: l.pretUnitar,
      discount: l.discTotal,
      total: l.total
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
          <div className="card" style={{ marginBottom: 16 }}>
            <input
              type="text"
              className="w-full"
              placeholder="Caută produs după nume sau cod..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produs</th>
                    <th>Preț bază</th>
                    <th>Prețul tău</th>
                    <th>Reducere</th>
                    <th>Cantitate</th>
                    <th className="text-right">Total linie</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(product => {
                    const qty = cart[product.id] || 0
                    const pricing = calcLinePrice(product, Math.max(qty, 1), firmId, db)
                    const pricingForQty = qty > 0 ? calcLinePrice(product, qty, firmId, db) : pricing

                    return (
                      <tr key={product.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{product.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{product.cod} · {product.unitate}</div>
                          {pricingForQty.promoLabel && (
                            <span className="promo-badge">🏷 {pricingForQty.promoLabel}</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text2)' }}>{lei(product.pretBaza)}</td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{lei(pricingForQty.pretUnitar)}</span>
                          {pricingForQty.discPromo > 0 && (
                            <span className="promo-badge" style={{ display: 'block', marginTop: 2 }}>-{pricingForQty.discPromo}% promo</span>
                          )}
                          {pricingForQty.discClient > 0 && (
                            <span className="client-disc" style={{ display: 'block', marginTop: 2 }}>-{pricingForQty.discClient}% cont</span>
                          )}
                        </td>
                        <td>
                          {pricingForQty.discGlobal > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>-{pricingForQty.discGlobal}% global</span>
                          )}
                          {pricingForQty.discTotal === 0 && pricingForQty.discGlobal === 0 && (
                            <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="qty-input"
                            min={0}
                            value={qty || ''}
                            placeholder="0"
                            onChange={e => setQty(product.id, e.target.value)}
                          />
                        </td>
                        <td className="text-right">
                          {qty > 0 ? (
                            <span style={{ fontWeight: 500 }}>{lei(pricingForQty.total)}</span>
                          ) : (
                            <span style={{ color: 'var(--text3)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Tier info */}
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text2)' }}>
              💡 <b>Tier pricing activ:</b> prețul pe unitate scade automat în funcție de cantitate. Adaugă cantitate ca să vezi modificarea în timp real.
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Sumar comandă</div>

            {cartLines.length === 0 ? (
              <div className="text-muted" style={{ marginBottom: 14 }}>Niciun produs adăugat</div>
            ) : (
              <>
                {cartLines.map(l => (
                  <div key={l.product.id} style={{ marginBottom: 8 }}>
                    <div className="flex-between">
                      <span style={{ fontSize: 12, maxWidth: 160 }}>{l.product.name.split(' ').slice(0, 4).join(' ')}</span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{lei(l.total)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {l.qty} × {lei(l.pretUnitar)}
                    </div>
                  </div>
                ))}
                <div className="divider" />
                <div className="summary-box">
                  <div className="summary-line">
                    <span>Subtotal</span><span>{lei(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="summary-line summary-discount">
                      <span>Reduceri aplicate</span>
                      <span>-{lei(totalDiscount)}</span>
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
              <input
                type="date"
                className="w-full"
                value={dataLivrare}
                onChange={e => setDataLivrare(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>Observații</label>
              <textarea
                className="w-full"
                rows={3}
                placeholder="ex: livrare dimineața, intrare B..."
                value={observatii}
                onChange={e => setObservatii(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary w-full"
              disabled={cartLines.length === 0}
              onClick={() => setConfirming(true)}
            >
              Plasează comanda →
            </button>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
              Plata prin ordin de plată (OP)
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirming && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-hdr">
              <h3>Confirmi comanda?</h3>
              <button className="modal-close" onClick={() => setConfirming(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              {cartLines.length} produs(e), total <b>{lei(totalFinal)}</b>. Comanda va intra în fluxul de aprobare.
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
