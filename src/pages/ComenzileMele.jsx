import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, leiCuTva, cuTva, tvaVal, fmtDate, statusBadge } from '../utils'
import StatusTracker from '../components/StatusTracker'
import CopyButton from '../components/CopyButton'
import TransportDocs from '../components/TransportDocs'
import EmptyState from '../components/EmptyState'

export default function ComenzileMele() {
  const { user } = useAuth()
  const { db } = useStore()
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState('toate')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const clientId = user.customerId || user.firmId || null
  const firma = (db.firms || []).find(f => f.id === clientId)
  const isEur = firma?.currency === 'EUR'
  const eurRate = parseFloat(db.exchange?.applied_rate || db.exchange?.rate || 0)
  const fmtVal = (val) => (isEur && eurRate > 0) ? `${((val || 0) / eurRate).toFixed(2)} EUR` : lei(val)
  const myOrders = db.orders.filter(o => o.firmId === clientId || o.customer_id === clientId)
  const filtered = myOrders.filter(o => {
    const matchStatus = filterStatus === 'toate' || o.status === filterStatus
    const matchSearch = o.nr.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statusOptions = [
    { value: 'toate', label: 'Toate' }, { value: 'plasata', label: 'Plasate' },
    { value: 'in_aprobare', label: 'În aprobare' }, { value: 'aprobata', label: 'Aprobate' },
    { value: 'in_procesare', label: 'În procesare' }, { value: 'livrata', label: 'Livrate' },
    { value: 'anulata', label: 'Anulate' },
  ]

  return (
    <Layout title="Comenzile mele" actions={
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/comanda-noua')}>+ Comandă nouă</button>
    }>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <input type="text" placeholder="Caută după nr. comandă..." style={{ width: 220 }}
            value={search} onChange={e => setSearch(e.target.value)} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState type="comenzi" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nr. comandă</th><th>Data</th><th>Produse</th><th>Valoare</th><th>Status</th><th>Livrare</th><th>Factură</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(order)}>
                    <td>
                      <CopyButton text={order.nr}><b>{order.nr}</b></CopyButton>
                    </td>
                    <td>{fmtDate(order.dataComanda)}</td>
                    <td style={{ color: 'var(--text2)' }}>{order.lines.length} linie{order.lines.length !== 1 ? 'i' : ''}</td>
                    <td><b>{fmtVal(order.total)}</b></td>
                    <td>{statusBadge(order.status)}</td>
                    <td>{fmtDate(order.dataLivrare)}</td>
                    <td>{order.nrFactura ? <span style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer' }}>📄 {order.nrFactura}</span> : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/comanda-noua', { state: { reorder: order } })}>↻</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><CopyButton text={selected.nr}>Comandă {selected.nr}</CopyButton></h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Status tracker */}
            <StatusTracker status={selected.status} />

            {selected.status === 'asteptare_plata' && (
              <div style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '10px 14px', margin: '12px 0', fontSize: 12, color: 'var(--orange-text)' }}>
                💰 <strong>Comanda așteaptă plata proformei.</strong> Proforma a fost generată
                {selected.proformaNr ? <> (nr. {selected.proformaNr})</> : null} și a fost transmisă pe email.
                După confirmarea plății, comanda intră automat în aprobare.
              </div>
            )}
            <div className="divider" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div><div className="text-muted">Status</div>{statusBadge(selected.status)}</div>
              <div><div className="text-muted">Data comandă</div>{fmtDate(selected.dataComanda)}</div>
              <div><div className="text-muted">Data livrare dorită</div>{fmtDate(selected.dataLivrare) || '—'}</div>
              {selected.deliveryDateConfirmed && <div><div className="text-muted">Data livrare confirmată</div><b>{fmtDate(selected.deliveryDateConfirmed)}</b></div>}
              <div><div className="text-muted">Factură</div>{selected.nrFactura || '—'}</div>
              {selected.observatii && <div style={{ gridColumn: '1/-1' }}><div className="text-muted">Observații</div>{selected.observatii}</div>}
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>Linii comandă</div>
            <table>
              <thead>
                <tr>
                  <th>Produs</th><th>UoM</th><th>Cant.</th>
                  <th className="text-right">Preț/buc<br/><span style={{fontSize:10,color:'var(--text3)'}}>fără TVA</span></th>
                  <th className="text-right">TVA 21%</th>
                  <th className="text-right">Preț/buc<br/><span style={{fontSize:10,color:'var(--text3)'}}>cu TVA</span></th>
                  <th className="text-right">Total<br/><span style={{fontSize:10,color:'var(--text3)'}}>cu TVA</span></th>
                </tr>
              </thead>
              <tbody>
                {selected.lines.map((l, i) => {
                  const p = db.products.find(p => p.id === l.productId)
                  const tva = tvaVal(l.pretUnitar)
                  const pretCuTva = cuTva(l.pretUnitar)
                  const totalLineCuTva = cuTva(l.total)
                  return (
                    <tr key={i}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p?.imagine && <img src={p.imagine} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
                        {p?.name || l.productId}
                      </td>
                      <td style={{fontSize:12,color:'var(--text2)'}}>{l.uom_code || l.unitateSel || '—'}</td>
                      <td>{l.cantitate}</td>
                      <td className="text-right">{fmtVal(l.pretUnitar)}</td>
                      <td className="text-right" style={{color:'var(--text3)'}}>{fmtVal(tva)}</td>
                      <td className="text-right">{fmtVal(pretCuTva)}</td>
                      <td className="text-right"><b>{fmtVal(totalLineCuTva)}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(() => {
              // order.netTotal = net după discount (fără TVA). order.total = gross (cu TVA).
              const subtotalLinii = selected.lines.reduce((s, l) => s + (l.total || 0), 0)
              const netFinal = selected.netTotal > 0 ? selected.netTotal : subtotalLinii
              const discount = Math.round((netFinal - subtotalLinii) * 100) / 100
              return (
                <div className="summary-box" style={{ marginTop: 12 }}>
                  <div className="summary-line"><span>Subtotal fără TVA</span><span>{fmtVal(subtotalLinii)}</span></div>
                  {discount !== 0 && (
                    <div className="summary-line" style={{ color: 'var(--green-text)' }}><span>Discount</span><span>{fmtVal(discount)}</span></div>
                  )}
                  <div className="summary-line"><span>Net fără TVA</span><span>{fmtVal(netFinal)}</span></div>
                  <div className="summary-line"><span>TVA 21%</span><span>{fmtVal(tvaVal(netFinal))}</span></div>
                  <div className="summary-line total"><span>Total cu TVA</span><span>{fmtVal(cuTva(netFinal))}</span></div>
                  {isEur && eurRate > 0 && (
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>echivalent {lei(cuTva(netFinal))} · curs {eurRate.toFixed(4)}</div>
                  )}
                </div>
              )
            })()}

            <TransportDocs order={selected} />

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setSelected(null); navigate('/comanda-noua', { state: { reorder: selected } }) }}>↻ Reorder</button>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
