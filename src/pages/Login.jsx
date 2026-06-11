import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { GixenLogo } from '../GixenLogo'

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem('gixen_remember_email') || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!localStorage.getItem('gixen_remember_email'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { refreshAll } = useStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password, remember)
    if (result.ok) {
      await refreshAll()
      navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } else {
      setLoading(false)
      setError(result.error)
    }
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer', marginBottom: 4, userSelect: 'none' }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer' }} />
            Ține-mă minte
          </label>
          <button type="submit" className="btn btn-primary w-full"
            style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
            disabled={loading}>
            {loading ? 'Se verifică...' : 'Intră în cont →'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Cont nou? </span>
            <a href="/onboarding" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
              Solicită acces →
            </a>
          </span>
          <a href="/reset-parola" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none' }}>
            Ai uitat parola?
          </a>
        </div>
      </div>
    </div>
  )
}
