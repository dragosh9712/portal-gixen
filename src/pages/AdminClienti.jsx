import { useState, useCallback } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { statusBadge, lei, fmtDate, fmtDateTime, getInitials } from '../utils'
import api from '../api'

function Toast({ msg, type, onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

export default function AdminClienti() {
  const {
    db, approveFirm, rejectFirm, updateFirm,
    setClientPricing, addDelegate, updateDelegate, deactivateDelegate,
    generateOnboardingToken, syncClientsFromSelectSoft,
    createClientInSelectSoft, syncCreditFromSelectSoft, getSurveyResult,
    saveCommissionRule, addDeliveryLocation, removeDeliveryLocation
  } = useStore()

  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('info')
  const [editForm, setEditForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [filterStatus, setFilterStatus] = useState('toate')
  const [filterAgent, setFilterAgent] = useState('toate')
  const [search, setSearch] = useState('')
  const [addDelegateOpen, setAddDelegateOpen] = useState(false)
  const [delegateForm, setDelegateForm] = useState({ name: '', email: '', password: 'welcome123', can_place_orders: true })
  const [creditEditMode, setCreditEditMode] = useState(false)
  const [creditForm, setCreditForm] = useState({})
  const [creditData, setCreditData] = useState(null)
  const [resetPwModal, setResetPwModal] = useState(null)
  const [resetPwInput, setResetPwInput] = useState('')
  const [clientNotes, setClientNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [ssSyncing, setSsSyncing] = useState(false)
  const [ssResult, setSsResult] = useState(null)

  const firms = (db.firms || []).filter(f => {
    const matchStatus = filterStatus === 'toate' || f.status === filterStatus
    const matchAgent = filterAgent === 'toate' || f.agent_id === filterAgent
    const q = search.toLowerCase()
    return matchStatus && matchAgent && (!q || f.name.toLowerCase().includes(q) || (f.cui || '').includes(q) || (f.email || '').toLowerCase().includes(q))
  })

  const agents = db.agents || []
  const allMarci = [...new Set((db.products || []).map(p => p.marca).filter(Boolean))]

  async function openClient(firm) {
    setSelected(firm)
    setEditForm({ ...firm })
    setTab('info')
    setCreditEditMode(false)
    setCreditData(null)
    setClientNotes([])
    setNewNote('')
    api.customers.notes(firm.id).then(n => setClientNotes(n || [])).catch(() => {})
    try {
      const cl = await api.customers.credit(firm.id)
      setCreditData(cl)
      setCreditForm(cl ? { ...cl } : { credit_limit: 0, limit_currency: firm.currency || 'RON', notification_threshold_pct: 80, block_on_exceed: false })
    } catch {
      setCreditForm({ credit_limit: 0, limit_currency: firm.currency || 'RON', notification_threshold_pct: 80, block_on_exceed: false })
    }
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  function handleSave() {
    updateFirm(selected.id, editForm)
    setSelected({ ...selected, ...editForm })
    showToast('Date salvate!')
  }

  function handleApprove(firmId) { approveFirm(firmId); showToast('Client aprobat!'); setSelected(null) }
  function handleReject(firmId) { rejectFirm(firmId); showToast('Client respins.', 'error'); setSelected(null) }

  function toggleMarca(marca) {
    const prev = editForm.allowed_brands ? (Array.isArray(editForm.allowed_brands) ? editForm.allowed_brands : JSON.parse(editForm.allowed_brands || '[]')) : []
    setEditForm({ ...editForm, allowed_brands: prev.includes(marca) ? prev.filter(m => m !== marca) : [...prev, marca] })
  }

  function handleAddDelegate() {
    addDelegate(selected.id, delegateForm)
    setAddDelegateOpen(false)
    setDelegateForm({ name: '', email: '', password: 'welcome123', can_place_orders: true })
    showToast('Delegat adăugat!')
  }

  function handleGenerateLink(userId) {
    const token = generateOnboardingToken(userId)
    const link = `${window.location.origin}/onboarding?token=${token}`
    navigator.clipboard?.writeText(link)
    showToast('Link copiat!')
  }

  async function handleSaveCreditLimit() {
    if (!selected) return
    const payload = {
      credit_limit: parseFloat(creditForm.credit_limit) || 0,
      limit_currency: creditForm.limit_currency || 'RON',
      notification_threshold_pct: parseInt(creditForm.notification_threshold_pct) || 80,
      block_on_exceed: creditForm.block_on_exceed || false,
    }
    try {
      await api.credit.update(selected.id, payload)
      const updated = { ...payload, used_credit: creditData?.used_credit || 0, available_credit: Math.max(0, payload.credit_limit - (creditData?.used_credit || 0)) }
      setCreditData(updated)
      setCreditForm(updated)
      setCreditEditMode(false)
      showToast('Limită credit salvată!')
    } catch (err) {
      showToast(err.message || 'Eroare la salvare', 'error')
    }
  }

  const clientDelegates = selected ? (db.users || []).filter(u => u.firmId === selected.id && u.status !== 'inactive') : []
  const clientOrders = selected ? (db.orders || []).filter(o => o.firmId === selected.id) : []
  const creditLimit = creditData
  const clientPricing = selected ? (db.clientPricing || []).filter(c => c.firmId === selected.id) : []
  const surveyResult = selected ? getSurveyResult(selected.id) : null
  const creditPct = creditLimit?.credit_limit > 0 ? Math.round((creditLimit.used_credit / creditLimit.credit_limit) * 100) : 0

  const TABS = [
    { id: 'info', label: 'Date firmă' },
    { id: 'delegati', label: `Delegați (${clientDelegates.length})` },
    { id: 'preturi', label: 'Prețuri' },
    { id: 'credit', label: '💳 Credit' },
    { id: 'livrare', label: `Locații (${(selected?.delivery_locations || []).length + 1})` },
    { id: 'comenzi', label: `Comenzi (${clientOrders.length})` },
    { id: 'survey', label: surveyResult ? '✓ Survey' : 'Survey' },
    { id: 'notite', label: `📝 Notițe (${clientNotes.length})` },
  ]

  async function handleAddClientNote() {
    if (!newNote.trim() || !selected) return
    setNoteSaving(true)
    try {
      await api.customers.addNote(selected.id, newNote.trim())
      const notes = await api.customers.notes(selected.id)
      setClientNotes(notes || [])
      setNewNote('')
      showToast('Notiță salvată!')
    } catch (err) {
      showToast(err.message || 'Eroare la salvare', 'error')
    } finally {
      setNoteSaving(false)
    }
  }

  async function handleDeleteClientNote(noteId) {
    try {
      await api.customers.delNote(selected.id, noteId)
      setClientNotes(prev => prev.filter(n => n.id !== noteId))
      showToast('Notiță ștearsă')
    } catch (err) {
      showToast(err.message || 'Eroare', 'error')
    }
  }

  return (
    <Layout title="Gestiune clienți" actions={
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" disabled={ssSyncing} onClick={async () => {
          setSsSyncing(true)
          try {
            const r = await api.selectsoft.syncCustomers()
            setSsResult(r)
          } catch (err) { setSsResult({ ok: false, error: err.message }) }
          finally { setSsSyncing(false) }
        }}>{ssSyncing ? '⏳ Sincronizare...' : '🔄 Sync Selectsoft'}</button>
      </div>
    }>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {ssResult && (
        <div className="modal-overlay" onClick={() => setSsResult(null)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Rezultat sincronizare clienți Selectsoft</h3>
            {ssResult.ok === false && <p style={{ color: 'var(--red, #c0392b)' }}>Eroare: {ssResult.error}</p>}
            {ssResult.message && <p>{ssResult.message}</p>}
            {(ssResult.matchedList || []).length > 0 && (
              <>
                <h4>✅ Clienți legați de Selectsoft ({ssResult.matchedList.length}):</h4>
                <ul style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                  {ssResult.matchedList.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </>
            )}
            {(ssResult.unmatchedList || []).length > 0 && (
              <>
                <h4>❓ Parteneri SS fără cont în portal (primii {ssResult.unmatchedList.length}):</h4>
                <ul style={{ fontSize: 12, maxHeight: 200, overflow: 'auto', color: 'var(--text2)' }}>
                  {ssResult.unmatchedList.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </>
            )}
            {(ssResult.errors || []).length > 0 && (
              <>
                <h4>⚠️ Erori:</h4>
                <ul style={{ fontSize: 12, color: 'var(--red, #c0392b)' }}>
                  {ssResult.errors.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </>
            )}
            <button className="btn btn-primary" onClick={() => setSsResult(null)}>Închide</button>
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Caută firmă, CUI, email..." style={{ flex: 1, minWidth: 200 }} value={search} onChange={e => setSearch(e.target.value)} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="toate">Toate statusurile</option>
            <option value="activ">Activi</option>
            <option value="in_aprobare">În aprobare</option>
            <option value="respinsa">Respinși</option>
          </select>
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="toate">Toți agenții</option>
            {agents.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>{firms.length} clienți afișați</div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Firmă</th><th>Agent</th><th>Val.</th><th>Transport</th><th>Comenzi</th><th>SS</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {firms.map(firm => {
                const agent = agents.find(a => a.id === firm.agent_id)
                const orderCount = (db.orders || []).filter(o => o.firmId === firm.id).length
                const clPct = null // credit data loaded on open, not in list view
                return (
                  <tr key={firm.id} style={{ cursor: 'pointer' }} onClick={() => openClient(firm)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{firm.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{firm.cui} · {firm.email}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{agent?.name || '—'}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: firm.currency === 'EUR' ? '#b45309' : 'var(--text2)' }}>{firm.currency || 'RON'}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{firm.default_transport_type || '—'}</td>
                    <td>{orderCount}</td>
                    <td>
                      {firm.selectsoft_cod_parten
                        ? <span style={{ fontSize: 11, color: 'var(--green-text)', fontFamily: 'monospace' }}>#{firm.selectsoft_cod_parten}</span>
                        : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td>{statusBadge(firm.status)}</td>
                    <td>
                      {firm.status === 'in_aprobare' && (
                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(firm.id)}>✓</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReject(firm.id)}>✕</button>
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

      {/* Panel lateral */}
      {selected && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelected(null)}>
          <div style={{ width: 700, background: 'var(--white)', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.cui} · {agents.find(a => a.id === selected.agent_id)?.name || '—'}</div>
                {selected.selectsoft_cod_parten && <div style={{ fontSize: 11, color: 'var(--green-text)' }}>SS #{selected.selectsoft_cod_parten}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {statusBadge(selected.status)}
                {!selected.selectsoft_cod_parten && (
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    try {
                      const r = await api.customers.syncSS(selected.id)
                      showToast(r.message || (r.ok ? 'Creat în Selectsoft' : 'Eroare'), r.ok ? 'success' : 'error')
                      if (r.cod_parten) setSelected(prev => ({ ...prev, selectsoft_cod_parten: r.cod_parten }))
                    } catch (err) { showToast(err.message || 'Eroare Selectsoft', 'error') }
                  }}>📤 Creează în SS</button>
                )}
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '10px 12px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent', color: tab === t.id ? 'var(--blue)' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* ── DATE FIRMĂ ── */}
              {tab === 'info' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[['Denumire', 'name'], ['CUI', 'tax_id'], ['Reg. Com.', 'trade_register_no'], ['Email', 'email'], ['Telefon', 'phone'], ['IBAN', 'iban'], ['Bancă', 'banca'], ['Site web', 'site_web']].map(([label, key]) => (
                      <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                        <label>{label}</label>
                        <input className="w-full" value={editForm[key] || ''} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Agent</label>
                      <select className="w-full" value={editForm.agent_id || ''} onChange={e => setEditForm(p => ({ ...p, agent_id: e.target.value }))}>
                        {agents.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Valută</label>
                      <select className="w-full" value={editForm.currency || 'RON'} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))}>
                        <option value="RON">RON</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Grup client</label>
                      <select className="w-full" value={editForm.grupClient || 'standard'} onChange={e => setEditForm(p => ({ ...p, grupClient: e.target.value }))}>
                        <option value="standard">Standard</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Transport default</label>
                      <select className="w-full" value={editForm.default_transport_type || 'Van'} onChange={e => setEditForm(p => ({ ...p, default_transport_type: e.target.value }))}>
                        <option value="Van">Duba (Van)</option>
                        <option value="Truck">TIR (Camion)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Discount global %</label>
                      <input type="number" min={0} max={50} className="w-full" value={editForm.discountGlobal || 0} onChange={e => setEditForm(p => ({ ...p, discountGlobal: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Plătitor TVA</label>
                      <select className="w-full" value={editForm.platitor_tva ? '1' : '0'} onChange={e => setEditForm(p => ({ ...p, platitor_tva: e.target.value === '1' }))}>
                        <option value="1">Da</option>
                        <option value="0">Nu</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Mărci permise</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {allMarci.map(m => {
                        const selMarci = editForm.allowed_brands ? (Array.isArray(editForm.allowed_brands) ? editForm.allowed_brands : JSON.parse(editForm.allowed_brands || '[]')) : []
                        return (
                        <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, padding: '3px 10px', borderRadius: 20, background: selMarci.includes(m) ? 'var(--blue-bg)' : 'var(--bg3)', border: '1px solid ' + (selMarci.includes(m) ? 'var(--blue)' : 'var(--border)'), color: selMarci.includes(m) ? 'var(--blue-text)' : 'var(--text2)' }}>
                          <input type="checkbox" checked={selMarci.includes(m)} onChange={() => toggleMarca(m)} style={{ width: 12, height: 12 }} />
                          {m}
                        </label>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={handleSave}>Salvează</button>
                    {selected.status === 'in_aprobare' && (
                      <>
                        <button className="btn btn-success" onClick={() => handleApprove(selected.id)}>✓ Aprobă</button>
                        <button className="btn btn-danger" onClick={() => handleReject(selected.id)}>✕ Respinge</button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── DELEGAȚI ── */}
              {tab === 'delegati' && (
                <div>
                  <div className="flex-between" style={{ marginBottom: 14 }}>
                    <div className="section-title">Utilizatori cont</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setAddDelegateOpen(true)}>+ Adaugă</button>
                  </div>
                  {clientDelegates.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.delegate_type === 'primary' ? 'var(--blue)' : 'var(--bg3)', color: u.delegate_type === 'primary' ? '#fff' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{getInitials(u.name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.email}</div>
                        <div style={{ fontSize: 11, color: u.can_place_orders ? 'var(--green-text)' : 'var(--text3)' }}>{u.can_place_orders ? '✓ Poate comanda' : '✗ Doar vizualizare'}</div>
                      </div>
                      {statusBadge(u.delegate_type)}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateLink(u.id)}>🔗</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { updateDelegate(u.id, { can_place_orders: !u.can_place_orders }); showToast('Actualizat!') }}>{u.can_place_orders ? '🔒' : '🔓'}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setResetPwModal(u.id)}>🔑 Reset parolă</button>
                        {u.delegate_type !== 'primary' && <button className="btn btn-danger btn-sm" onClick={() => { deactivateDelegate(u.id); showToast('Dezactivat!') }}>✕</button>}
                      </div>
                    </div>
                  ))}
                  {addDelegateOpen && (
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginTop: 12 }}>
                      <div className="section-title" style={{ marginBottom: 12 }}>Delegat nou</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[['Nume complet', 'name', 'text'], ['Email', 'email', 'email'], ['Parolă inițială', 'password', 'text']].map(([l, k, t]) => (
                          <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                            <label>{l}</label>
                            <input type={t} className="w-full" value={delegateForm[k]} onChange={e => setDelegateForm(p => ({ ...p, [k]: e.target.value }))} />
                          </div>
                        ))}
                        <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                          <input type="checkbox" checked={delegateForm.can_place_orders} onChange={e => setDelegateForm(p => ({ ...p, can_place_orders: e.target.checked }))} />
                          <label style={{ marginBottom: 0 }}>Poate plasa comenzi</label>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddDelegateOpen(false)}>Anulează</button>
                        <button className="btn btn-primary btn-sm" onClick={handleAddDelegate}>Adaugă</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PREȚURI ── */}
              {tab === 'preturi' && (
                <div>
                  <div className="section-title" style={{ marginBottom: 8 }}>Discount suplimentar per produs</div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Se aplică peste prețul cu marja agentului.</p>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Produs</th><th style={{ width: 120 }}>Discount %</th><th style={{ width: 80 }}>Status</th></tr></thead>
                      <tbody>
                        {(db.products || []).filter(p => p.activ).slice(0, 50).map(product => {
                          const cp = clientPricing.find(c => c.productId === product.id)
                          return (
                            <tr key={product.id}>
                              <td style={{ fontSize: 12 }}>{product.name.length > 60 ? product.name.slice(0, 60) + '…' : product.name}</td>
                              <td>
                                <input type="number" min={0} max={50} step={0.5} placeholder="0"
                                  defaultValue={cp?.discountExtra || ''}
                                  style={{ width: 70, fontSize: 12, padding: '3px 8px' }}
                                  onBlur={e => { setClientPricing(selected.id, product.id, parseFloat(e.target.value) || 0); showToast('Salvat!') }} />
                                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>%</span>
                              </td>
                              <td>{cp?.discountExtra > 0 && <span style={{ fontSize: 11, color: 'var(--green-text)' }}>−{cp.discountExtra}%</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── CREDIT LIMIT — Bug 1: EDITABIL ── */}
              {tab === 'credit' && (
                <div>
                  <div className="flex-between" style={{ marginBottom: 16 }}>
                    <div className="section-title">Limită credit</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { syncCreditFromSelectSoft(selected.id); showToast('⚡ Sync placeholder') }}>🔄 Sync SS</button>
                      {!creditEditMode
                        ? <button className="btn btn-primary btn-sm" onClick={() => setCreditEditMode(true)}>✏ Editează</button>
                        : <button className="btn btn-success btn-sm" onClick={handleSaveCreditLimit}>✓ Salvează</button>
                      }
                    </div>
                  </div>

                  {creditEditMode ? (
                    /* ── EDIT MODE ── */
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, border: '1px solid var(--blue)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Limită credit</label>
                          <input type="number" min={0} step={1000} className="w-full"
                            value={creditForm.credit_limit || 0}
                            onChange={e => setCreditForm(p => ({ ...p, credit_limit: parseFloat(e.target.value) || 0, available_credit: Math.max(0, parseFloat(e.target.value) - (p.used_credit || 0)) }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Monedă limită</label>
                          <select className="w-full" value={creditForm.limit_currency || 'RON'} onChange={e => setCreditForm(p => ({ ...p, limit_currency: e.target.value }))}>
                            <option value="RON">RON</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Notificare la % utilizat</label>
                          <input type="number" min={10} max={100} step={5} className="w-full"
                            value={creditForm.notification_threshold_pct || 80}
                            onChange={e => setCreditForm(p => ({ ...p, notification_threshold_pct: parseInt(e.target.value) || 80 }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                          <input type="checkbox" checked={creditForm.block_on_exceed || false}
                            onChange={e => setCreditForm(p => ({ ...p, block_on_exceed: e.target.checked }))} />
                          <div>
                            <label style={{ marginBottom: 0 }}>Blochează comanda la depășire</label>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                              {creditForm.block_on_exceed ? 'La depășire se generează proformă și comanda intră în așteptare' : 'La depășire se afișează doar avertisment'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setCreditEditMode(false); setCreditForm(creditData || {}) }}>Anulează</button>
                    </div>
                  ) : (
                    /* ── VIEW MODE ── */
                    creditLimit && creditLimit.credit_limit > 0 ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                          {[['Limită', lei(creditLimit.credit_limit)], ['Utilizat', lei(creditLimit.used_credit)], ['Disponibil', lei(creditLimit.available_credit)]].map(([l, v], i) => (
                            <div key={l} style={{ background: i === 2 && creditPct >= 90 ? 'var(--red-bg)' : i === 1 && creditPct >= 80 ? 'var(--orange-bg)' : 'var(--bg)', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{l}</div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: i === 2 && creditPct >= 90 ? 'var(--red-text)' : i === 1 && creditPct >= 80 ? 'var(--orange-text)' : 'inherit' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                            <span>Utilizare credit</span><span style={{ fontWeight: 600, color: creditPct >= 80 ? 'var(--orange-text)' : 'inherit' }}>{creditPct}%</span>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(creditPct, 100)}%`, background: creditPct >= 90 ? 'var(--red-text)' : creditPct >= 80 ? '#f59e0b' : 'var(--green)', borderRadius: 4, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          Notificare la: <strong>{creditLimit.notification_threshold_pct}%</strong> ·
                          La depășire: <strong style={{ color: creditLimit.block_on_exceed ? 'var(--red-text)' : 'var(--green-text)' }}>{creditLimit.block_on_exceed ? 'Blochează + Proformă' : 'Doar avertisment'}</strong>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '20px', textAlign: 'center', color: 'var(--text3)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                        <div style={{ fontSize: 13, marginBottom: 12 }}>Nicio limită de credit configurată.</div>
                        <button className="btn btn-primary btn-sm" onClick={() => setCreditEditMode(true)}>Configurează limită</button>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* ── LOCAȚII LIVRARE ── */}
              {tab === 'livrare' && (
                <div>
                  <div className="flex-between" style={{ marginBottom: 14 }}>
                    <div className="section-title">Puncte de livrare</div>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      addDeliveryLocation(selected.id, { name: 'Locație nouă', adresa: '', program: '', contact_name: '', contact_phone: '' })
                      setSelected(prev => ({ ...prev, delivery_locations: [...(prev.delivery_locations || []), { id: 'new_' + Date.now(), name: 'Locație nouă', adresa: '' }] }))
                      showToast('Locație adăugată!')
                    }}>+ Adaugă locație</button>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'var(--blue-bg)', borderRadius: 8, marginBottom: 10, border: '1px solid rgba(37,99,235,0.1)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>🏢 Sediu principal (implicit)</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{selected.adresa}{selected.localitate ? `, ${selected.localitate}` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Email: {selected.email} · Tel: {selected.telefon}</div>
                  </div>

                  {(selected.delivery_locations || []).map(loc => (
                    <div key={loc.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Denumire</label>
                          <input className="w-full" defaultValue={loc.name} onBlur={e => showToast('Salvat!')} placeholder="Ex: Depozit Ilfov" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Program livrare</label>
                          <input className="w-full" defaultValue={loc.program || ''} onBlur={e => showToast('Salvat!')} placeholder="L-V 09:00-17:00" />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label>Adresă completă</label>
                        <input className="w-full" defaultValue={loc.adresa} onBlur={e => showToast('Salvat!')} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Persoană contact</label>
                          <input className="w-full" defaultValue={loc.contact_name || ''} onBlur={e => showToast('Salvat!')} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Telefon</label>
                          <input className="w-full" defaultValue={loc.contact_phone || ''} onBlur={e => showToast('Salvat!')} />
                        </div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => {
                        removeDeliveryLocation(selected.id, loc.id)
                        setSelected(prev => ({ ...prev, delivery_locations: (prev.delivery_locations || []).filter(l => l.id !== loc.id) }))
                        showToast('Locație ștearsă')
                      }}>Șterge</button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── COMENZI ── */}
              {tab === 'comenzi' && (
                <div>
                  <div className="section-title" style={{ marginBottom: 12 }}>Istoricul comenzilor</div>
                  {clientOrders.length === 0
                    ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>Nicio comandă.</div>
                    : <div className="table-wrap">
                        <table>
                          <thead><tr><th>Nr.</th><th>Data</th><th>Total</th><th>Transport</th><th>Status</th></tr></thead>
                          <tbody>
                            {clientOrders.map(o => (
                              <tr key={o.id}>
                                <td style={{ fontWeight: 500 }}>{o.nr}</td>
                                <td>{fmtDate(o.dataComanda)}</td>
                                <td style={{ fontWeight: 600 }}>{lei(o.total)}</td>
                                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{o.transport_type || '—'}</td>
                                <td>{statusBadge(o.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  }
                </div>
              )}

              {/* ── SURVEY ── */}
              {tab === 'survey' && (
                <div>
                  {surveyResult ? (
                    <>
                      <div className="flex-between" style={{ marginBottom: 12 }}>
                        <div className="section-title">Profil completat</div>
                        <span style={{ fontSize: 12, color: 'var(--green-text)' }}>✓ {fmtDate(surveyResult.completed_at)}</span>
                      </div>
                      {Object.entries(surveyResult.answers || {}).map(([k, v]) => v ? (
                        <div key={k} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text3)', width: 200, flexShrink: 0, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: 500 }}>{v}</span>
                        </div>
                      ) : null)}
                    </>
                  ) : (
                    <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                      Clientul nu a completat survey-ul.
                      <br />
                      <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => showToast('Email trimis!')}>📧 Trimite reminder</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── NOTIȚE ── */}
              {tab === 'notite' && (
                <div>
                  <div className="section-title" style={{ marginBottom: 6 }}>Notițe interne client</div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
                    Preofertări, condiții speciale, observații — vizibile doar pentru admini.
                  </p>

                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border)', marginBottom: 16 }}>
                    <textarea className="w-full" rows={4} placeholder={'Ex:\nPentru produsul Miramax 4s, 600g\ncost grafică — estimez maxim 1500 lei\ncustodie ambalaj 400kg × 15.5 RON = 6200 RON\npreț produs fără ambalaj: 5.65 lei + TVA'}
                      value={newNote} onChange={e => setNewNote(e.target.value)}
                      style={{ resize: 'vertical', fontSize: 13, fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={handleAddClientNote} disabled={noteSaving || !newNote.trim()}>
                        {noteSaving ? 'Se salvează...' : '+ Adaugă notiță'}
                      </button>
                    </div>
                  </div>

                  {clientNotes.length === 0
                    ? <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Nicio notiță încă.</div>
                    : clientNotes.map(n => (
                      <div key={n.id} style={{ background: 'var(--white)', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6, flex: 1 }}>{n.text}</div>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClientNote(n.id)} title="Șterge notița">✕</button>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, borderTop: '1px solid var(--border2)', paddingTop: 6 }}>
                          {n.created_by || 'Admin'} · {fmtDateTime(n.created_at)}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      {resetPwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 380, width: '100%', padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Resetează parola</h3>
            <div className="form-group">
              <label>Parolă nouă</label>
              <input type="password" className="w-full" placeholder="Minim 6 caractere" value={resetPwInput} onChange={e => setResetPwInput(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setResetPwModal(null); setResetPwInput('') }}>Anulează</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                if (!resetPwInput || resetPwInput.length < 6) { alert('Parola trebuie să aibă minim 6 caractere'); return }
                try {
                  await api.auth.resetPassword(resetPwModal, resetPwInput)
                  setResetPwModal(null)
                  setResetPwInput('')
                  alert('Parola a fost resetată cu succes!')
                } catch (err) {
                  alert(err.message || 'Eroare la resetarea parolei')
                }
              }}>Resetează</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
