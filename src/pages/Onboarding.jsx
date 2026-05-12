import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GixenLogo } from '../GixenLogo'
import { useStore } from '../StoreContext'

const STEPS = ['Date firmă', 'Persoană contact', 'Confirmare']

function FormField({ id, label, type = 'text', placeholder, required, value, onChange, error }) {
  return (
    <div className="form-group">
      <label>{label}{required && ' *'}</label>
      <input type={type} className="w-full" placeholder={placeholder} value={value}
        onChange={e => onChange(id, e.target.value)}
        style={error ? { borderColor: 'var(--red-text)' } : {}} />
      {error && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 3 }}>{error}</div>}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { registerNewClient } = useStore()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    name: '', cui: '', regCom: '', adresa: '', localitate: '', judet: '',
    contactNume: '', contactPrenume: '', contactEmail: '', contactTelefon: '',
    password: '', passwordConfirm: '',
  })

  function handleChange(id, val) {
    setForm(prev => ({ ...prev, [id]: val }))
    setErrors(prev => ({ ...prev, [id]: '' }))
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

  function next() { if (validateStep(step)) setStep(s => s + 1) }

  function handleSubmit() {
    registerNewClient(form, { email: form.contactEmail, password: form.password, contactNume: form.contactNume, contactPrenume: form.contactPrenume })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Cerere trimisă!</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.7 }}>
            Contul pentru <b>{form.name}</b> a fost creat și este în așteptarea aprobării.<br />
            Vei fi contactat la <b>{form.contactEmail}</b> în maxim 24h.
          </p>
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => navigate('/login')}>
            Înapoi la login →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 540, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <GixenLogo color="#21376c" height={40} />
        </div>
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--bg3)', color: i <= step ? '#fff' : 'var(--text3)', transition: 'all 0.3s' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 11, marginLeft: 6, fontWeight: i === step ? 600 : 400, color: i === step ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap' }}>{s}</div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 10px', background: i < step ? 'var(--green)' : 'var(--border)', transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 0 && (
            <>
              <div className="section-title" style={{ marginBottom: 16 }}>Date firmă</div>
              <FormField id="name" label="Denumire societate" placeholder="SC Firma Mea SRL" required value={form.name} onChange={handleChange} error={errors.name} />
              <div className="form-row">
                <FormField id="cui" label="CUI" placeholder="RO12345678" required value={form.cui} onChange={handleChange} error={errors.cui} />
                <FormField id="regCom" label="Nr. Reg. Com." placeholder="J40/1234/2023" required value={form.regCom} onChange={handleChange} error={errors.regCom} />
              </div>
              <FormField id="adresa" label="Adresă" placeholder="Str. Exemplu nr. 1" required value={form.adresa} onChange={handleChange} error={errors.adresa} />
              <div className="form-row">
                <FormField id="localitate" label="Localitate" placeholder="București" required value={form.localitate} onChange={handleChange} error={errors.localitate} />
                <FormField id="judet" label="Județ" placeholder="Ilfov" required value={form.judet} onChange={handleChange} error={errors.judet} />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="section-title" style={{ marginBottom: 16 }}>Persoană de contact</div>
              <div className="form-row">
                <FormField id="contactNume" label="Nume" placeholder="Ionescu" required value={form.contactNume} onChange={handleChange} error={errors.contactNume} />
                <FormField id="contactPrenume" label="Prenume" placeholder="Mihai" required value={form.contactPrenume} onChange={handleChange} error={errors.contactPrenume} />
              </div>
              <FormField id="contactEmail" label="Email cont" type="email" placeholder="email@firma.ro" required value={form.contactEmail} onChange={handleChange} error={errors.contactEmail} />
              <FormField id="contactTelefon" label="Telefon" placeholder="07xx xxx xxx" required value={form.contactTelefon} onChange={handleChange} error={errors.contactTelefon} />
              <div className="divider" />
              <div className="section-title" style={{ marginBottom: 12 }}>Parolă</div>
              <div className="form-row">
                <FormField id="password" label="Parolă" type="password" placeholder="minim 6 caractere" required value={form.password} onChange={handleChange} error={errors.password} />
                <FormField id="passwordConfirm" label="Confirmă parola" type="password" placeholder="repetă parola" required value={form.passwordConfirm} onChange={handleChange} error={errors.passwordConfirm} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="section-title" style={{ marginBottom: 16 }}>Confirmare date</div>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Firmă</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text3)' }}>Denumire:</span> {form.name}</div>
                  <div><span style={{ color: 'var(--text3)' }}>CUI:</span> {form.cui}</div>
                  <div><span style={{ color: 'var(--text3)' }}>Reg. Com.:</span> {form.regCom}</div>
                  <div><span style={{ color: 'var(--text3)' }}>Localitate:</span> {form.localitate}, {form.judet}</div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text3)' }}>Adresă:</span> {form.adresa}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  <div><span style={{ color: 'var(--text3)' }}>Nume:</span> {form.contactNume} {form.contactPrenume}</div>
                  <div><span style={{ color: 'var(--text3)' }}>Telefon:</span> {form.contactTelefon}</div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text3)' }}>Email:</span> {form.contactEmail}</div>
                </div>
              </div>
              <div style={{ marginTop: 14, padding: 12, background: 'var(--orange-bg)', borderRadius: 8, fontSize: 12, color: 'var(--orange-text)' }}>
                ⏳ Contul va fi activat după verificarea datelor de către echipa Gixen (max. 24h).
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            {step > 0 ? <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Înapoi</button>
              : <button className="btn btn-secondary" onClick={() => navigate('/login')}>← Login</button>}
            {step < STEPS.length - 1
              ? <button className="btn btn-primary" onClick={next}>Continuă →</button>
              : <button className="btn btn-primary" onClick={handleSubmit}>Trimite cererea ✓</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
