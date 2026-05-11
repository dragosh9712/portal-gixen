import { useState } from 'react'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'

function Toast({ msg, onDone }) {
  return <div className="toast success" style={{ cursor: 'pointer' }} onClick={onDone}>{msg}</div>
}

export default function Profil() {
  const { user } = useAuth()
  const { db, updateFirm } = useStore()
  const [toast, setToast] = useState(null)

  const firm = db.firms.find(f => f.id === user.firmId)
  const [form, setForm] = useState({
    name: firm?.name || '',
    cui: firm?.cui || '',
    regCom: firm?.regCom || '',
    adresa: firm?.adresa || '',
    telefon: firm?.telefon || '',
    email: firm?.email || '',
  })

  function handleSave(e) {
    e.preventDefault()
    updateFirm(user.firmId, form)
    setToast('Datele au fost salvate!')
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <Layout title="Profil firmă">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <div style={{ maxWidth: 640 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{firm?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Cont {firm?.status === 'activ'
                  ? <span style={{ color: 'var(--green)' }}>activ</span>
                  : <span style={{ color: 'var(--orange-text)' }}>în aprobare</span>
                }
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              Discount global: <b style={{ color: 'var(--green)' }}>{firm?.discountGlobal || 0}%</b>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Date firmă</div>
            <div className="form-row">
              <div className="form-group">
                <label>Denumire societate *</label>
                <input className="w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>CUI *</label>
                <input className="w-full" value={form.cui} onChange={e => setForm({ ...form, cui: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nr. Reg. Com. *</label>
                <input className="w-full" value={form.regCom} onChange={e => setForm({ ...form, regCom: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <input className="w-full" value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Adresă livrare *</label>
              <input className="w-full" value={form.adresa} onChange={e => setForm({ ...form, adresa: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email factură</label>
              <input type="email" className="w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Persoană de contact</div>
            <div className="form-row">
              <div className="form-group">
                <label>Nume delegat</label>
                <input className="w-full" value={user.name} readOnly style={{ background: 'var(--bg)' }} />
              </div>
              <div className="form-group">
                <label>Email cont</label>
                <input className="w-full" value={user.email} readOnly style={{ background: 'var(--bg)' }} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Pentru modificarea numelui sau email-ului, contactează administratorul Gixen.
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Securitate</div>
            <button type="button" className="btn btn-secondary">
              🔒 Schimbă parola
            </button>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
              Funcționalitate disponibilă în versiunea de producție.
            </div>
          </div>

          <div className="flex gap-8">
            <button type="submit" className="btn btn-primary">Salvează modificările</button>
            <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
              Anulează
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
