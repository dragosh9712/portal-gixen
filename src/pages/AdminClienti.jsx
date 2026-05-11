import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { statusBadge } from '../utils'

function Toast({ msg, type, onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

export default function AdminClienti() {
  const { db, approveFirm, rejectFirm, updateFirm, setClientPricing } = useStore()
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('info') // info | preturi
  const [editForm, setEditForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [filterStatus, setFilterStatus] = useState('toate')

  const firms = db.firms.filter(f =>
    filterStatus === 'toate' || f.status === filterStatus
  )

  function openClient(firm) {
    setSelected(firm)
    setEditForm({ ...firm })
    setTab('info')
  }

  function handleSave() {
    updateFirm(selected.id, editForm)
    showToast('Date salvate!', 'success')
    setSelected(null)
  }

  function handleApprove(firmId) {
    approveFirm(firmId)
    showToast('Client aprobat!', 'success')
    setSelected(null)
  }

  function handleReject(firmId) {
    rejectFirm(firmId)
    showToast('Client respins.', 'error')
    setSelected(null)
  }

  function showToast(msg, type) {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const clientOrders = selected
    ? db.orders.filter(o => o.firmId === selected.id)
    : []

  return (
    <Layout title="Gestiune clienți">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="toate">Toate statusurile</option>
            <option value="activ">Activi</option>
            <option value="in_aprobare">În aprobare</option>
            <option value="respinsa">Respinși</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Firmă</th><th>CUI</th><th>Email</th><th>Discount global</th>
                <th>Comenzi</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {firms.map(firm => {
                const user = db.users.find(u => u.firmId === firm.id)
                const orderCount = db.orders.filter(o => o.firmId === firm.id).length
                return (
                  <tr key={firm.id} style={{ cursor: 'pointer' }} onClick={() => openClient(firm)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{firm.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user?.name}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{firm.cui}</td>
                    <td style={{ fontSize: 12 }}>{firm.email}</td>
                    <td>
                      <span style={{ color: 'var(--green)', fontWeight: 500 }}>{firm.discountGlobal || 0}%</span>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{orderCount}</td>
                    <td>{statusBadge(firm.status === 'activ' ? 'activ' : firm.status)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {firm.status === 'in_aprobare' && (
                        <div className="flex gap-8">
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(firm.id)}>✓ Aprobă</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReject(firm.id)}>✗</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client modal */}
      {selected && editForm && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '0.5px solid var(--border)', paddingBottom: 8 }}>
              {['info', 'preturi', 'comenzi'].map(t => (
                <button
                  key={t}
                  className="btn btn-sm"
                  style={{ background: tab === t ? 'var(--blue-bg)' : 'var(--bg)', color: tab === t ? 'var(--blue-text)' : 'var(--text2)' }}
                  onClick={() => setTab(t)}
                >
                  {t === 'info' ? 'Date firmă' : t === 'preturi' ? 'Prețuri & discounturi' : 'Comenzi'}
                </button>
              ))}
            </div>

            {tab === 'info' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Denumire</label>
                    <input className="w-full" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>CUI</label>
                    <input className="w-full" value={editForm.cui} onChange={e => setEditForm({ ...editForm, cui: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reg. Com.</label>
                    <input className="w-full" value={editForm.regCom} onChange={e => setEditForm({ ...editForm, regCom: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Discount global (%)</label>
                    <input type="number" className="w-full" min={0} max={50}
                      value={editForm.discountGlobal || 0}
                      onChange={e => setEditForm({ ...editForm, discountGlobal: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Adresă</label>
                  <input className="w-full" value={editForm.adresa} onChange={e => setEditForm({ ...editForm, adresa: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input className="w-full" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <input className="w-full" value={editForm.telefon} onChange={e => setEditForm({ ...editForm, telefon: e.target.value })} />
                  </div>
                </div>
                {selected.status === 'in_aprobare' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 12, background: 'var(--orange-bg)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13 }}>Cont în așteptarea aprobării</span>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(selected.id)}>✓ Aprobă</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(selected.id)}>✗ Respinge</button>
                  </div>
                )}
              </>
            )}

            {tab === 'preturi' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  Discount extra per produs (peste tier pricing și discount global)
                </div>
                <table>
                  <thead><tr><th>Produs</th><th>Discount extra (%)</th></tr></thead>
                  <tbody>
                    {db.products.filter(p => p.activ).map(p => {
                      const cp = db.clientPricing.find(c => c.firmId === selected.id && c.productId === p.id)
                      return (
                        <tr key={p.id}>
                          <td style={{ fontSize: 12 }}>{p.name}</td>
                          <td>
                            <input
                              type="number" min={0} max={50}
                              style={{ width: 80 }}
                              defaultValue={cp?.discountExtra || 0}
                              onBlur={e => setClientPricing(selected.id, p.id, parseInt(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'comenzi' && (
              <>
                {clientOrders.length === 0
                  ? <div className="empty-state">Nicio comandă</div>
                  : (
                    <table>
                      <thead><tr><th>Nr.</th><th>Data</th><th>Valoare</th><th>Status</th></tr></thead>
                      <tbody>
                        {clientOrders.map(o => (
                          <tr key={o.id}>
                            <td><b>{o.nr}</b></td>
                            <td style={{ fontSize: 12 }}>{o.dataComanda}</td>
                            <td>{(o.total).toFixed(2)} lei</td>
                            <td>{statusBadge(o.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Anulează</button>
              {tab === 'info' && (
                <button className="btn btn-primary" onClick={handleSave}>Salvează</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
