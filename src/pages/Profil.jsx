import { useState } from 'react'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { statusBadge, fmtDate, getInitials } from '../utils'
import api from '../api'

function Toast({ msg, type = 'success', onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

export default function Profil() {
  const { user } = useAuth()
  const { db, updateFirm, addDelegate, updateDelegate, deactivateDelegate, generateOnboardingToken, getSurveyResult } = useStore()
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('firma')
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [addDelegateModal, setAddDelegateModal] = useState(false)
  const [delegateForm, setDelegateForm] = useState({ name: '', email: '', password: '', can_place_orders: true })
  const [delegateErrors, setDelegateErrors] = useState({})

  const firm = (db.firms || []).find(f => f.id === user.firmId)
  const delegates = (db.users || []).filter(u => u.firmId === user.firmId && u.id !== user.id && u.status !== 'inactive')
  const surveyResult = getSurveyResult(user.firmId)
  const isPrimary = user.delegate_type === 'primary' || user.role === 'admin'

  const [form, setForm] = useState({
    name: firm?.name || '', cui: firm?.cui || '', regCom: firm?.regCom || '',
    adresa: firm?.adresa || '', telefon: firm?.telefon || '', email: firm?.email || '',
    iban: firm?.iban || '', banca: firm?.banca || '', site_web: firm?.site_web || '',
    email_documente: firm?.email_documente || '', program_livrare: firm?.program_livrare || '',
    adresa_livrare: firm?.adresa_livrare || '', default_transport_type: firm?.default_transport_type || 'Van',
  })

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  function handleSave(e) {
    e.preventDefault()
    updateFirm(user.firmId, form)
    showToast('Datele au fost salvate!')
  }

  function handleAddDelegate() {
    const e = {}
    if (!delegateForm.name.trim()) e.name = 'Obligatoriu'
    if (!delegateForm.email.trim()) e.email = 'Obligatoriu'
    else if (!/\S+@\S+\.\S+/.test(delegateForm.email)) e.email = 'Email invalid'
    if (!delegateForm.password || delegateForm.password.length < 6) e.password = 'Minim 6 caractere'
    if (Object.keys(e).length) { setDelegateErrors(e); return }
    addDelegate(user.firmId, delegateForm)
    setAddDelegateModal(false)
    setDelegateForm({ name: '', email: '', password: '', can_place_orders: true })
    setDelegateErrors({})
    showToast('Delegat adăugat cu succes!')
  }

  function handleGenerateLink(userId) {
    const token = generateOnboardingToken(userId)
    const link = `${window.location.origin}/onboarding?token=${token}`
    navigator.clipboard?.writeText(link)
    showToast('Link copiat în clipboard!')
  }

  const TABS = [
    { id: 'firma', label: 'Date firmă' },
    { id: 'livrare', label: 'Livrare & contact' },
    { id: 'delegati', label: `Delegați (${delegates.length})` },
    { id: 'parola', label: 'Schimbă parola' },
    ...(surveyResult ? [{ id: 'survey', label: 'Profil completat' }] : []),
  ]

  return (
    <Layout title="Profil firmă" subtitle={firm?.name}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent', color: tab === t.id ? 'var(--blue)' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 640 }}>
        {/* Date firmă */}
        {tab === 'firma' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Date juridice</div>
            <div className="form-group">
              <label>Denumire firmă</label>
              <input type="text" className="w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} readOnly={!isPrimary} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>CUI</label>
                <input type="text" className="w-full" value={form.cui} onChange={e => setForm(p => ({ ...p, cui: e.target.value }))} readOnly={!isPrimary} />
              </div>
              <div className="form-group">
                <label>Nr. Reg. Comerțului</label>
                <input type="text" className="w-full" value={form.regCom} onChange={e => setForm(p => ({ ...p, regCom: e.target.value }))} readOnly={!isPrimary} />
              </div>
            </div>
            <div className="form-group">
              <label>Adresă sediu</label>
              <input type="text" className="w-full" value={form.adresa} onChange={e => setForm(p => ({ ...p, adresa: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Telefon</label>
                <input type="tel" className="w-full" value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="w-full" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Site web</label>
              <input type="text" className="w-full" value={form.site_web} onChange={e => setForm(p => ({ ...p, site_web: e.target.value }))} placeholder="www.firma.ro" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>IBAN</label>
                <input type="text" className="w-full" value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} placeholder="RO49BTRL..." />
              </div>
              <div className="form-group">
                <label>Bancă</label>
                <input type="text" className="w-full" value={form.banca} onChange={e => setForm(p => ({ ...p, banca: e.target.value }))} placeholder="Banca Transilvania" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>Salvează modificările</button>
          </div>
        )}

        {/* Livrare & contact */}
        {tab === 'livrare' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Informații livrare</div>
            <div className="form-group">
              <label>Adresă de livrare</label>
              <textarea className="w-full" rows={3} value={form.adresa_livrare} onChange={e => setForm(p => ({ ...p, adresa_livrare: e.target.value }))} placeholder="Adresa punct de livrare" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Program livrare</label>
                <input type="text" className="w-full" value={form.program_livrare} onChange={e => setForm(p => ({ ...p, program_livrare: e.target.value }))} placeholder="Luni-Vineri 09:00-17:00" />
              </div>
              <div className="form-group">
                <label>Transport preferat</label>
                <select className="w-full" value={form.default_transport_type} onChange={e => setForm(p => ({ ...p, default_transport_type: e.target.value }))}>
                  <option value="Van">Duba (Van)</option>
                  <option value="Truck">TIR (Camion)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Email primire documente (facturi, avize)</label>
              <input type="email" className="w-full" value={form.email_documente} onChange={e => setForm(p => ({ ...p, email_documente: e.target.value }))} placeholder="facturi@firma.ro" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>Salvează</button>
          </div>
        )}
      </form>

      {/* Delegați tab */}
      {tab === 'delegati' && (
        <div style={{ maxWidth: 640 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="section-title">Utilizatori cont</div>
              {isPrimary && (
                <button className="btn btn-primary btn-sm" onClick={() => setAddDelegateModal(true)}>+ Adaugă delegat</button>
              )}
            </div>

            {/* Current user */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--blue-bg)', borderRadius: 8, marginBottom: 10, border: '1px solid rgba(37,99,235,0.1)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{getInitials(user.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name} <span style={{ fontSize: 11, color: 'var(--blue-text)' }}>(tu)</span></div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user.email}</div>
              </div>
              {statusBadge(user.delegate_type)}
            </div>

            {/* Other users */}
            {delegates.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{getInitials(u.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: u.can_place_orders ? 'var(--green-text)' : 'var(--text3)', marginTop: 2 }}>
                    {u.can_place_orders ? '✓ Poate plasa comenzi' : '✗ Vizualizare doar'}
                  </div>
                </div>
                {statusBadge(u.delegate_type)}
                {isPrimary && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateLink(u.id)}>🔗 Link acces</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { deactivateDelegate(u.id); showToast('Delegat dezactivat') }}>Dezactivează</button>
                  </div>
                )}
              </div>
            ))}

            {delegates.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nu există alți utilizatori pe acest cont.</div>
            )}
          </div>
        </div>
      )}

      {/* Password change tab */}
      {tab === 'parola' && (
        <div className="card" style={{ maxWidth: 420 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>Schimbă parola</div>
          <div className="form-group">
            <label>Parola actuală</label>
            <input type="password" className="w-full" value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Parola nouă</label>
            <input type="password" className="w-full" value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="Minim 6 caractere" />
          </div>
          <div className="form-group">
            <label>Confirmă parola nouă</label>
            <input type="password" className="w-full" value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={async () => {
            if (!pwForm.current || !pwForm.newPw) return showToast('Completează toate câmpurile', 'error')
            if (pwForm.newPw !== pwForm.confirm) return showToast('Parolele noi nu coincid', 'error')
            if (pwForm.newPw.length < 6) return showToast('Parola trebuie să aibă minim 6 caractere', 'error')
            try {
              await api.auth.changePassword(pwForm.current, pwForm.newPw)
              setPwForm({ current: '', newPw: '', confirm: '' })
              showToast('Parola a fost schimbată cu succes!')
            } catch (err) {
              showToast(err.message || 'Eroare la schimbarea parolei', 'error')
            }
          }}>Schimbă parola</button>
        </div>
      )}

      {/* Survey results */}
      {tab === 'survey' && surveyResult && (
        <div style={{ maxWidth: 640 }}>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="section-title">Profil completat</div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Completat: {fmtDate(surveyResult.completed_at)}</span>
            </div>
            {Object.entries(surveyResult.answers || {}).map(([k, v]) => (
              v ? (
                <div key={k} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', width: 200, flexShrink: 0, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Add delegate modal */}
      {addDelegateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', padding: '28px 32px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Adaugă delegat</h3>
            <div className="form-group">
              <label>Nume complet *</label>
              <input type="text" className="w-full" value={delegateForm.name} onChange={e => setDelegateForm(p => ({ ...p, name: e.target.value }))} />
              {delegateErrors.name && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 3 }}>{delegateErrors.name}</div>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" className="w-full" value={delegateForm.email} onChange={e => setDelegateForm(p => ({ ...p, email: e.target.value }))} />
              {delegateErrors.email && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 3 }}>{delegateErrors.email}</div>}
            </div>
            <div className="form-group">
              <label>Parolă inițială *</label>
              <input type="password" className="w-full" value={delegateForm.password} onChange={e => setDelegateForm(p => ({ ...p, password: e.target.value }))} />
              {delegateErrors.password && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 3 }}>{delegateErrors.password}</div>}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={delegateForm.can_place_orders} onChange={e => setDelegateForm(p => ({ ...p, can_place_orders: e.target.checked }))} />
              <span style={{ fontSize: 13 }}>Poate plasa comenzi</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setAddDelegateModal(false); setDelegateErrors({}) }}>Anulează</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleAddDelegate}>Adaugă</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
