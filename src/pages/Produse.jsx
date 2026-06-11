import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, calcLinePrice } from '../utils'

function ProductImage({ src, alt, style }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text3)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧻</div>
      </div>
    )
  }
  return <img src={src} alt={alt} style={style} onError={() => setErr(true)} />
}

export default function Produse() {
  const { user } = useAuth()
  const { db, toggleFavorite, isFavorite } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('toate')
  const [selected, setSelected] = useState(null)

  const firmId = user.firmId
  const products = db.products.filter(p => p.activ)
  const categories = ['toate', ...new Set(products.map(p => p.categorie))]

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'toate' || p.categorie === catFilter
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.cod || '').toLowerCase().includes(search.toLowerCase())
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
          const pricing = calcLinePrice(p, 1, firmId, db)
          return (
            <div key={p.id} className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
              onClick={() => setSelected(p)}>
              <div style={{ background: 'var(--bg)', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <button className="fav-btn" style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}
                  onClick={e => { e.stopPropagation(); toggleFavorite(user.id, p.id) }}
                  title={isFavorite(user.id, p.id) ? 'Șterge din favorite' : 'Adaugă la favorite'}>
                  {isFavorite(user.id, p.id) ? '❤️' : '🤍'}
                </button>
                <ProductImage
                  src={p.imagine}
                  alt={p.name}
                  style={{ maxHeight: 145, maxWidth: '90%', objectFit: 'contain' }}
                />
                {p.tag && (
                  <span style={{
                    position: 'absolute', top: 8, left: 8,
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: p.tag === 'Best Seller' ? 'var(--orange-bg)' : p.tag === 'NEW' ? 'var(--blue-bg)' : p.tag === 'Best Price' ? 'var(--green-bg)' : 'var(--purple-bg)',
                    color: p.tag === 'Best Seller' ? 'var(--orange-text)' : p.tag === 'NEW' ? 'var(--blue-text)' : p.tag === 'Best Price' ? 'var(--green-text)' : 'var(--purple-text)'
                  }}>{p.tag}</span>
                )}
                {p.stoc === 0 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red-text)', background: 'var(--red-bg)', padding: '4px 10px', borderRadius: 20 }}>Stoc epuizat</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{p.cod}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {lei(pricing.pretUnitar)}
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>/{p.unitate}</span>
                    </div>
                    {pricing.pretUnitar < p.pretBaza && (
                      <div style={{ fontSize: 10, color: 'var(--green-text)' }}>vs {lei(p.pretBaza)} bază</div>
                    )}
                  </div>
                  {pricing.promoLabel && <span className="promo-badge">-{pricing.discPromo}%</span>}
                </div>
                {p.stoc > 0 && p.stoc < 500 && (
                  <div style={{ fontSize: 10, color: 'var(--orange-text)', marginTop: 4 }}>⚠ Stoc limitat: {p.stoc}</div>
                )}
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
                <ProductImage
                  src={selected.imagine}
                  alt={selected.name}
                  style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{selected.cod} · {selected.categorie}</div>
                {selected.specs && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px', fontSize: 12 }}>
                    {[
                      ['Straturi', selected.specs.ply],
                      ['Foi', selected.specs.sheets],
                      ['Greutate', selected.specs.weight],
                      ['Pachet', selected.specs.pack],
                      ['Role/bax', selected.specs.packsPerBox],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label}><span style={{ color: 'var(--text3)' }}>{label}:</span> {val}</div>
                    ))}
                    <div>
                      <span style={{ color: 'var(--text3)' }}>Stoc:</span>{' '}
                      {selected.stoc > 1000
                        ? <span style={{ color: 'var(--green)' }}>Disponibil</span>
                        : selected.stoc > 0
                        ? <span style={{ color: 'var(--orange-text)' }}>Limitat ({selected.stoc})</span>
                        : <span style={{ color: 'var(--red-text)' }}>Epuizat</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>Tier pricing</div>
            <table>
              <thead><tr><th>Cantitate</th><th>Preț bază / {selected.unitate}</th><th>Prețul tău</th></tr></thead>
              <tbody>
                {(selected.tierPricing || []).map((t, i) => {
                  const pricing = calcLinePrice(selected, t.cantMin, firmId, db)
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{t.cantMin}{t.cantMax >= 9999 ? '+' : ` – ${t.cantMax}`} buc</td>
                      <td>{lei(t.pret)}</td>
                      <td><b style={{ color: pricing.pretUnitar < t.pret ? 'var(--green-text)' : '' }}>{lei(pricing.pretUnitar)}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

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
