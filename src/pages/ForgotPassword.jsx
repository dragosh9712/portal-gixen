import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GixenLogo } from '../GixenLogo'
import api from '../api'

export default function ForgotPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token    = params.get('token')

  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [pass2, setPass2]     = useState('')
  const [sent, setSent]       = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequest(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetNewPassword(e) {
    e.preventDefault()
    setError('')
    if (!pass || !pass2) return setError('Completați ambele câmpuri.')
    if (pass !== pass2)  return setError('Parolele nu coincid.')
    if (pass.length < 6) return setError('Parola trebuie să aibă minim 6 caractere.')
    setLoading(true)
    try {
      await api.auth.resetPasswordToken(token, pass)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message || 'Link invalid sau expirat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <GixenLogo color="#21376c" height={44} />
        </div>

        {token ? (
          /* ── Setare parolă nouă (link din email) ── */
          done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Parolă schimbată!</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                Vei fi redirecționat către pagina de login...
              </p>
              <a href="/login" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
                Mergi la login →
              </a>
            </div>
          ) : (
            <form onSubmit={handleSetNewPassword}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Setează parola nouă</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, textAlign: 'center' }}>
                Alege o parolă nouă pentru contul tău.
              </p>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label>Parolă nouă</label>
                <input type="password" className="w-full" placeholder="Minim 6 caractere"
                  value={pass} onChange={e => setPass(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label>Confirmă parola</label>
                <input type="password" className="w-full" placeholder="Repetă parola"
                  value={pass2} onChange={e => setPass2(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}
                style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}>
                {loading ? 'Se procesează...' : 'Salvează parola nouă'}
              </button>
            </form>
          )
        ) : (
          /* ── Cerere link de resetare ── */
          sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Email trimis</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                Dacă adresa <b>{email}</b> există în sistem, vei primi un email cu link-ul de resetare.
                Link-ul este valabil <b>2 ore</b>.
              </p>
              <a href="/login" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
                ← Înapoi la login
              </a>
            </div>
          ) : (
            <form onSubmit={handleRequest}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Ai uitat parola?</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
                Introdu adresa de email a contului. Vei primi un link de resetare valabil 2 ore.
              </p>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="w-full" placeholder="adresa@firma.ro"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}
                style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}>
                {loading ? 'Se trimite...' : 'Trimite link de resetare'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <a href="/login" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none' }}>← Înapoi la login</a>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  )
}
