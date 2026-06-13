import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { GixenLogo } from '../GixenLogo'
import api from '../api'
import { setToken } from '../api'

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem('gixen_remember_email') || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!localStorage.getItem('gixen_remember_email'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // 2FA OTP step
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const { login, setUser } = useAuth()
  const { refreshAll } = useStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password, remember)
    if (result.requiresOtp) {
      setLoading(false)
      setOtpStep(true)
    } else if (result.ok) {
      await refreshAll()
      navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } else {
      setLoading(false)
      setError(result.error)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError('')
    setOtpLoading(true)
    try {
      const data = await api.auth.verifyOtp(email, otpCode)
      setToken(data.token, remember)
      const userObj = { ...data.user }
      setUser(userObj, remember)
      await refreshAll()
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } catch (err) {
      setError(err.message || 'Cod invalid sau expirat')
      setOtpLoading(false)
    }
  }

  async function handleResendOtp() {
    setError('')
    setOtpCode('')
    await login(email, password, remember)
  }

  return (
    <div className="login-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <GixenLogo color="#21376c" height={44} />
        </div>
        <h1 style={{ textAlign: 'center' }}>Bun venit</h1>
        <p className="login-sub" style={{ textAlign: 'center' }}>
          {otpStep ? 'Verificare în doi pași' : 'Introdu datele de acces pentru a continua'}
        </p>

        {error && <div className="login-error">{error}</div>}

        {!otpStep ? (
          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="username" autoComplete="username" className="w-full" placeholder="email@firma.ro"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Parolă</label>
              <input type="password" name="password" autoComplete="current-password" className="w-full" placeholder="••••••••"
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
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ background: 'var(--blue-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--blue-text)' }}>
              📧 Am trimis un cod de 6 cifre la <strong>{email}</strong>. Valabil 10 minute.
            </div>
            <div className="form-group">
              <label>Cod de verificare</label>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code"
                className="w-full" placeholder="ex: 123456"
                maxLength={6} style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
                value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary w-full"
              style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
              disabled={otpLoading || otpCode.length < 6}>
              {otpLoading ? 'Se verifică...' : 'Confirmă →'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}
                onClick={handleResendOtp}>Retrimite codul</button>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}
                onClick={() => { setOtpStep(false); setOtpCode(''); setError('') }}>← Înapoi</button>
            </div>
          </form>
        )}

        {!otpStep && (
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
        )}
      </div>
    </div>
  )
}
