import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GixenLogo } from '../GixenLogo'
import { useStore } from '../StoreContext'
import { useAuth } from '../AuthContext'

const STEPS = ['Date firmă', 'Persoană contact', 'Date suplimentare', 'Confirmare']

const JUDETE = ['Alba','Arad','Argeș','Bacău','Bihor','Bistrița-Năsăud','Botoșani','Brăila','Brașov','București','Buzău','Călărași','Caraș-Severin','Cluj','Constanța','Covasna','Dâmbovița','Dolj','Galați','Giurgiu','Gorj','Harghita','Hunedoara','Ialomița','Iași','Ilfov','Maramureș','Mehedinți','Mureș','Neamț','Olt','Prahova','Sălaj','Satu Mare','Sibiu','Suceava','Teleorman','Timiș','Tulcea','Vâlcea','Vaslui','Vrancea']

function FormField({ id, label, type = 'text', placeholder, required, value, onChange, error, options, hint, readOnly, loading }) {
  return (
    <div className="form-group">
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}{required && <span style={{ color: 'var(--red-text)' }}>*</span>}
        {loading && <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 400 }}>Se verifică...</span>}
      </label>
      {type === 'select' ? (
        <select className="w-full" value={value} onChange={e => onChange(id, e.target.value)} style={error ? { borderColor: 'var(--red-text)' } : {}}>
          <option value="">Selectează...</option>
          {options?.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="w-full" placeholder={placeholder} value={value} rows={3}
          onChange={e => onChange(id, e.target.value)} style={error ? { borderColor: 'var(--red-text)' } : {}} />
      ) : (
        <input type={type} className="w-full" placeholder={placeholder} value={value}
          onChange={e => onChange(id, e.target.value)}
          readOnly={readOnly}
          style={{ ...(error ? { borderColor: 'var(--red-text)' } : {}), ...(readOnly ? { background: 'var(--bg)', color: 'var(--text3)' } : {}) }} />
      )}
      {hint && !error && <div style={{ fontSize: 11, color: 'var(--green-text)', marginTop: 3 }}>✓ {hint}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 3 }}>{error}</div>}
    </div>
  )
}

function validateCUIFormat(cui) {
  const cleaned = String(cui).replace(/\s/g, '').replace(/^RO/i, '')
  if (!/^\d{2,10}$/.test(cleaned)) return false
  // Verificare cifra de control CUI România
  const digits = cleaned.split('').map(Number)
  const control = digits.pop()
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2].slice(9 - digits.length)
  const sum = digits.reduce((s, d, i) => s + d * weights[i], 0)
  const check = (sum * 10) % 11 === 10 ? 0 : (sum * 10) % 11
  return check === control
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { registerNewClient } = useStore()
  const { loginWithToken } = useAuth()

  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [anafLoading, setAnafLoading] = useState(false)
  const [anafData, setAnafData] = useState(null)
  const [form, setForm] = useState({
    name: '', cui: '', regCom: '', adresa: '', localitate: '', judet: '',
    contactNume: '', contactPrenume: '', contactEmail: '', contactTelefon: '',
    password: '', passwordConfirm: '',
    iban: '', banca: '', adresaLivrare: '', programLivrare: '',
    emailDocumente: '',
  })

  useEffect(() => {
    if (token) {
      loginWithToken(token).then(r => { if (r?.ok) navigate('/dashboard') })
    }
  }, [token])

  function handleChange(id, val) {
    setForm(prev => ({ ...prev, [id]: val }))
    setErrors(prev => ({ ...prev, [id]: '' }))
    if (id === 'cui') setAnafData(null)
  }

  async function checkANAF() {
    const cui = form.cui.trim()
    if (!cui) { setErrors(p => ({ ...p, cui: 'Introduceți CUI-ul' })); return }
    if (!validateCUIFormat(cui)) { setErrors(p => ({ ...p, cui: 'CUI invalid — verificați cifra de control' })); return }
    setAnafLoading(true)
    setErrors(p => ({ ...p, cui: '' }))
    try {
      const res = await fetch('/api/anaf/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cui }),
      })
      const data = await res.json()
      if (data.valid) {
        setAnafData(data)
        setForm(prev => ({
          ...prev,
          name: prev.name || data.denumire || prev.name,
        }))
        setErrors(p => ({ ...p, cui: '' }))
      } else {
        setErrors(p => ({ ...p, cui: data.error || 'CUI negăsit în ANAF' }))
      }
    } catch {
      setErrors(p => ({ ...p, cui: 'Eroare la verificarea ANAF' }))
    } finally {
      setAnafLoading(false)
    }
  }

  function validateStep(s) {
    const e = {}
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Câmp obligatoriu'
      if (!form.cui.trim()) e.cui = 'Câmp obligatoriu'
      else if (!validateCUIFormat(form.cui)) e.cui = 'CUI invalid — verificați cifra de control'
      if (!form.regCom.trim()) e.regCom = 'Câmp obligatoriu'
      else if (!/^J\d{1,2}\/\d+\/\d{4}$/.test(form.regCom.trim())) e.regCom = 'Format invalid (ex: J40/1234/2024)'
      if (!form.adresa.trim()) e.adresa = 'Câmp obligatoriu'
      if (!form.localitate.trim()) e.localitate = 'Câmp obligatoriu'
      if (!form.judet) e.judet = 'Selectați județul'
    }
    if (s === 1) {
      if (!form.contactNume.trim()) e.contactNume = 'Câmp obligatoriu'
      if (!form.contactPrenume.trim()) e.contactPrenume = 'Câmp obligatoriu'
      if (!form.contactEmail.trim()) e.contactEmail = 'Câmp obligatoriu'
      else if (!/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Email invalid'
      if (!form.contactTelefon.trim()) e.contactTelefon = 'Câmp obligatoriu'
      else if (!/^[0-9+\s\-()]{7,15}$/.test(form.contactTelefon.trim())) e.contactTelefon = 'Număr telefon invalid'
      if (!form.password) e.password = 'Câmp obligatoriu'
      else if (form.password.length < 6) e.password = 'Minim 6 caractere'
      if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Parolele nu coincid'
    }
    if (s === 2) {
      if (form.iban && !/^RO\d{2}[A-Z]{4}\d{16}$/.test(form.iban.replace(/\s/g, '').toUpperCase())) {
        e.iban = 'Format IBAN invalid (ex: RO49BTRL0450120012345678)'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (validateStep(step)) setStep(s => s + 1) }
  function prev() { setStep(s => s - 1) }

  async function handleSubmit() {
    try {
      await registerNewClient(form, {
        email: form.contactEmail, password: form.password,
        contactNume: form.contactNume, contactPrenume: form.contactPrenume,
      })
      setSubmitted(true)
    } catch (err) {
      setErrors({ general: err.message || 'Eroare la trimiterea cererii' })
    }
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

  const stepContent = [
    // Step 0: Date firmă
    <div key={0}>
      <div className="form-row" style={{ alignItems: 'flex-end' }}>
        <FormField id="cui" label="CUI" placeholder="RO12345678 sau 12345678" required
          value={form.cui} onChange={handleChange} error={errors.cui}
          hint={anafData ? `Verificat ANAF: ${anafData.denumire}` : ''}
          loading={anafLoading} />
        <div className="form-group" style={{ flexShrink: 0 }}>
          <label style={{ opacity: 0 }}>.</label>
          <button type="button" className="btn btn-secondary" onClick={checkANAF} disabled={anafLoading}
            style={{ whiteSpace: 'nowrap' }}>
            {anafLoading ? 'Se verifică...' : '🔍 Verifică ANAF'}
          </button>
        </div>
      </div>

      {anafData && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--green-text)', marginBottom: 4 }}>✓ Date preluate din ANAF</div>
          <div style={{ color: 'var(--text2)' }}><b>{anafData.denumire}</b></div>
          {anafData.adresa && <div style={{ color: 'var(--text3)', marginTop: 2 }}>{anafData.adresa}</div>}
          {anafData.platitorTva && <div style={{ color: 'var(--blue)', marginTop: 2 }}>Plătitor TVA</div>}
        </div>
      )}

      <FormField id="name" label="Denumire firmă" placeholder="SC Firma Mea SRL" required
        value={form.name} onChange={handleChange} error={errors.name} />
      <div className="form-row">
        <FormField id="regCom" label="Nr. Reg. Comerțului" placeholder="J40/1234/2024" required
          value={form.regCom} onChange={handleChange} error={errors.regCom} />
      </div>
      <FormField id="adresa" label="Adresă sediu social" placeholder="Str. Exemplu nr. 1" required
        value={form.adresa} onChange={handleChange} error={errors.adresa} />
      <div className="form-row">
        <FormField id="localitate" label="Localitate" placeholder="București" required
          value={form.localitate} onChange={handleChange} error={errors.localitate} />
        <FormField id="judet" label="Județ" type="select" required
          options={JUDETE} value={form.judet} onChange={handleChange} error={errors.judet} />
      </div>
    </div>,

    // Step 1: Contact
    <div key={1}>
      <div className="form-row">
        <FormField id="contactNume" label="Nume" placeholder="Popescu" required value={form.contactNume} onChange={handleChange} error={errors.contactNume} />
        <FormField id="contactPrenume" label="Prenume" placeholder="Ion" required value={form.contactPrenume} onChange={handleChange} error={errors.contactPrenume} />
      </div>
      <FormField id="contactEmail" label="Email" type="email" placeholder="email@firma.ro" required value={form.contactEmail} onChange={handleChange} error={errors.contactEmail} />
      <FormField id="contactTelefon" label="Telefon" type="tel" placeholder="0700 000 000" required value={form.contactTelefon} onChange={handleChange} error={errors.contactTelefon} />
      <div className="form-row">
        <FormField id="password" label="Parolă" type="password" placeholder="Minim 6 caractere" required value={form.password} onChange={handleChange} error={errors.password} />
        <FormField id="passwordConfirm" label="Confirmă parola" type="password" placeholder="Repetă parola" required value={form.passwordConfirm} onChange={handleChange} error={errors.passwordConfirm} />
      </div>
    </div>,

    // Step 2: Date suplimentare
    <div key={2}>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6, background: 'var(--blue-bg)', padding: '10px 14px', borderRadius: 8 }}>
        Informații opționale — pot fi completate și mai târziu din profilul firmei.
      </p>
      <div className="form-row">
        <FormField id="iban" label="IBAN" placeholder="RO49BTRL..." value={form.iban} onChange={handleChange} error={errors.iban} />
        <FormField id="banca" label="Bancă" placeholder="Banca Transilvania" value={form.banca} onChange={handleChange} error={errors.banca} />
      </div>
      <FormField id="emailDocumente" label="Email primire facturi/documente" type="email" placeholder="facturi@firma.ro" value={form.emailDocumente} onChange={handleChange} error={errors.emailDocumente} />
      <FormField id="adresaLivrare" label="Adresă livrare" type="textarea" placeholder="Adresa punctului de livrare (dacă diferă de sediu)" value={form.adresaLivrare} onChange={handleChange} error={errors.adresaLivrare} />
      <FormField id="programLivrare" label="Program livrare" placeholder="Luni-Vineri 09:00-17:00" value={form.programLivrare} onChange={handleChange} error={errors.programLivrare} />
    </div>,

    // Step 3: Confirmare
    <div key={3}>
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>Rezumat înregistrare</div>
        {[
          ['Firmă', form.name], ['CUI', form.cui], ['Reg. Com.', form.regCom],
          ['Adresă', `${form.adresa}, ${form.localitate}, ${form.judet}`],
          ['Contact', `${form.contactNume} ${form.contactPrenume}`],
          ['Email', form.contactEmail], ['Telefon', form.contactTelefon],
          ...(form.iban ? [['IBAN', form.iban]] : []),
          ...(form.banca ? [['Bancă', form.banca]] : []),
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', width: 100, flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{v || '—'}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--orange-text)' }}>
        ⏳ Contul va fi activat după verificarea datelor de către echipa Gixen (max. 24h).
      </div>
      {errors.general && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--red-text)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 8 }}>{errors.general}</div>}
    </div>
  ]

  return (
    <div className="login-page" style={{ minHeight: '100vh', alignItems: 'flex-start', paddingTop: 40 }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <GixenLogo color="#21376c" height={40} />
          <h1 style={{ fontSize: 20, marginTop: 16, marginBottom: 4 }}>Solicită acces portal</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Completează datele firmei pentru a crea contul</p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--bg3)',
                  color: i <= step ? '#fff' : 'var(--text3)',
                  border: '2px solid ' + (i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--border)')
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 10, color: i === step ? 'var(--blue)' : 'var(--text3)', marginTop: 4, textAlign: 'center' }}>{s}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: 2, flex: 1, background: i < step ? 'var(--green)' : 'var(--border)', marginTop: -18 }} />
              )}
            </div>
          ))}
        </div>

        <div className="card">
          {stepContent[step]}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {step > 0
              ? <button className="btn btn-secondary" onClick={prev}>← Înapoi</button>
              : <a href="/login" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', alignSelf: 'center' }}>← Login</a>
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
