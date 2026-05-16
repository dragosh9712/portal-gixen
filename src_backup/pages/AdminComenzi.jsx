import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei, fmtDate, statusBadge } from '../utils'
import StatusTracker from '../components/StatusTracker'
import { TransportDocsAdmin } from '../components/TransportDocs'
import ExportCSV from '../components/ExportCSV'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'

const STATUS_OPTIONS = [
  { value: 'toate', label: 'Toate statusurile' }, { value: 'plasata', label: 'Plasate' },
  { value: 'in_aprobare', label: 'În aprobare' }, { value: 'aprobata', label: 'Aprobate' },
  { value: 'in_procesare', label: 'În procesare' }, { value: 'livrata', label: 'Livrate' },
  { value: 'anulata', label: 'Anulate' },
]
const NEXT_STATUSES = {
  plasata:      ['in_aprobare',  'anulata'],
  in_aprobare:  ['aprobata',     'anulata'],
  aprobata:     ['in_procesare', 'anulata'],
  in_procesare: ['aviz_generat', 'anulata'],
  aviz_generat: ['in_livrare',   'anulata'],
  in_livrare:   ['livrata',      'anulata'],
}

function Toast({ msg, onDone }) {
  return <div className="toast success" onClick={onDone}>{msg}</div>
}

export default function AdminComenzi() {
  const { db, updateOrderStatus, setFactura, addNotaInterna, bulkUpdateOrderStatus, updateTransport, updateDocumente } = useStore()
  const [filterStatus, setFilterStatus] = useState('toate')
  const [filterFirm, setFilterFirm] = useState('toate')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [facturaInput, setFacturaInput] = useState('')
  const [notaInput, setNotaInput] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const firms = db.firms.filter(f => f.status === 'activ')
  const orders = db.orders.filter(o => {
    const matchStatus = filterStatus === 'toate' || o.status === filterStatus
    const matchFirm = filterFirm === 'toate' || o.firmId === filterFirm
    const matchSearch = o.nr.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchFirm && matchSearch
  })

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleSelectAll() {
    setSelectedIds(prev => prev.length === orders.length ? [] : orders.map(o => o.id))
  }

  function handleBulk(status) {
    bulkUpdateOrderStatus(selectedIds, status)
    showToast(`${selectedIds.length} comenzi actualizate → ${status}`)
    setSelectedIds([])
  }

  function handleStatusChange(orderId, newStatus) {
    if (newStatus === 'anulata') {
      setConfirmAction({ orderId, newStatus, label: 'Anulezi această comandă?' })
    } else {
      updateOrderStatus(orderId, newStatus)
      if (selected?.id === orderId) setSelected(prev => ({ ...prev, status: newStatus }))
      showToast(`Status actualizat → ${newStatus}`)
    }
  }

  function handleSetFactura() {
    if (!facturaInput.trim() || !selected) return
    setFactura(selected.id, facturaInput.trim())
    setSelected(prev => ({ ...prev, nrFactura: facturaInput.trim() }))
    setFacturaInput('')
    showToast('Factură setată!')
  }

  function handleAddNota() {
    if (!notaInput.trim() || !selected) return
    addNotaInterna(selected.id, notaInput.trim())
    setSelected(prev => ({ ...prev, noteInterne: [...(prev.noteInterne || []), { text: notaInput.trim(), timestamp: new Date().toISOString() }] }))
    setNotaInput('')
    showToast('Notă adăugată!')
  }

  return (
    <Layout title="Gestiune comenzi">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-bar">
          <span>{selectedIds.length} comenzi selectate</span>
          {['aprobata', 'in_procesare', 'livrata'].map(s => (
            <button key={s} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={() => handleBulk(s)}>→ {s.replace('_', ' ')}</button>
          ))}
          <button className="btn btn-sm btn-danger" onClick={() => handleBulk('anulata')}>✗ Anulează</button>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setSelectedIds([])}>✕ Deselectează</button>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <input type="text" placeholder="Caută nr. comandă..." style={{ width: 200 }} value={search} onChange={e => setSearch(e.target.value)} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterFirm} onChange={e => setFilterFirm(e.target.value)}>
            <option value="toate">Toți clienții</option>
            {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {orders.length === 0 ? <EmptyState type="comenzi" /> : (
        <div className="card">
          <div className="section-hdr">
            <div className="section-title">{orders.length} comenzi</div>
            <ExportCSV orders={orders} firms={db.firms} products={db.products} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" checked={selectedIds.length === orders.length && orders.length > 0} onChange={toggleSelectAll} /></th>
                  <th>Nr.</th><th>Client</th><th>Valoare</th><th>Status</th><th>Data</th><th>Factură</th><th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const firm = db.firms.find(f => f.id === o.firmId)
                  const nextStatuses = NEXT_STATUSES[o.status] || []
                  const isSelected = selectedIds.includes(o.id)
                  return (
                    <tr key={o.id} className={isSelected ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(o.id)} /></td>
                      <td><CopyButton text={o.nr}><b>{o.nr}</b></CopyButton></td>
                      <td style={{ fontSize: 12 }}>{firm?.name}</td>
                      <td><b>{lei(o.total)}</b></td>
                      <td>{statusBadge(o.status)}</td>
                      <td style={{ fontSize: 12 }}>{fmtDate(o.dataComanda)}</td>
                      <td style={{ fontSize: 12 }}>{o.nrFactura || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-8">
                          {nextStatuses.map(ns => (
                            <button key={ns} className={`btn btn-sm ${ns === 'anulata' ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleStatusChange(o.id, ns)}>
                              {ns === 'anulata' ? '✗' : '→'} {ns.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><CopyButton text={selected.nr}>Comandă {selected.nr}</CopyButton></h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <StatusTracker status={selected.status} />
            <div className="divider" />

            {/* Status flow */}
            {NEXT_STATUSES[selected.status]?.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Schimbă status:</div>
                <div className="flex gap-8">
                  {NEXT_STATUSES[selected.status].map(ns => (
                    <button key={ns} className={`btn btn-sm ${ns === 'anulata' ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleStatusChange(selected.id, ns)}>
                      → {ns.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div><div className="text-muted">Client</div>{db.firms.find(f => f.id === selected.firmId)?.name}</div>
              <div><div className="text-muted">Data comandă</div>{fmtDate(selected.dataComanda)}</div>
              <div><div className="text-muted">Data livrare</div>{fmtDate(selected.dataLivrare)}</div>
              <div>
                <div className="text-muted">Nr. factură</div>
                {selected.nrFactura ? <b>{selected.nrFactura}</b> : (
                  <div className="flex gap-8" style={{ marginTop: 4 }}>
                    <input type="text" placeholder="ex: FX-1234" style={{ width: 110 }} value={facturaInput} onChange={e => setFacturaInput(e.target.value)} />
                    <button className="btn btn-primary btn-sm" onClick={handleSetFactura}>Setează</button>
                  </div>
                )}
              </div>
              {selected.observatii && <div style={{ gridColumn: '1/-1' }}><div className="text-muted">Observații client</div>{selected.observatii}</div>}
            </div>

            {/* Linii */}
            <div className="section-title" style={{ marginBottom: 8 }}>Linii comandă</div>
            <table>
              <thead><tr><th>Produs</th><th>Cant.</th><th>Preț/buc</th><th>Disc.</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {selected.lines.map((l, i) => {
                  const p = db.products.find(p => p.id === l.productId)
                  return (
                    <tr key={i}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p?.imagine && <img src={p.imagine} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
                        {p?.name}
                      </td>
                      <td>{l.cantitate}</td><td>{lei(l.pretUnitar)}</td>
                      <td>{l.discount > 0 ? `-${l.discount}%` : '—'}</td>
                      <td className="text-right"><b>{lei(l.total)}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="summary-box" style={{ marginTop: 12 }}>
              <div className="summary-line total"><span>Total</span><span>{lei(selected.total)}</span></div>
            </div>

            {/* Transport & Documente */}
            <div className="divider" />
            <div className="section-title" style={{ marginBottom: 12 }}>Transport & Documente</div>
            <TransportDocsAdmin
              order={selected}
              onUpdateTransport={data => { updateTransport(selected.id, data); setSelected(prev => ({ ...prev, transport: { ...prev.transport, ...data } })) }}
              onUpdateDocumente={data => { updateDocumente(selected.id, data); setSelected(prev => ({ ...prev, documente: { ...prev.documente, ...data }, nrFactura: data.nrFactura || prev.nrFactura })) }}
            />

            {/* Note interne */}
            <div className="divider" />
            <div className="section-title" style={{ marginBottom: 8 }}>Note interne <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>(vizibile doar admin)</span></div>
            {(selected.noteInterne || []).map((n, i) => (
              <div key={i} style={{ background: 'var(--orange-bg)', borderRadius: 6, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
                <div style={{ color: 'var(--orange-text)' }}>{n.text}</div>
                <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 3 }}>{new Date(n.timestamp).toLocaleString('ro-RO')}</div>
              </div>
            ))}
            <div className="flex gap-8" style={{ marginTop: 8 }}>
              <input type="text" style={{ flex: 1 }} placeholder="Adaugă notă internă..." value={notaInput} onChange={e => setNotaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNota()} />
              <button className="btn btn-secondary btn-sm" onClick={handleAddNota}>Adaugă</button>
            </div>

            {/* Activity log */}
            {selected.activityLog?.length > 0 && (
              <>
                <div className="divider" />
                <div className="section-title" style={{ marginBottom: 8 }}>Jurnal activitate</div>
                {[...selected.activityLog].reverse().map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: 6 }}>
                    <div style={{ color: 'var(--text3)', flexShrink: 0 }}>{new Date(log.timestamp).toLocaleString('ro-RO')}</div>
                    <div style={{ color: 'var(--text2)' }}>{log.action}</div>
                  </div>
                ))}
              </>
            )}

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 380 }}>
            <div className="modal-hdr"><h3>Confirmare</h3><button className="modal-close" onClick={() => setConfirmAction(null)}>×</button></div>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>{confirmAction.label}</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Nu</button>
              <button className="btn btn-danger" onClick={() => {
                updateOrderStatus(confirmAction.orderId, confirmAction.newStatus)
                if (selected?.id === confirmAction.orderId) setSelected(prev => ({ ...prev, status: confirmAction.newStatus }))
                showToast('Comandă anulată')
                setConfirmAction(null)
              }}>Da, anulează</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
