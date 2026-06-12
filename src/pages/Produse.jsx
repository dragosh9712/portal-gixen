import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, cuTva } from '../utils'
import { esteActiva } from '../promoEngine.js'

function ProductImage({ src, alt, style }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div style={{ width: style?.maxWidth || 64, height: style?.maxHeight || 64, borderRadius: 12, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
        🧻
      </div>
    )
  }
  return <img src={src} alt={alt} style={style} onError={() => setErr(true)} />
}

function calcPaletPrice(product, uomCode) {
  const uom = (product.product_uom || []).find(u => u.uom_code === uomCode)
  const coef = uom?.coeficient || 1
  const basePrice = parseFloat(product.pretBaza || product.active_base_price || 0)
  return { price: Math.round(basePrice * coef * 100) / 100, coef, uomName: uom?.uom_name || uomCode }
}

export default function Produse() {
  const { user } = useAuth()
  const { db, toggleFavorite, isFavorite } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('toate')
  const [selected, setSelected] = useState(null)

  const customerId = user.customerId || user.customer_id
  const firm = (db.firms || []).find(f => f.id === customerId) || {}
  const paletizare = firm.paletizare_preferata || 'BAX'
  const globalDiscount = parseFloat(firm.global_discount || 0) / 100

  const products = (db.products || []).filter(p => p.activ)
  const categories = ['toate', ...new Set(products.map(p => p.categorie).filter(Boolean))]

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'toate' || p.categorie === catFilter
    const matchSearch = !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.cod || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <Layout title="Produse & prețuri" actions={
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/comanda-noua')}>
        + Comandă nouă
      </button>
    }>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8">
          <input type="text" placeholder="Caută produs..." style={{ flex: 1 }}
            value={search} onChange={e => setSearch(e.target.value)} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === 'toate' ? 'Toate categoriile' : c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {filtered.map(p => {
          const { price, uomName } = calcPaletPrice(p, paletizare)
          const discountedPrice = globalDiscount > 0 ? Math.round(price * (1 - globalDiscount) * 100) / 100 : price
          return (
            <div key={p.id} className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
              onClick={() => setSelected(p)}>
              <div style={{ background: 'var(--bg)', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <button className="fav-btn" style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}
                  onClick={e => { e.stopPropagation(); toggleFavorite(user.id, p.id) }}
                  title={isFavorite(user.id, p.id) ? 'Șterge din favorite' : 'Adaugă la favorite'}>
                  {isFavorite(user.id, p.id) ? '❤️' : '🤍'}
                </button>
                <ProductImage src={p.imagine} alt={p.name}
                  style={{ maxHeight: 145, maxWidth: '90%', objectFit: 'contain' }} />
                {p.tag && (
                  <span style={{
                    position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 20,
                    background: p.tag === 'Best Seller' ? 'var(--orange-bg)' : p.tag === 'NEW' ? 'var(--blue-bg)' : 'var(--green-bg)',
                    color: p.tag === 'Best Seller' ? 'var(--orange-text)' : p.tag === 'NEW' ? 'var(--blue-text)' : 'var(--green-text)',
                  }}>{p.tag}</span>
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{p.cod}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    {discountedPrice > 0 ? (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>
                          {lei(discountedPrice)}
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>/{uomName}</span>
                        </div>
                        {globalDiscount > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--green-text)' }}>
                            discount {Math.round(globalDiscount * 100)}% aplicat
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Preț la cerere</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: 180 }}>
                <ProductImage src={selected.imagine} alt={selected.name}
                  style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{selected.cod} · {selected.categorie}</div>
                {selected.brand && <div style={{ fontSize: 12, marginBottom: 4 }}>Brand: <strong>{selected.brand}</strong></div>}
              </div>
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>Prețul tău</div>
            {(() => {
              const { price, coef, uomName } = calcPaletPrice(selected, paletizare)
              const discP = globalDiscount > 0 ? Math.round(price * (1 - globalDiscount) * 100) / 100 : price
              const pretRola = parseFloat(selected.pretBaza || selected.active_base_price || 0)
              return (
                <>
                  {pretRola > 0 && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Preț / rolă fără TVA</div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{lei(pretRola)}</div>
                      </div>
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Preț / rolă cu TVA</div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{lei(cuTva(pretRola))}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{uomName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{coef} role</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {discP > 0 ? (
                        <>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{lei(discP)}</div>
                          {globalDiscount > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--green-text)' }}>
                              discount {Math.round(globalDiscount * 100)}% aplicat
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Preț la cerere</div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}

            {(() => {
              const promotii = (db.promotionRules || []).filter(rule => {
                if (!esteActiva(rule, firm?.id)) return false
                const conditii = rule.conditii || []
                const areConditieProdusConcret = conditii.some(c => c.tip === 'produs_in_cos')
                if (!areConditieProdusConcret) return true
                return conditii.some(c => c.tip === 'produs_in_cos' && c.productId === selected.id)
              })
              if (!promotii.length) return null
              return (
                <div style={{ marginTop: 12 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>Promoții active</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {promotii.map(rule => {
                      const act = rule.actiune || {}
                      const tipBadge = act.tip === 'procent' ? '%' : act.tip === 'valoric' ? 'RON' : act.tip === 'produs_gratuit' ? '🎁' : '★'
                      return (
                        <div key={rule.id} style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: 'var(--orange-text)' }}>{rule.name || rule.tip || 'Promoție'}</span>
                            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: 'var(--orange-text)', color: '#fff' }}>{tipBadge}</span>
                          </div>
                          {rule.description && <div style={{ color: 'var(--text2)', fontSize: 12 }}>{rule.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {(() => {
              const specs = selected.specs_json ? (typeof selected.specs_json === 'string' ? JSON.parse(selected.specs_json) : selected.specs_json) : null
              if (!specs?.length && !selected.datasheet_url) return null
              return (
                <div style={{ marginTop: 12 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>Specificații tehnice</div>
                  {specs?.length > 0 && (
                    <table style={{ marginBottom: 10 }}>
                      <tbody>
                        {specs.map((s, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text3)', fontSize: 12, width: '40%' }}>{s.key}</td>
                            <td style={{ fontWeight: 500, fontSize: 13 }}>{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {selected.datasheet_url && (
                    <button className="btn btn-secondary btn-sm" onClick={() => window.open(selected.datasheet_url, '_blank')}>
                      📥 Descarcă fișa tehnică
                    </button>
                  )}
                </div>
              )
            })()}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Închide</button>
              <button className="btn btn-primary" onClick={() => { setSelected(null); navigate('/comanda-noua') }}>
                + Adaugă în comandă
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
