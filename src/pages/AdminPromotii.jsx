import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { fmtDate } from '../utils'

function Toast({ msg, type, onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

export default function AdminPromotii() {
  const { db, addPromotion, togglePromotion } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    name: '',
    productId: '',
    firmId: '',
    discountPercent: 10,
    activa: true,
    dataStart: new Date().toISOString().split('T')[0],
    dataEnd: '',
  })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  function handleAdd(e) {
    e.preventDefault()
    addPromotion(form)
    setShowNew(false)
    setForm({ name: '', productId: '', firmId: '', discountPercent: 10, activa: true, dataStart: new Date().toISOString().split('T')[0], dataEnd: '' })
    showToast('Promoție adăugată!')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout title="Promoții" actions={
      <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Promoție nouă</button>
    }>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nume promoție</th>
                <th>Produs</th>
                <th>Client specific</th>
                <th>Discount</th>
                <th>Perioadă</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {db.promotions.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state">Nicio promoție</div></td></tr>
              ) : db.promotions.map(p => {
                const product = db.products.find(pr => pr.id === p.productId)
                const firm = p.firmId ? db.firms.find(f => f.id === p.firmId) : null
                const expired = p.dataEnd && p.dataEnd < today
                return (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td style={{ fontSize: 12 }}>{product?.name || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {firm
                        ? <span className="badge badge-blue">{firm.name}</span>
                        : <span style={{ color: 'var(--text3)' }}>Global</span>
                      }
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--green-text)' }}>-{p.discountPercent}%</span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {fmtDate(p.dataStart)} → {fmtDate(p.dataEnd)}
                      {expired && <div style={{ fontSize: 10, color: 'var(--red-text)' }}>Expirată</div>}
                    </td>
                    <td>
                      <span className={`badge ${p.activa && !expired ? 'badge-green' : 'badge-gray'}`}>
                        {p.activa && !expired ? 'Activă' : expired ? 'Expirată' : 'Inactivă'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { togglePromotion(p.id); showToast(p.activa ? 'Promoție dezactivată' : 'Promoție activată') }}
                      >
                        {p.activa ? 'Dezactivează' : 'Activează'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New promo modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>Promoție nouă</h3>
              <button className="modal-close" onClick={() => setShowNew(false)}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Nume promoție *</label>
                <input className="w-full" required placeholder="ex: Campanie Iunie — Hartie Premium"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Produs *</label>
                  <select className="w-full" required value={form.productId}
                    onChange={e => setForm({ ...form, productId: e.target.value })}>
                    <option value="">Selectează produs</option>
                    {db.products.filter(p => p.activ).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client specific (opțional)</label>
                  <select className="w-full" value={form.firmId}
                    onChange={e => setForm({ ...form, firmId: e.target.value })}>
                    <option value="">Global (toți clienții)</option>
                    {db.firms.filter(f => f.status === 'activ').map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Discount (%)</label>
                <input type="number" className="w-full" min={1} max={80} required
                  value={form.discountPercent}
                  onChange={e => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data start *</label>
                  <input type="date" className="w-full" required
                    value={form.dataStart} onChange={e => setForm({ ...form, dataStart: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data sfârșit *</label>
                  <input type="date" className="w-full" required
                    value={form.dataEnd} onChange={e => setForm({ ...form, dataEnd: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Anulează</button>
                <button type="submit" className="btn btn-primary">Adaugă promoție</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
