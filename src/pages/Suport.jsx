import { useState, useEffect } from 'react'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import api from '../api'

const STATUS_LABEL = { in_asteptare: 'În așteptare', in_lucru: 'În lucru', rezolvat: 'Rezolvat' }
const STATUS_COLOR = { in_asteptare: '#f59e0b', in_lucru: '#3b82f6', rezolvat: '#22c55e' }

export default function Suport() {
  const { user } = useAuth()
  const { firm } = useStore()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', description: '' })

  useEffect(() => {
    setForm(f => ({
      ...f,
      name:  user?.name  || '',
      email: user?.email || '',
      phone: firm?.telefon || '',
    }))
  }, [user, firm])

  useEffect(() => {
    api.support.list().then(r => { setTickets(r || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.description.trim()) return showToast('Descrie problema ta', 'error')
    setSending(true)
    try {
      await api.support.create(form, photo || undefined)
      showToast('Tichetul a fost trimis! Vei fi contactat în curând.')
      setShowForm(false)
      setPhoto(null)
      setForm(f => ({ ...f, subject: '', description: '' }))
      const r = await api.support.list()
      setTickets(r || [])
    } catch (err) {
      showToast(err.message || 'Eroare la trimitere', 'error')
    } finally { setSending(false) }
  }

  return (
    <Layout title="Suport" subtitle="Trimite o cerere de suport sau urmărește statusul">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Anulează' : '+ Tichet nou'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 24, padding: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Cerere nouă de suport</div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Nume</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Telefon</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Subiect</label>
                  <input className="form-input" placeholder="ex: Comandă incorectă" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Descriere problemă <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea className="form-input" rows={4} style={{ resize: 'vertical' }}
                  placeholder="Descrie în detaliu problema întâmpinată..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Fotografie (opțional)</label>
                <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0] || null)}
                  style={{ fontSize: 13, color: 'var(--text2)' }} />
                {photo && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{photo.name}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary" disabled={sending}>
                  {sending ? 'Se trimite…' : 'Trimite tichet'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Anulează</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Se încarcă…</div>
        ) : tickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎫</div>
            <div style={{ fontWeight: 500 }}>Nu ai tichete de suport</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Apasă „+ Tichet nou" pentru a trimite o cerere</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map(t => (
              <div key={t.id} className="card" style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: `3px solid ${STATUS_COLOR[t.status] || '#e5e7eb'}` }}
                onClick={() => setSelected(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.subject || '(fără subiect)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {new Date(t.created_at).toLocaleDateString('ro-RO')} • #{t.id}
                    </div>
                  </div>
                  <span style={{ background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status],
                    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
                {t.description && (
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 540, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.subject || '(fără subiect)'}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
            </div>
            <span style={{ background: STATUS_COLOR[selected.status] + '22', color: STATUS_COLOR[selected.status],
              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {STATUS_LABEL[selected.status] || selected.status}
            </span>
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selected.description}
            </div>
            {selected.photo_url && (
              <img src={selected.photo_url} alt="foto" style={{ marginTop: 12, maxWidth: '100%', borderRadius: 8 }} />
            )}
            {selected.admin_reply && (
              <div style={{ marginTop: 16, background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>RĂSPUNS ADMINISTRATOR</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', whiteSpace: 'pre-wrap' }}>{selected.admin_reply}</div>
              </div>
            )}
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
              Creat: {new Date(selected.created_at).toLocaleString('ro-RO')}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
