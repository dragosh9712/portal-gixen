import { useState } from 'react'
import { GixenLogo } from '../GixenLogo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare')
      setSent(true)
    } catch (err) {
      setError(err.message)
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

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Cerere trimisă</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
              Am primit cererea ta. Un administrator va reseta parola și te va contacta la <b>{email}</b> în cel mai scurt timp.
            </p>
            <a href="/login" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
              ← Înapoi la login
            </a>
          </div>
        ) : (
          <>
            <h1 style={{ textAlign: 'center', fontSize: 20, marginBottom: 4 }}>Resetare parolă</h1>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
              Introdu emailul contului tău și un administrator te va contacta.
            </p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email cont</label>
                <input type="email" className="w-full" placeholder="email@firma.ro"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary w-full"
                style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
                disabled={loading}>
                {loading ? 'Se trimite...' : 'Trimite cererea'}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <a href="/login" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none' }}>
                ← Înapoi la login
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
