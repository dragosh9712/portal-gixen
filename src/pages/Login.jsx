import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const GIXEN_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 83.56 49.28"><path d="M59.89,34.59h.07c.24-.34.54-.68.91-1.01.37-.33.78-.62,1.25-.87.47-.25.99-.46,1.55-.61.57-.16,1.17-.23,1.8-.23s1.19.07,1.76.2c.56.14,1.08.35,1.55.64.47.29.88.67,1.24,1.13.36.47.64,1.02.85,1.65.12.36.19.74.23,1.16.04.41.06.9.06,1.45v10.76h-4.06v-10.14c0-.44-.02-.82-.05-1.14-.04-.32-.09-.6-.19-.84-.2-.53-.51-.9-.93-1.13-.42-.23-.92-.34-1.51-.34-.79,0-1.54.19-2.27.56-.72.37-1.36.91-1.92,1.62v11.42h-4.06v-16.57h3.36l.37,2.3ZM48.21,35.02c-.51,0-.97.09-1.37.28-.4.19-.74.44-1.03.77-.29.33-.52.71-.69,1.14-.18.43-.29.89-.34,1.38h6.52c0-.49-.06-.95-.2-1.38-.13-.43-.32-.81-.58-1.14-.26-.33-.58-.58-.96-.77-.39-.19-.83-.28-1.34-.28ZM49.84,46.02c.79,0,1.61-.08,2.46-.23.86-.16,1.72-.39,2.6-.68v3.22c-.52.23-1.33.44-2.41.65-1.08.2-2.21.3-3.37.3s-2.29-.15-3.35-.46c-1.05-.3-1.97-.79-2.77-1.46-.79-.67-1.41-1.55-1.88-2.62-.46-1.07-.7-2.37-.7-3.9s.22-2.82.65-3.95c.43-1.13,1.02-2.06,1.75-2.8.73-.74,1.56-1.3,2.51-1.67.94-.37,1.92-.55,2.92-.55s2.02.16,2.91.48c.88.32,1.65.82,2.3,1.5.65.68,1.15,1.56,1.51,2.63.36,1.08.54,2.35.54,3.82-.01.57-.03,1.05-.05,1.45h-10.87c.06.77.23,1.42.51,1.97.29.54.65.99,1.12,1.33.46.34,1,.59,1.61.74.62.16,1.28.23,2,.23ZM33.49,43.1l-4.28,5.76h-4.65l6.55-8.45-6.15-8.12h4.77l3.87,5.47,3.94-5.47h4.79l-6.33,8.11,6.51,8.47h-4.74l-4.26-5.76ZM21.07,32.29h4.06v16.57h-4.06v-16.57ZM15.24,40.1h-5.13v-3.5h9.34v11.55c-.34.13-.78.26-1.31.4-.53.13-1.12.26-1.78.37-.65.11-1.33.2-2.03.26-.7.07-1.38.11-2.07.11-2.06,0-3.85-.27-5.38-.83-1.54-.55-2.81-1.33-3.83-2.34-1.02-1-1.79-2.2-2.3-3.59-.51-1.39-.76-2.92-.76-4.6,0-1.19.13-2.32.4-3.4.27-1.08.67-2.08,1.19-3,.52-.92,1.16-1.75,1.9-2.49.74-.74,1.59-1.38,2.55-1.9.95-.52,1.99-.92,3.13-1.2,1.13-.28,2.35-.42,3.65-.42,1.15,0,2.25.08,3.29.25,1.03.16,1.89.37,2.55.6v3.53c-.89-.27-1.79-.48-2.69-.62-.91-.15-1.82-.22-2.74-.22-1.24,0-2.41.19-3.49.55-1.09.37-2.02.92-2.81,1.65-.79.72-1.42,1.62-1.87,2.68-.46,1.06-.68,2.29-.68,3.68.01,2.7.72,4.74,2.11,6.09,1.4,1.35,3.38,2.03,5.95,2.03.48,0,.98-.02,1.48-.08.51-.05.96-.12,1.35-.2v-5.37Z"/></svg>`

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const result = login(email, password)
      setLoading(false)
      if (result.ok) {
        const user = JSON.parse(localStorage.getItem('gixen_user'))
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
      } else {
        setError(result.error)
      }
    }, 350)
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-left-logo" dangerouslySetInnerHTML={{ __html: GIXEN_LOGO }} />
          <h2>Portal comenzi B2B</h2>
          <p>Gestionează comenzile, prețurile și clienții dintr-un singur loc.</p>
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Catalog produse cu prețuri personalizate', 'Urmărire comenzi în timp real', 'Rapoarte și statistici'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-card">
          <h1>Bun venit</h1>
          <p className="login-sub">Introdu datele de acces pentru a continua</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email sau nume utilizator</label>
              <input type="text" className="w-full" placeholder="email@firma.ro"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Parolă</label>
              <input type="password" className="w-full" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full"
              style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
              disabled={loading}>
              {loading ? 'Se verifică...' : 'Intră în cont →'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Cont nou? </span>
            <a href="/onboarding" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
              Solicită acces →
            </a>
          </div>

          <div className="login-hints">
            <strong>Conturi demo:</strong><br />
            🔑 Admin: <code>test.admin</code> / <code>test.admin</code><br />
            🏢 Client: <code>test.client</code> / <code>test.client</code><br />
            🏢 Papirus: <code>contact@papirus.ro</code> / <code>client123</code>
          </div>
        </div>
      </div>
    </div>
  )
}
