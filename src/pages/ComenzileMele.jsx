import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, fmtDate, statusBadge } from '../utils'

export default function ComenzileMele() {
  const { user } = useAuth()
  const { db } = useStore()
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState('toate')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const myOrders = db.orders.filter(o => o.firmId === user.firmId)

  const filtered = myOrders.filter(o => {
    const matchStatus = filterStatus === 'toate' || o.status === filterStatus
    const matchSearch = o.nr.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statusOptions = [
    { value: 'toate', label: 'Toate' },
    { value: 'plasata', label: 'Plasate' },
    { value: 'in_aprobare', label: 'În aprobare' },
    { value: 'aprobata', label: 'Aprobate' },
    { value: 'in_procesare', label: 'În procesare' },
    { value: 'livrata', label: 'Livrate' },
    { value: 'anulata', label: 'Anulate' },
  ]

  return (
    <Layout title="Comenzile mele" actions={
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/comanda-noua')}>
        + Comandă nouă
      </button>
    }>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Caută după nr. comandă..."
            style={{ width: 220 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nr. comandă</th>
                <th>Data</th>
                <th>Produse</th>
                <th>Valoare</th>
                <th>Status</th>
                <th>Livrare</th>
                <th>Factură</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">Nicio comandă găsită</div></td></tr>
              ) : filtered.map(order => (
                <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(order)}>
                  <td><b>{order.nr}</b></td>
                  <td>{fmtDate(order.dataComanda)}</td>
                  <td style={{ color: 'var(--text2)' }}>{order.lines.length} linie{order.lines.length !== 1 ? 'i' : ''}</td>
                  <td><b>{lei(order.total)}</b></td>
                  <td>{statusBadge(order.status)}</td>
                  <td>{fmtDate(order.dataLivrare)}</td>
                  <td>
                    {order.nrFactura ? (
                      <span style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer' }}>
                        📄 {order.nrFactura}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/comanda-noua', { state: { reorder: order } })}
                    >
                      ↻
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>Comandă {selected.nr}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><div className="text-muted">Status</div>{statusBadge(selected.status)}</div>
              <div><div className="text-muted">Data comandă</div>{fmtDate(selected.dataComanda)}</div>
              <div><div className="text-muted">Data livrare</div>{fmtDate(selected.dataLivrare)}</div>
              <div><div className="text-muted">Factură</div>{selected.nrFactura || '—'}</div>
              {selected.observatii && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div className="text-muted">Observații</div>
                  <div style={{ fontSize: 13 }}>{selected.observatii}</div>
                </div>
              )}
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>Linii comandă</div>
            <table>
              <thead>
                <tr>
                  <th>Produs</th>
                  <th>Cant.</th>
                  <th>Preț/buc</th>
                  <th>Disc.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.lines.map((l, i) => {
                  const p = db.products.find(p => p.id === l.productId)
                  return (
                    <tr key={i}>
                      <td>{p?.name || l.productId}</td>
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
              <button
                className="btn btn-secondary"
                onClick={() => { setSelected(null); navigate('/comanda-noua', { state: { reorder: selected } }) }}
              >
                ↻ Reorder
              </button>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
