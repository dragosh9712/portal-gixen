import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

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
    }, 300)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>portal.gixen.ro</h1>
          <p>Autentifică-te în cont</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="w-full"
              placeholder="email@firma.ro"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Parolă</label>
            <input
              type="password"
              className="w-full"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Se autentifică...' : 'Intră în cont →'}
          </button>
        </form>

        <div className="login-hints">
          <strong>Conturi demo:</strong><br />
          👤 <b>Admin:</b> admin@gixen.ro / admin123<br />
          🏢 <b>Client 1:</b> contact@papirus.ro / client123<br />
          🏢 <b>Client 2:</b> achizitii@cleanpro.ro / client123<br />
          ⏳ <b>În aprobare:</b> nou@firma.ro / client123
        </div>
      </div>
    </div>
  )
}
