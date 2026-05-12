import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, calcLinePrice } from '../utils'
import EmptyState from '../components/EmptyState'

function ProductImg({ src, name }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <div style={{ width: 80, height: 80, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧻</div>
  return <img src={src} alt={name} style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 10 }} onError={() => setErr(true)} />
}

import { useState } from 'react'

export default function Favorite() {
  const { user } = useAuth()
  const { db, toggleFavorite, isFavorite } = useStore()
  const navigate = useNavigate()
  const firmId = user.firmId

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
            const pricing = calcLinePrice(p, 1, firmId, db)
            return (
              <div key={p.id} className="card" style={{ position: 'relative' }}>
                <button className="fav-btn" style={{ position: 'absolute', top: 10, right: 10 }}
                  onClick={() => toggleFavorite(user.id, p.id)} title="Șterge din favorite">❤️</button>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <ProductImg src={p.imagine} name={p.name} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{p.cod}</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{lei(pricing.pretUnitar)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>/{p.unitate}</span></div>
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
