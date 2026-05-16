import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../StoreContext'
import { useAuth } from '../AuthContext'
import { lei } from '../utils'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { db } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const ref = useRef()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); ref.current?.focus(); setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const results = query.length < 2 ? [] : [
    ...db.products.filter(p => p.activ && (
      p.name.toLowerCase().includes(query.toLowerCase()) || p.cod.toLowerCase().includes(query.toLowerCase())
    )).slice(0, 3).map(p => ({ type: 'Produs', label: p.name, sub: p.cod, path: isAdmin ? '/admin/produse' : '/produse', color: '#7c3aed', bg: '#f5f3ff' })),
    ...db.orders.filter(o => (!isAdmin ? o.firmId === user?.firmId : true) && o.nr.toLowerCase().includes(query.toLowerCase())).slice(0, 3).map(o => {
      const firm = db.firms.find(f => f.id === o.firmId)
      return { type: 'Comandă', label: o.nr, sub: `${firm?.name} · ${lei(o.total)}`, path: isAdmin ? '/admin/comenzi' : '/comenzile-mele', color: '#2563eb', bg: '#eff6ff' }
    }),
    ...(isAdmin ? db.firms.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 2).map(f => ({
      type: 'Client', label: f.name, sub: f.cui, path: '/admin/clienti', color: '#16a34a', bg: '#f0fdf4'
    })) : []),
  ]

  function go(path) { setOpen(false); setQuery(''); navigate(path) }

  return (
    <div className="search-global-wrap" style={{ width: 240 }}>
      <svg className="search-global-icon" width="14" height="14" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15 15l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input ref={ref} type="text" placeholder="Caută... (Ctrl+K)" value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: '100%', fontSize: 13 }} />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((r, i) => (
            <div key={i} className="search-result-item" onMouseDown={() => go(r.path)}>
              <span className="search-result-type" style={{ background: r.bg, color: r.color }}>{r.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="search-results" style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          Niciun rezultat pentru „{query}"
        </div>
      )}
    </div>
  )
}
