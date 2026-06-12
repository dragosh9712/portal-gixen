import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, cuTva } from '../utils'
import EmptyState from '../components/EmptyState'

function ProductImg({ src, name }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <div style={{ width: 80, height: 80, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧻</div>
  return <img src={src} alt={name} style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 10 }} onError={() => setErr(true)} />
}

export default function Favorite() {
  const { user } = useAuth()
  const { db, toggleFavorite, isFavorite, loadFavoritesForUser } = useStore()
  const navigate = useNavigate()

  useEffect(() => { if (user?.id) loadFavoritesForUser(user.id) }, [user?.id]) // eslint-disable-line

  const firma = (db.firms || []).find(f => f.id === (user.customerId || user.firmId)) || {}
  const isEur = firma.currency === 'EUR'
  const exRate = parseFloat(db.exchange?.applied_rate || db.exchange?.rate || 5)
  const globalDiscount = parseFloat(firma.global_discount || 0) / 100
  const fmtPret = (ron) => isEur ? `${(ron / exRate).toFixed(2)} EUR` : lei(ron)

  const favorites = db.products.filter(p => isFavorite(user.id, p.id))

  return (
    <Layout title="Produse favorite" actions={
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/comanda-noua')}>+ Comandă nouă</button>
    }>
      {favorites.length === 0 ? (
        <EmptyState type="favorite" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {favorites.map(p => {
            const pretRola = parseFloat(p.pretBaza || p.active_base_price || 0)
            const pretDisc = globalDiscount > 0 ? Math.round(pretRola * (1 - globalDiscount) * 100) / 100 : pretRola
            return (
              <div key={p.id} className="card" style={{ position: 'relative' }}>
                <button className="fav-btn" style={{ position: 'absolute', top: 10, right: 10 }}
                  onClick={() => toggleFavorite(user.id, p.id)} title="Șterge din favorite">❤️</button>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <ProductImg src={p.imagine} name={p.name} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{p.cod}</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{p.name}</div>
                {pretDisc > 0 ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {fmtPret(pretDisc)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>/rolă</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtPret(cuTva(pretDisc))} cu TVA</div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>Preț la cerere</div>
                )}
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center', fontSize: 12 }}
                  onClick={() => navigate('/comanda-noua')}>+ Adaugă în comandă</button>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
