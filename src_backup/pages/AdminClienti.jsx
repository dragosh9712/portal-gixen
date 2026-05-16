import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { statusBadge, lei, fmtDate } from '../utils'

function Toast({ msg, type, onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

export default function AdminClienti() {
  const { db, approveFirm, rejectFirm, updateFirm, setClientPricing } = useStore()
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('info')
  const [editForm, setEditForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [filterStatus, setFilterStatus] = useState('toate')

  const firms = db.firms.filter(f => filterStatus === 'toate' || f.status === filterStatus)
  const allMarci = [...new Set(db.products.map(p => p.marca).filter(Boolean))]

  function openClient(firm) {
    setSelected(firm)
    setEditForm({ ...firm, marciPermise: firm.marciPermise || [], grupClient: firm.grupClient || 'standard' })
    setTab('info')
  }

  function handleSave() {
    updateFirm(selected.id, editForm)
    showToast('Date salvate!', 'success')
    setSelected({ ...selected, ...editForm })
  }

  function handleApprove(firmId) { approveFirm(firmId); showToast('Client aprobat!', 'success'); setSelected(null) }
  function handleReject(firmId)  { rejectFirm(firmId);  showToast('Client respins.', 'error');  setSelected(null) }

  function toggleMarca(marca) {
    const prev = editForm.marciPermise || []
    setEditForm({
      ...editForm,
      marciPermise: prev.includes(marca) ? prev.filter(m => m !== marca) : [...prev, marca]
    })
  }

  function showToast(msg, type) { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  const clientOrders = selected ? db.orders.filter(o => o.firmId === selected.id) : []

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
                <th>Firmă</th><th>CUI</th><th>Email</th>
                <th>Grup</th><th>Mărci permise</th>
                <th>Disc. global</th><th>Comenzi</th><th>Status</th><th></th>
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
                      <span className={`badge ${firm.grupClient === 'platinum' ? 'badge-purple' : firm.grupClient === 'gold' ? 'badge-orange' : 'badge-gray'}`}>
                        {firm.grupClient || 'standard'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(firm.marciPermise || []).map(m => (
                          <span key={m} style={{ fontSize: 10, background: 'var(--blue-bg)', color: 'var(--blue-text)', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{m}</span>
                        ))}
                        {!(firm.marciPermise?.length) && <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
                      </div>
                    </td>
                    <td><span style={{ color: 'var(--green)', fontWeight: 500 }}>{firm.discountGlobal || 0}%</span></td>
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

      {/* Modal client */}
      {selected && editForm && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              {[['info','Date firmă'], ['preturi','Prețuri & discounturi'], ['comenzi','Comenzi']].map(([t, l]) => (
                <button key={t} className="btn btn-sm"
                  style={{ background: tab === t ? 'var(--blue-bg)' : 'var(--bg)', color: tab === t ? 'var(--blue-text)' : 'var(--text2)', fontWeight: tab === t ? 600 : 400 }}
                  onClick={() => setTab(t)}>{l}</button>
              ))}
            </div>

            {/* ── TAB: Date firmă ── */}
            {tab === 'info' && (
              <>
                {selected.status === 'in_aprobare' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 12, background: 'var(--orange-bg)', borderRadius: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, flex: 1 }}>⏳ Cont în așteptarea aprobării</span>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(selected.id)}>✓ Aprobă</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(selected.id)}>✗ Respinge</button>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Denumire</label>
                    <input className="w-full" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>CUI</label>
                    <input className="w-full" value={editForm.cui || ''} onChange={e => setEditForm({ ...editForm, cui: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reg. Com.</label>
                    <input className="w-full" value={editForm.regCom || ''} onChange={e => setEditForm({ ...editForm, regCom: e.target.value })} />
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
                  <input className="w-full" value={editForm.adresa || ''} onChange={e => setEditForm({ ...editForm, adresa: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input className="w-full" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <input className="w-full" value={editForm.telefon || ''} onChange={e => setEditForm({ ...editForm, telefon: e.target.value })} />
                  </div>
                </div>

                <div className="divider" />

                {/* Grup client */}
                <div className="form-group">
                  <label>Grup client</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['standard', 'gold', 'platinum'].map(g => (
                      <button key={g} type="button"
                        onClick={() => setEditForm({ ...editForm, grupClient: g })}
                        className="btn btn-sm"
                        style={{
                          background: editForm.grupClient === g
                            ? (g === 'platinum' ? 'var(--purple-bg)' : g === 'gold' ? 'var(--orange-bg)' : 'var(--blue-bg)')
                            : 'var(--bg)',
                          color: editForm.grupClient === g
                            ? (g === 'platinum' ? 'var(--purple-text)' : g === 'gold' ? 'var(--orange-text)' : 'var(--blue-text)')
                            : 'var(--text2)',
                          border: '1px solid var(--border)',
                          fontWeight: editForm.grupClient === g ? 700 : 400,
                          textTransform: 'capitalize',
                        }}>
                        {g === 'gold' ? '⭐ Gold' : g === 'platinum' ? '💎 Platinum' : '👤 Standard'}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    Grupul activează regulile de promoție configurate pentru acel grup
                  </div>
                </div>

                {/* Mărci permise */}
                <div className="form-group">
                  <label>Mărci permise</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {allMarci.map(marca => {
                      const active = (editForm.marciPermise || []).includes(marca)
                      return (
                        <label key={marca} onClick={() => toggleMarca(marca)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            background: active ? 'var(--blue-bg)' : 'var(--bg)',
                            border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                            borderRadius: 8, padding: '6px 14px', fontSize: 13,
                            color: active ? 'var(--blue-text)' : 'var(--text2)',
                            fontWeight: active ? 600 : 400,
                            transition: 'all 0.15s',
                            userSelect: 'none',
                          }}>
                          <input type="checkbox" checked={active} onChange={() => {}} style={{ accentColor: 'var(--blue)' }} />
                          {marca}
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                    Clientul vede în portal <b>doar produsele din mărcile bifate</b>.
                    {editForm.marciPermise?.length > 0 && (
                      <span style={{ color: 'var(--blue-text)' }}> Selectate: {editForm.marciPermise.join(', ')}</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: Prețuri & discounturi ── */}
            {tab === 'preturi' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 8 }}>
                  Discount extra per produs — se aplică peste tier pricing și discount global.
                  Completează 0 pentru a elimina discountul.
                </div>
                <table>
                  <thead>
                    <tr><th>Produs</th><th>Marcă</th><th>Preț bază</th><th>Disc. extra (%)</th><th>Preț final</th></tr>
                  </thead>
                  <tbody>
                    {db.products.filter(p => p.activ).map(p => {
                      const cp = db.clientPricing.find(c => c.firmId === selected.id && c.productId === p.id)
                      const disc = cp?.discountExtra || 0
                      const pretFinal = p.pretBaza * (1 - disc / 100) * (1 - (selected.discountGlobal || 0) / 100)
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {p.imagine && <img src={p.imagine} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
                              <span style={{ fontSize: 12 }}>{p.name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.marca}</td>
                          <td style={{ fontSize: 12 }}>{lei(p.pretBaza)}</td>
                          <td>
                            <input type="number" min={0} max={50} style={{ width: 70, textAlign: 'center', fontSize: 12 }}
                              defaultValue={disc}
                              onBlur={e => setClientPricing(selected.id, p.id, parseInt(e.target.value) || 0)} />
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 600, color: disc > 0 ? 'var(--green-text)' : 'var(--text)' }}>
                            {lei(pretFinal)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* ── TAB: Comenzi ── */}
            {tab === 'comenzi' && (
              clientOrders.length === 0
                ? <div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-title">Nicio comandă</div></div>
                : (
                  <table>
                    <thead><tr><th>Nr.</th><th>Data</th><th>Valoare</th><th>Status</th></tr></thead>
                    <tbody>
                      {clientOrders.map(o => (
                        <tr key={o.id}>
                          <td><b>{o.nr}</b></td>
                          <td style={{ fontSize: 12 }}>{fmtDate(o.dataComanda)}</td>
                          <td>{lei(o.total)}</td>
                          <td>{statusBadge(o.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Anulează</button>
              {tab !== 'comenzi' && (
                <button className="btn btn-primary" onClick={handleSave}>Salvează</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
