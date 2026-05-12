import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { GixenLogo } from '../GixenLogo'


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
    <div className="login-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="login-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <GixenLogo color="#21376c" height={44} />
          </div>
          <h1 style={{ textAlign: 'center' }}>Bun venit</h1>
          <p className="login-sub" style={{ textAlign: 'center' }}>Introdu datele de acces pentru a continua</p>

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
  )
}
