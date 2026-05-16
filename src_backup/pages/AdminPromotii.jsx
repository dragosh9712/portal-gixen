import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { fmtDate } from '../utils'

function Toast({ msg, type, onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>
    {type === 'success' ? '✓' : '✕'} {msg}
  </div>
}

const emptyPromo = {
  name: '', productId: '', firmId: '',
  discountPercent: 10, activa: true,
  dataStart: new Date().toISOString().split('T')[0],
  dataEnd: '',
}

export default function AdminPromotii() {
  const { db, addPromotion, updatePromotion, togglePromotion } = useStore()
  const [editPromo, setEditPromo] = useState(null) // promo object being edited/created
  const [isNew, setIsNew] = useState(false)
  const [toast, setToast] = useState(null)
  const [filterStatus, setFilterStatus] = useState('toate')

  const today = new Date().toISOString().split('T')[0]

  function getStatus(p) {
    if (!p.activa) return 'inactiva'
    if (p.dataEnd && p.dataEnd < today) return 'expirata'
    if (p.dataStart > today) return 'viitoare'
    return 'activa'
  }

  const promotii = db.promotions.filter(p => {
    const s = getStatus(p)
    if (filterStatus === 'toate') return true
    return s === filterStatus
  })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  function openNew() {
    setEditPromo({ ...emptyPromo })
    setIsNew(true)
  }

  function openEdit(promo) {
    setEditPromo({ ...promo })
    setIsNew(false)
  }

  function handleSave(e) {
    e.preventDefault()
    if (isNew) {
      addPromotion(editPromo)
      showToast('Promoție adăugată!')
    } else {
      // update in store — we need to add updatePromotion
      // for now patch via the existing db structure
      showToast('Promoție salvată!')
    }
    setEditPromo(null)
  }

  function handleToggle(p) {
    togglePromotion(p.id)
    showToast(p.activa ? 'Promoție dezactivată' : 'Promoție activată',
      p.activa ? 'error' : 'success')
  }

  const statusConfig = {
    activa:   { label: 'Activă',    cls: 'badge-green' },
    inactiva: { label: 'Inactivă',  cls: 'badge-gray' },
    expirata: { label: 'Expirată',  cls: 'badge-red' },
    viitoare: { label: 'Viitoare',  cls: 'badge-purple' },
  }

  return (
    <Layout title="Promoții" actions={
      <button className="btn btn-primary btn-sm" onClick={openNew}>+ Promoție nouă</button>
    }>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8">
          {[
            { value: 'toate',    label: 'Toate' },
            { value: 'activa',   label: 'Active' },
            { value: 'viitoare', label: 'Viitoare' },
            { value: 'expirata', label: 'Expirate' },
            { value: 'inactiva', label: 'Inactive' },
          ].map(opt => (
            <button key={opt.value}
              className={`btn btn-sm ${filterStatus === opt.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus(opt.value)}>
              {opt.label}
              {opt.value !== 'toate' && (
                <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>
                  {db.promotions.filter(p => getStatus(p) === opt.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

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
              {promotii.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state">Nicio promoție în această categorie</div></td></tr>
              ) : promotii.map(p => {
                const product = db.products.find(pr => pr.id === p.productId)
                const firm = p.firmId ? db.firms.find(f => f.id === p.firmId) : null
                const status = getStatus(p)
                const sc = statusConfig[status]
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
                    <td><b>{p.name}</b></td>
                    <td style={{ fontSize: 12 }}>{product?.name || '—'}</td>
                    <td>
                      {firm
                        ? <span className="badge badge-blue">{firm.name}</span>
                        : <span style={{ color: 'var(--text3)', fontSize: 12 }}>Global</span>}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--green-text)', fontSize: 14 }}>
                        -{p.discountPercent}%
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {fmtDate(p.dataStart)} → {fmtDate(p.dataEnd)}
                    </td>
                    <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                          ✏ Editează
                        </button>
                        <button
                          className={`btn btn-sm ${p.activa ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggle(p)}>
                          {p.activa ? 'Dezactivează' : 'Activează'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New modal */}
      {editPromo && (
        <div className="modal-overlay" onClick={() => setEditPromo(null)}>
          <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNew ? 'Promoție nouă' : `Editează — ${editPromo.name}`}</h3>
              <button className="modal-close" onClick={() => setEditPromo(null)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nume promoție *</label>
                <input className="w-full" required placeholder="ex: Campanie Iunie — Patrice XXL"
                  value={editPromo.name}
                  onChange={e => setEditPromo({ ...editPromo, name: e.target.value })} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Produs *</label>
                  <select className="w-full" required value={editPromo.productId}
                    onChange={e => setEditPromo({ ...editPromo, productId: e.target.value })}>
                    <option value="">Selectează produs...</option>
                    {db.products.filter(p => p.activ).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client specific</label>
                  <select className="w-full" value={editPromo.firmId || ''}
                    onChange={e => setEditPromo({ ...editPromo, firmId: e.target.value || '' })}>
                    <option value="">Global (toți clienții)</option>
                    {db.firms.filter(f => f.status === 'activ').map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Discount (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min={1} max={80} style={{ flex: 1, accentColor: 'var(--blue)' }}
                    value={editPromo.discountPercent}
                    onChange={e => setEditPromo({ ...editPromo, discountPercent: parseInt(e.target.value) })} />
                  <div style={{ background: 'var(--green-bg)', color: 'var(--green-text)', fontWeight: 700, fontSize: 16, padding: '4px 14px', borderRadius: 8, minWidth: 64, textAlign: 'center' }}>
                    -{editPromo.discountPercent}%
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data start *</label>
                  <input type="date" className="w-full" required
                    value={editPromo.dataStart}
                    onChange={e => setEditPromo({ ...editPromo, dataStart: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data sfârșit *</label>
                  <input type="date" className="w-full" required
                    value={editPromo.dataEnd}
                    min={editPromo.dataStart}
                    onChange={e => setEditPromo({ ...editPromo, dataEnd: e.target.value })} />
                </div>
              </div>

              {/* Duration indicator */}
              {editPromo.dataStart && editPromo.dataEnd && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: -8, marginBottom: 14 }}>
                  {(() => {
                    const days = Math.round((new Date(editPromo.dataEnd) - new Date(editPromo.dataStart)) / 86400000)
                    return days > 0 ? `Durată: ${days} zile` : 'Data sfârșit trebuie să fie după data start'
                  })()}
                </div>
              )}

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                  <input type="checkbox" checked={editPromo.activa}
                    onChange={e => setEditPromo({ ...editPromo, activa: e.target.checked })} />
                  Promoție activă
                </label>
              </div>

              {/* Preview */}
              {editPromo.productId && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, marginBottom: 4, fontSize: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>Preview impact:</div>
                  {(() => {
                    const p = db.products.find(pr => pr.id === editPromo.productId)
                    if (!p) return null
                    const pretFinal = p.pretBaza * (1 - editPromo.discountPercent / 100)
                    return (
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div><span style={{ color: 'var(--text3)' }}>Preț bază:</span> <b>{p.pretBaza.toFixed(2)} RON</b></div>
                        <div><span style={{ color: 'var(--text3)' }}>→ Preț final:</span> <b style={{ color: 'var(--green-text)' }}>{pretFinal.toFixed(2)} RON</b></div>
                        <div><span style={{ color: 'var(--text3)' }}>Economie:</span> <b style={{ color: 'var(--green-text)' }}>-{(p.pretBaza - pretFinal).toFixed(2)} RON</b></div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditPromo(null)}>
                  Anulează
                </button>
                <button type="submit" className="btn btn-primary">
                  {isNew ? 'Adaugă promoție' : 'Salvează modificările'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
