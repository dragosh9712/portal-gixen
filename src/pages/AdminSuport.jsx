import { useState, useEffect } from 'react'
import Layout from '../Layout'
import api from '../api'

const STATUS_OPTS = [
  { value: 'in_asteptare', label: 'În așteptare', color: '#f59e0b' },
  { value: 'in_lucru',     label: 'În lucru',     color: '#3b82f6' },
  { value: 'rezolvat',     label: 'Rezolvat',      color: '#22c55e' },
]

export default function AdminSuport() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [status, setStatus] = useState('in_asteptare')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const load = () => {
    api.support.list().then(r => { setTickets(r || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openTicket = t => { setSelected(t); setReply(t.admin_reply || ''); setStatus(t.status) }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.support.update(selected.id, { status, admin_reply: reply })
      showToast('Tichet actualizat')
      setSelected(null)
      load()
    } catch (err) {
      showToast(err.message || 'Eroare', 'error')
    } finally { setSaving(false) }
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const counts = {
    in_asteptare: tickets.filter(t => t.status === 'in_asteptare').length,
    in_lucru:     tickets.filter(t => t.status === 'in_lucru').length,
    rezolvat:     tickets.filter(t => t.status === 'rezolvat').length,
  }

  return (
    <Layout title="Suport clienți" subtitle={`${tickets.length} tichete total`}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14 }}>
          {toast.msg}
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ value: 'all', label: 'Toate', count: tickets.length }, ...STATUS_OPTS.map(s => ({ ...s, count: counts[s.value] }))].map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 13,
              borderColor: filter === s.value ? (s.color || 'var(--primary)') : 'var(--border)',
              background: filter === s.value ? ((s.color || '#6366f1') + '15') : 'transparent',
              color: filter === s.value ? (s.color || 'var(--primary)') : 'var(--text2)',
              fontWeight: filter === s.value ? 600 : 400 }}>
            {s.label} {s.count > 0 && <span style={{ marginLeft: 4, background: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>{s.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Se încarcă…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎫</div>
          <div>Niciun tichet</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Email', 'Subiect', 'Descriere', 'Status', 'Data', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const s = STATUS_OPTS.find(x => x.value === t.status)
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      {t.company_name || t.name || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{t.email || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{t.subject || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                        {t.description || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: (s?.color || '#9ca3af') + '22', color: s?.color || '#9ca3af',
                        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {s?.label || t.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleDateString('ro-RO')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => openTicket(t)}>
                        Deschide
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28,
            width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Tichet #{selected.id}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text3)' }}>Client: </span>{selected.company_name || '—'}</div>
              <div><span style={{ color: 'var(--text3)' }}>Nume: </span>{selected.name || '—'}</div>
              <div><span style={{ color: 'var(--text3)' }}>Email: </span>{selected.email || '—'}</div>
              <div><span style={{ color: 'var(--text3)' }}>Telefon: </span>{selected.phone || '—'}</div>
              <div><span style={{ color: 'var(--text3)' }}>Subiect: </span>{selected.subject || '—'}</div>
              <div><span style={{ color: 'var(--text3)' }}>Data: </span>{new Date(selected.created_at).toLocaleString('ro-RO')}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>DESCRIERE</div>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 13,
                lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text1)' }}>
                {selected.description || '—'}
              </div>
            </div>

            {selected.photo_url && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 6 }}>FOTOGRAFIE</div>
                <a href={selected.photo_url} target="_blank" rel="noreferrer">
                  <img src={selected.photo_url} alt="foto ticket" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 260, objectFit: 'contain' }} />
                </a>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Status</label>
              <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Răspuns admin (vizibil clientului)</label>
              <textarea className="form-input" rows={4} style={{ resize: 'vertical' }}
                placeholder="Scrie un răspuns pentru client..."
                value={reply} onChange={e => setReply(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Se salvează…' : 'Salvează'}
              </button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
