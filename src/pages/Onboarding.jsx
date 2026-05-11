import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = ['Date firmă', 'Persoană contact', 'Confirmare']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    // Firma
    name: '',
    cui: '',
    regCom: '',
    adresa: '',
    localitate: '',
    judet: '',
    // Contact
    contactNume: '',
    contactPrenume: '',
    contactEmail: '',
    contactTelefon: '',
    password: '',
    passwordConfirm: '',
  })
  const [errors, setErrors] = useState({})

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validateStep(s) {
    const e = {}
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Câmp obligatoriu'
      if (!form.cui.trim()) e.cui = 'Câmp obligatoriu'
      if (!form.regCom.trim()) e.regCom = 'Câmp obligatoriu'
      if (!form.adresa.trim()) e.adresa = 'Câmp obligatoriu'
      if (!form.localitate.trim()) e.localitate = 'Câmp obligatoriu'
      if (!form.judet.trim()) e.judet = 'Câmp obligatoriu'
    }
    if (s === 1) {
      if (!form.contactNume.trim()) e.contactNume = 'Câmp obligatoriu'
      if (!form.contactPrenume.trim()) e.contactPrenume = 'Câmp obligatoriu'
      if (!form.contactEmail.trim()) e.contactEmail = 'Câmp obligatoriu'
      else if (!/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Email invalid'
      if (!form.contactTelefon.trim()) e.contactTelefon = 'Câmp obligatoriu'
      if (!form.password) e.password = 'Câmp obligatoriu'
      else if (form.password.length < 6) e.password = 'Minim 6 caractere'
      if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Parolele nu coincid'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => s + 1)
  }

  function handleSubmit() {
    setSubmitted(true)
  }

  const F = ({ id, label, type = 'text', placeholder, required }) => (
    <div className="form-group">
      <label>{label}{required && ' *'}</label>
      <input
        type={type}
        className="w-full"
        placeholder={placeholder}
        value={form[id]}
        onChange={e => set(id, e.target.value)}
        style={errors[id] ? { borderColor: 'var(--red-text)' } : {}}
      />
      {errors[id] && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 3 }}>{errors[id]}</div>}
    </div>
  )

  if (submitted) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Cerere trimisă!</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
            Contul tău pentru <b>{form.name}</b> a fost creat și este în așteptarea aprobării.<br />
            Vei fi contactat la <b>{form.contactEmail}</b> în maxim 24h.
          </p>
          <button className="btn btn-primary w-full" onClick={() => navigate('/login')}>
            Înapoi la login →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>portal.gixen.ro</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Creare cont client nou</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 500, flexShrink: 0,
                background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--bg3)',
                color: i <= step ? '#fff' : 'var(--text3)',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 11, marginLeft: 6, color: i === step ? 'var(--text)' : 'var(--text3)', fontWeight: i === step ? 500 : 400, whiteSpace: 'nowrap' }}>
                {s}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < step ? 'var(--green)' : 'var(--border)', margin: '0 10px' }} />
              )}
            </div>
          ))}
        </div>

        <div className="card">
          {/* Step 0: Company data */}
          {step === 0 && (
            <>
              <div className="section-title" style={{ marginBottom: 16 }}>Date firmă</div>
              <F id="name" label="Denumire societate" placeholder="SC Firma Mea SRL" required />
              <div className="form-row">
                <F id="cui" label="CUI" placeholder="RO12345678" required />
                <F id="regCom" label="Nr. Reg. Com." placeholder="J40/1234/2023" required />
              </div>
              <F id="adresa" label="Adresă sediu / livrare" placeholder="Str. Exemplu nr. 1" required />
              <div className="form-row">
                <F id="localitate" label="Localitate" placeholder="București" required />
                <F id="judet" label="Județ" placeholder="Ilfov" required />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                * Integrare ANAF disponibilă în versiunea de producție — completează CUI-ul și datele se vor popula automat.
              </div>
            </>
          )}

          {/* Step 1: Contact */}
          {step === 1 && (
            <>
              <div className="section-title" style={{ marginBottom: 16 }}>Persoană de contact</div>
              <div className="form-row">
                <F id="contactNume" label="Nume" placeholder="Ionescu" required />
                <F id="contactPrenume" label="Prenume" placeholder="Mihai" required />
              </div>
              <F id="contactEmail" label="Email cont" type="email" placeholder="email@firma.ro" required />
              <F id="contactTelefon" label="Telefon" placeholder="07xx xxx xxx" required />
              <div className="divider" />
              <div className="section-title" style={{ marginBottom: 12 }}>Setează parola</div>
              <div className="form-row">
                <F id="password" label="Parolă" type="password" placeholder="minim 6 caractere" required />
                <F id="passwordConfirm" label="Confirmă parola" type="password" placeholder="repetă parola" required />
              </div>
            </>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <>
              <div className="section-title" style={{ marginBottom: 16 }}>Confirmare date</div>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>Firmă</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text3)' }}>Denumire:</span> {form.name}</div>
                  <div><span style={{ color: 'var(--text3)' }}>CUI:</span> {form.cui}</div>
                  <div><span style={{ color: 'var(--text3)' }}>Reg. Com.:</span> {form.regCom}</div>
                  <div><span style={{ color: 'var(--text3)' }}>Localitate:</span> {form.localitate}, {form.judet}</div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text3)' }}>Adresă:</span> {form.adresa}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, fontSize: 13 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>Persoană de contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text3)' }}>Nume:</span> {form.contactNume} {form.contactPrenume}</div>
                  <div><span style={{ color: 'var(--text3)' }}>Telefon:</span> {form.contactTelefon}</div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text3)' }}>Email:</span> {form.contactEmail}</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--orange-bg)', borderRadius: 8, fontSize: 12, color: 'var(--orange-text)' }}>
                ⏳ Contul va fi activat după verificarea datelor de către echipa Gixen (max. 24h lucrătoare).
              </div>
            </>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            {step > 0
              ? <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Înapoi</button>
              : <button className="btn btn-secondary" onClick={() => navigate('/login')}>← Login</button>
            }
            {step < STEPS.length - 1
              ? <button className="btn btn-primary" onClick={next}>Continuă →</button>
              : <button className="btn btn-primary" onClick={handleSubmit}>Trimite cererea ✓</button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
