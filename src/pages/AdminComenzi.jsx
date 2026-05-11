import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei, fmtDate, statusBadge } from '../utils'

const STATUS_OPTIONS = [
  { value: 'toate', label: 'Toate statusurile' },
  { value: 'plasata', label: 'Plasate' },
  { value: 'in_aprobare', label: 'În aprobare' },
  { value: 'aprobata', label: 'Aprobate' },
  { value: 'in_procesare', label: 'În procesare' },
  { value: 'livrata', label: 'Livrate' },
  { value: 'anulata', label: 'Anulate' },
]

const NEXT_STATUSES = {
  plasata: ['in_aprobare', 'anulata'],
  in_aprobare: ['aprobata', 'anulata'],
  aprobata: ['in_procesare', 'anulata'],
  in_procesare: ['livrata', 'anulata'],
}

export default function AdminComenzi() {
  const { db, updateOrderStatus, setFactura } = useStore()
  const [filterStatus, setFilterStatus] = useState('toate')
  const [filterFirm, setFilterFirm] = useState('toate')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [facturaInput, setFacturaInput] = useState('')

  const orders = db.orders.filter(o => {
    const matchStatus = filterStatus === 'toate' || o.status === filterStatus
    const matchFirm = filterFirm === 'toate' || o.firmId === filterFirm
    const matchSearch = o.nr.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchFirm && matchSearch
  })

  const firms = db.firms.filter(f => f.status === 'activ')

  function handleSetFactura() {
    if (!facturaInput.trim() || !selected) return
    setFactura(selected.id, facturaInput.trim())
    setSelected(prev => ({ ...prev, nrFactura: facturaInput.trim() }))
    setFacturaInput('')
  }

  return (
    <Layout title="Gestiune comenzi">
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="Caută nr. comandă..."
            style={{ width: 200 }} value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterFirm} onChange={e => setFilterFirm(e.target.value)}>
            <option value="toate">Toți clienții</option>
            {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="section-hdr">
          <div className="section-title">{orders.length} comenzi</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nr.</th><th>Client</th><th>Produse</th><th>Valoare</th>
                <th>Status</th><th>Data</th><th>Livrare</th><th>Factură</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state">Nicio comandă</div></td></tr>
              ) : orders.map(o => {
                const firm = db.firms.find(f => f.id === o.firmId)
                const nextStatuses = NEXT_STATUSES[o.status] || []
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                    <td><b>{o.nr}</b></td>
                    <td style={{ fontSize: 12 }}>{firm?.name}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{o.lines.length} linii</td>
                    <td><b>{lei(o.total)}</b></td>
                    <td>{statusBadge(o.status)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(o.dataComanda)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(o.dataLivrare)}</td>
                    <td style={{ fontSize: 12 }}>{o.nrFactura || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {nextStatuses.length > 0 && (
                        <div className="flex gap-8">
                          {nextStatuses.map(ns => (
                            <button
                              key={ns}
                              className={`btn btn-sm ${ns === 'anulata' ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => updateOrderStatus(o.id, ns)}
                            >
                              {ns === 'anulata' ? '✗' : '→'} {ns.replace('_', ' ')}
                            </button>
                          ))}
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

      {/* Order detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>Comandă {selected.nr}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Status flow */}
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>Status curent: {statusBadge(selected.status)}</div>
              {NEXT_STATUSES[selected.status]?.length > 0 && (
                <div className="flex gap-8">
                  {NEXT_STATUSES[selected.status].map(ns => (
                    <button
                      key={ns}
                      className={`btn btn-sm ${ns === 'anulata' ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => { updateOrderStatus(selected.id, ns); setSelected(prev => ({ ...prev, status: ns })) }}
                    >
                      → {ns.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div><div className="text-muted">Client</div>{db.firms.find(f => f.id === selected.firmId)?.name}</div>
              <div><div className="text-muted">Data comandă</div>{fmtDate(selected.dataComanda)}</div>
              <div><div className="text-muted">Data livrare</div>{fmtDate(selected.dataLivrare)}</div>
              <div>
                <div className="text-muted">Nr. factură</div>
                {selected.nrFactura ? (
                  <b>{selected.nrFactura}</b>
                ) : (
                  <div className="flex gap-8" style={{ marginTop: 4 }}>
                    <input
                      type="text" placeholder="ex: FX-1234"
                      style={{ width: 120 }} value={facturaInput}
                      onChange={e => setFacturaInput(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleSetFactura}>Setează</button>
                  </div>
                )}
              </div>
              {selected.observatii && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div className="text-muted">Observații client</div>
                  {selected.observatii}
                </div>
              )}
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>Linii comandă</div>
            <table>
              <thead><tr><th>Produs</th><th>Cant.</th><th>Preț/buc</th><th>Disc.</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {selected.lines.map((l, i) => {
                  const p = db.products.find(p => p.id === l.productId)
                  return (
                    <tr key={i}>
                      <td>{p?.name}</td>
                      <td>{l.cantitate}</td>
                      <td>{lei(l.pretUnitar)}</td>
                      <td>{l.discount > 0 ? `-${l.discount}%` : '—'}</td>
                      <td className="text-right"><b>{lei(l.total)}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="summary-box" style={{ marginTop: 12 }}>
              <div className="summary-line total">
                <span>Total</span><span>{lei(selected.total)}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
