import { useState, useEffect } from 'react'
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
  const { db, toggleFavorite, isFavorite, loadFavoritesForUser } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('toate')
  const [selected, setSelected] = useState(null)
  const [zoomImg, setZoomImg] = useState(null)

  useEffect(() => { if (user?.id) loadFavoritesForUser(user.id) }, [user?.id]) // eslint-disable-line

  const customerId = user.customerId || user.customer_id
  const firm = (db.firms || []).find(f => f.id === customerId) || {}
  const globalDiscount = parseFloat(firm.global_discount || 0) / 100
  const isEur = firm.currency === 'EUR'
  const exRate = parseFloat(db.exchange?.applied_rate || db.exchange?.rate || 5)
  const fmtPret = (ron) => isEur ? `${(ron / exRate).toFixed(2)} EUR` : lei(ron)

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
          const pretRola = parseFloat(p.pretBaza || p.active_base_price || 0)
          const pretDisc = globalDiscount > 0 ? Math.round(pretRola * (1 - globalDiscount) * 100) / 100 : pretRola
          const promoActive = (db.promotionRules || []).filter(r => {
            if (!esteActiva(r, firm?.id)) return false
            const cond = r.conditii || []
            return !cond.some(c => c.tip === 'produs_in_cos') || cond.some(c => c.tip === 'produs_in_cos' && c.productId === p.id)
          })
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
                {promoActive.length > 0 && (
                  <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid var(--green-text)' }}>
                    🏷 {promoActive.length} promoție{promoActive.length > 1 ? 'i' : ''}
                  </span>
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{p.cod}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                {pretDisc > 0 ? (
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {fmtPret(pretDisc)}
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>/rolă</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Preț la cerere</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Zoom imagine full-screen */}
      {zoomImg && (
        <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)' }} onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Rând principal: poză + specs în dreapta */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 16 }}>
              {/* Stânga: imagine cu zoom */}
              <div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: 180, cursor: selected.imagine ? 'zoom-in' : 'default' }}
                  onClick={() => selected.imagine && setZoomImg(selected.imagine)}>
                  <ProductImage src={selected.imagine} alt={selected.name}
                    style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
                </div>
                {selected.imagine && (
                  <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>Click pe poză pentru zoom</div>
                )}
              </div>

              {/* Dreapta: info + specs tehnice */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{selected.cod}{selected.categorie ? ` · ${selected.categorie}` : ''}</div>
                {selected.brand && <div style={{ fontSize: 12, marginBottom: 10 }}>Brand: <strong>{selected.brand}</strong></div>}

                {/* Preț / rolă */}
                {(() => {
                  const pretRola = parseFloat(selected.pretBaza || selected.active_base_price || 0)
                  if (!pretRola) return <div style={{ fontSize: 12, color: 'var(--text3)' }}>Preț la cerere</div>
                  const pretDisc = globalDiscount > 0 ? Math.round(pretRola * (1 - globalDiscount) * 100) / 100 : pretRola
                  return (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Preț / rolă</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtPret(pretDisc)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}> fără TVA</span></div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{fmtPret(cuTva(pretDisc))} <span style={{ color: 'var(--text3)' }}>cu TVA</span></div>
                      {globalDiscount > 0 && <div style={{ fontSize: 11, color: 'var(--green-text)' }}>discount {Math.round(globalDiscount * 100)}% aplicat</div>}
                    </div>
                  )
                })()}

                {/* Specificații tehnice + PDF sub ele */}
                {(() => {
                  const specs = selected.specs_json ? (typeof selected.specs_json === 'string' ? (() => { try { return JSON.parse(selected.specs_json) } catch { return [] } })() : selected.specs_json) : []
                  if (!specs?.length && !selected.datasheet_url) return null
                  return (
                    <div>
                      {specs?.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Specificații</div>
                          <table style={{ fontSize: 12, width: '100%' }}>
                            <tbody>
                              {specs.map((s, i) => (
                                <tr key={i}>
                                  <td style={{ color: 'var(--text3)', paddingRight: 10, paddingBottom: 3, whiteSpace: 'nowrap' }}>{s.key}</td>
                                  <td style={{ fontWeight: 500 }}>{s.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      {selected.datasheet_url && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => window.open(selected.datasheet_url, '_blank')}>
                            👁 Vizualizează fișa
                          </button>
                          <a className="btn btn-ghost btn-sm" href={selected.datasheet_url} download style={{ textDecoration: 'none' }}>
                            📥 Descarcă
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Promoții active — verde */}
            {(() => {
              const promotii = (db.promotionRules || []).filter(rule => {
                if (!esteActiva(rule, firm?.id)) return false
                const conditii = rule.conditii || []
                return !conditii.some(c => c.tip === 'produs_in_cos') || conditii.some(c => c.tip === 'produs_in_cos' && c.productId === selected.id)
              })
              if (!promotii.length) return null
              return (
                <div style={{ marginBottom: 14 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>Promoții active</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {promotii.map(rule => (
                      <div key={rule.id} style={{ background: 'var(--green-bg)', borderRadius: 8, padding: '9px 14px', fontSize: 13, border: '1px solid rgba(22,163,74,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--green-text)' }}>{rule.name || 'Promoție'}</span>
                          {rule.eticheta && <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, background: 'var(--green-text)', color: '#fff' }}>{rule.eticheta}</span>}
                          {rule.combinabil && <span style={{ fontSize: 10, color: 'var(--green-text)', border: '1px solid var(--green-text)', borderRadius: 10, padding: '0 6px' }}>cumulabilă</span>}
                        </div>
                        {rule.description && <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 3 }}>{rule.description}</div>}
                      </div>
                    ))}
                  </div>
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
