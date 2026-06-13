import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import api from '../api'
import { lei, leiCuTva, cuTva, tvaVal, fmtDate, statusBadge } from '../utils'
import { calculeazaCos, primaryUom } from '../promoEngine.js'
import { detectTransportType } from '../config/transport.js'
import StatusTracker from '../components/StatusTracker'
import { TransportDocsAdmin } from '../components/TransportDocs'
import ExportCSV from '../components/ExportCSV'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'

const STATUS_OPTIONS = [
  { value: 'toate', label: 'Toate statusurile' }, { value: 'plasata', label: 'Plasate' },
  { value: 'asteptare_plata', label: 'Așteptare plată' },
  { value: 'in_aprobare', label: 'În aprobare' }, { value: 'aprobata', label: 'Aprobate' },
  { value: 'in_procesare', label: 'În procesare' }, { value: 'livrata', label: 'Livrate' },
  { value: 'anulata', label: 'Anulate' },
]
const NEXT_STATUSES = {
  asteptare_plata: ['in_aprobare', 'anulata'],
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
  const { db, updateOrderStatus, setFactura, addNotaInterna, bulkUpdateOrderStatus, updateTransport, updateDocumente, updateAdresaLivrare, getPretPentruClient, refreshOrders } = useStore()
  const routerLocation = useLocation()
  const locations = db.locations || []
  const [filterStatus, setFilterStatus] = useState('toate')
  const [filterFirm, setFilterFirm] = useState('toate')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [facturaInput, setFacturaInput] = useState('')

  // Deschide comanda dacă vine cu ?id= din AdminClienti
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search)
    const id = params.get('id')
    if (id && db.orders.length) {
      const order = db.orders.find(o => o.id === id)
      if (order) setSelected(order)
    }
  }, [routerLocation.search, db.orders])
  const [notaInput, setNotaInput] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [toast, setToast] = useState(null)
  const [proformaNrInput, setProformaNrInput] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [locationInput, setLocationInput] = useState('')
  const [editModal, setEditModal] = useState(null)   // { orderId, lines: [...] }
  const [editSaving, setEditSaving] = useState(false)

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

  // O comandă se poate edita DOAR cât e în status 'plasata' și netrimisă în SS
  const canEditOrder = o => o && o.status === 'plasata' && !o.synced_at

  // ── Helpers UoM (aliniat cu ComandaNoua) ──
  function getUomCoeficient(product, code) {
    return (product?.product_uom || []).find(u => u.uom_code === code)?.coeficient || 1
  }
  function normalizeUomKey(s) {
    return (s || '').toString().toUpperCase().replace(/[\s()]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  }
  function resolveAssignedUom(product, firma) {
    if (!firma?.paletizare_preferata) return null
    const key = normalizeUomKey(firma.paletizare_preferata)
    const uoms = (product?.product_uom || []).filter(u => u.is_orderable)
    return uoms.find(u => normalizeUomKey(u.uom_code) === key || normalizeUomKey(u.uom_name) === key)?.uom_code || null
  }
  function defaultUomFor(product, firma) {
    const uoms = (product?.product_uom || []).filter(u => u.is_orderable).sort((a, b) => a.sort_order - b.sort_order)
    return resolveAssignedUom(product, firma) || uoms.find(u => u.uom_code === 'BAX')?.uom_code || uoms[0]?.uom_code || 'ROLA'
  }

  const editFirma = editModal ? db.firms.find(f => f.id === editModal.firmId) : null

  // Produse vizibile firmei (pentru adăugare linie nouă)
  const editVisibleProducts = useMemo(() => {
    if (!editFirma) return []
    const viz = editFirma.vizibilitate_produse || 'gixen_si_proprii'
    return (db.products || []).filter(p => {
      if (!p.activ) return false
      const isPrivatAl  = p.private_brand_firm_id === editFirma.id
      const isGixen     = !p.private_brand_firm_id
      const isAltClient = p.private_brand_firm_id && !isPrivatAl
      if (isAltClient) return false
      if (viz === 'doar_proprii' && !isPrivatAl) return false
      if (viz === 'gixen_only'   && !isGixen)   return false
      return true
    })
  }, [editFirma, db.products])

  // Recalcul live (refolosește exact motorul coșului)
  const editCalc = useMemo(() => {
    if (!editModal || !editFirma) return { liniiCos: [], liniiCalculate: [], discountLinii: [], totalNet: 0, totalDiscount: 0, autoTransport: 'Van' }
    const liniiCos = (editModal.lines || []).map(l => {
      const produs = (db.products || []).find(p => p.id === l.productId)
      if (!produs || !l.cantitate) return null
      const coef = getUomCoeficient(produs, l.unitateSel)
      const cantRole = l.cantitate * coef
      const pretClient = getPretPentruClient(l.productId, editFirma.id)
      return { productId: l.productId, cantitate: l.cantitate, unitateSel: l.unitateSel, cantRole, produs, totalBrutLinie: pretClient * cantRole, pretUnitar: pretClient }
    }).filter(Boolean)
    const calc = calculeazaCos(liniiCos, editFirma, db)
    return { liniiCos, ...calc, autoTransport: detectTransportType(liniiCos) }
  }, [editModal, editFirma, db, getPretPentruClient])

  const editTransport = editModal?.transportOverride || editCalc.autoTransport
  const editTotalCuTva = Math.round(editCalc.totalNet * 1.21 * 100) / 100

  function openEditModal(order) {
    setEditModal({
      orderId: order.id,
      firmId: order.firmId,
      reason: '',
      transportOverride: null,
      lines: (order.lines || []).map(l => ({
        productId: l.productId,
        cantitate: l.cantitate,
        unitateSel: l.unitateSel || l.uomCode || l.uom_code || 'ROLA',
      })),
    })
  }

  function setEditLineQty(productId, cantitate) {
    setEditModal(prev => ({ ...prev, lines: prev.lines.map(l => l.productId === productId ? { ...l, cantitate: Math.max(0, cantitate) } : l) }))
  }
  function setEditLineUom(productId, unitateSel) {
    setEditModal(prev => ({ ...prev, lines: prev.lines.map(l => l.productId === productId ? { ...l, unitateSel } : l) }))
  }
  function removeEditLine(productId) {
    setEditModal(prev => ({ ...prev, lines: prev.lines.filter(l => l.productId !== productId) }))
  }
  function addEditLine(productId) {
    if (!productId) return
    setEditModal(prev => {
      if (prev.lines.some(l => l.productId === productId)) return prev
      const product = (db.products || []).find(p => p.id === productId)
      return { ...prev, lines: [...prev.lines, { productId, cantitate: 1, unitateSel: defaultUomFor(product, editFirma) }] }
    })
  }

  async function handleSetProformaNr() {
    if (!selected || !proformaNrInput.trim()) return
    try {
      await api.orders.setProformaNr(selected.id, proformaNrInput.trim())
      setSelected(prev => ({ ...prev, proformaNr: proformaNrInput.trim() }))
      await refreshOrders()
      showToast('Nr. intern SS salvat — monitorul va verifica plata automat')
    } catch (e) { showToast('Eroare: ' + e.message) }
  }

  async function handleSaveEdit() {
    if (!editModal) return
    if (!editCalc.liniiCalculate.length) return showToast('Comanda trebuie să aibă cel puțin o linie!')
    setEditSaving(true)
    try {
      const lines = editCalc.liniiCalculate.map(l => ({
        productId: l.productId,
        cantitate: l.cantitate,
        unitateSel: l.unitateSel,
        uom_code: l.unitateSel,
        uom_id: (l.produs.product_uom || []).find(u => u.uom_code === l.unitateSel)?.uom_id,
        pretUnitar: Math.round((l.pretAfisatPerUm != null ? l.pretAfisatPerUm : l.pretUnitar * getUomCoeficient(l.produs, l.unitateSel)) * 100) / 100,
        total: Math.round(l.totalBrutLinie * 100) / 100,
        quantity_in_rolls: l.cantRole,
      }))
      const res = await api.orders.editLines(editModal.orderId, {
        lines,
        discount_lines: editCalc.discountLinii,
        reason: editModal.reason,
        transport_type: editTransport,
      })
      await refreshOrders()
      if (res.order) setSelected(prev => (prev && prev.id === editModal.orderId ? res.order : prev))
      setEditModal(null)
      showToast('Comandă actualizată — clientul a fost notificat pe email!')
    } catch (e) {
      showToast('Eroare: ' + e.message)
    } finally {
      setEditSaving(false)
    }
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
                    <tr key={o.id} className={isSelected ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => { setSelected(o); setProformaNrInput(o.proformaNr || '') }}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(o.id)} /></td>
                      <td><CopyButton text={o.nr}><b>{o.nr}</b></CopyButton></td>
                      <td style={{ fontSize: 12 }}>{firm?.name}</td>
                      <td><b>{lei(o.total)}</b></td>
                      <td>
                        {statusBadge(o.status)}
                        {o.paymentStatus === 'asteptare_plata' && !o.proformaNr && <span className="badge" style={{background:'var(--orange-bg)',color:'var(--orange-text)',marginLeft:4,fontSize:11}}>💰 Fără nr. SS</span>}
                        {o.paymentStatus === 'asteptare_plata' && o.proformaNr && <span className="badge" style={{background:'var(--orange-bg)',color:'var(--orange-text)',marginLeft:4,fontSize:11}}>💰 Neachitată</span>}
                        {o.paymentStatus === 'platit' && <span className="badge" style={{background:'var(--green-bg)',color:'var(--green-text)',marginLeft:4,fontSize:11}}>✓ Achitată</span>}
                      </td>
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

            {/* Plată proformă (comenzi blocate de limita de credit) */}
            {(selected.proformaNr || selected.paymentStatus) && (
              <div style={{
                background: selected.paymentStatus === 'platit' ? 'var(--green-bg)' : 'var(--orange-bg)',
                borderRadius: 8, padding: '10px 14px', margin: '12px 0', fontSize: 12,
                color: selected.paymentStatus === 'platit' ? 'var(--green-text)' : 'var(--orange-text)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div>
                  {selected.paymentStatus === 'platit'
                    ? <><strong>✓ Plata proformei confirmată în Selectsoft</strong>{selected.paymentConfirmedAt && <span> · {fmtDate(selected.paymentConfirmedAt)}</span>} — comanda poate fi aprobată</>
                    : <><strong>💰 În așteptarea plății proformei</strong>{selected.proformaNr ? <span> · SS nr. intern: <b>{selected.proformaNr}</b></span> : <span> · introduceți nr. intern SS mai jos</span>}</>}
                  {selected.paymentStatus !== 'platit' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input
                        value={proformaNrInput}
                        onChange={e => setProformaNrInput(e.target.value)}
                        placeholder="Nr. intern SS proformă (ex: 0000010583)"
                        style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', fontSize: 12 }}
                      />
                      <button className="btn btn-sm btn-primary" onClick={handleSetProformaNr} disabled={!proformaNrInput.trim()}>
                        Salvează
                      </button>
                    </div>
                  )}
                </div>
                {selected.paymentStatus !== 'platit' && (
                  <button className="btn btn-sm btn-secondary" style={{ flexShrink: 0 }} onClick={async () => {
                    try {
                      const r = await api.orders.checkPayment(selected.id)
                      if (r.paid) {
                        setSelected(prev => ({ ...prev, paymentStatus: 'platit', status: 'in_aprobare' }))
                        showToast('✓ Plata confirmată în Selectsoft!')
                      } else {
                        showToast(r.reason || (r.restant != null
                          ? `Neachitat — restant ${r.restant.toFixed(2)} RON (încasat ${parseFloat(r.suma_incasari || 0).toFixed(2)} / ${parseFloat(r.suma_cu_tva || 0).toFixed(2)} RON)`
                          : 'Plata nu a fost încă înregistrată în Selectsoft'))
                      }
                    } catch (e) { showToast('Eroare verificare: ' + e.message) }
                  }}>🔄 Verifică plata în SS</button>
                )}
              </div>
            )}
            <div className="divider" />

            {/* Status flow */}
            {NEXT_STATUSES[selected.status]?.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Schimbă status:</span>
                  {selected.synced_at
                    ? <span style={{ fontSize: 11, background: 'var(--green-bg)', color: 'var(--green-text)', borderRadius: 4, padding: '2px 8px' }}>✓ Trimisă în SS</span>
                    : canEditOrder(selected) && (
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(selected)}>✏ Editează comanda</button>
                    )}
                </div>
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

            <div className="modal-order-grid" style={{ marginBottom: 16, fontSize: 13 }}>
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
              <thead><tr><th>Produs</th><th>UoM</th><th>Cant.</th><th>Preț/buc fără TVA</th><th>TVA 21%</th><th className="text-right">Total fără TVA</th><th className="text-right">Total cu TVA</th></tr></thead>
              <tbody>
                {selected.lines.map((l, i) => {
                  const p = db.products.find(p => p.id === l.productId)
                  return (
                    <tr key={i}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(p?.imagine || p?.image_url) && <img src={p.imagine || p.image_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
                        <div><div style={{fontWeight:500}}>{p?.name?.slice(0,50)}</div><div style={{fontSize:10,color:'var(--text3)'}}>{p?.cod}</div></div>
                      </td>
                      <td style={{fontSize:11,color:'var(--text3)'}}>{l.unitateSel || l.uom_code || '—'}</td>
                      <td>{l.cantitate}</td>
                      <td>{lei(l.pretUnitar)}</td>
                      <td style={{color:'var(--text3)',fontSize:12}}>{lei(tvaVal(l.pretUnitar))}</td>
                      <td className="text-right">{lei(l.total)}</td>
                      <td className="text-right"><b>{lei(cuTva(l.total))}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(() => {
              // order.netTotal = net după discount (fără TVA). order.total = gross (cu TVA).
              const subtotalLinii = (selected.lines || []).reduce((s, l) => s + (l.total || 0), 0)
              const netFinal = selected.netTotal > 0 ? selected.netTotal : subtotalLinii
              const discount = Math.round((netFinal - subtotalLinii) * 100) / 100
              return (
                <div className="summary-box" style={{ marginTop: 12 }}>
                  <div className="summary-line"><span>Subtotal fără TVA</span><span>{lei(Math.round(subtotalLinii*100)/100)}</span></div>
                  {discount !== 0 && <div className="summary-line" style={{color:'var(--green-text)'}}><span>Discounturi</span><span>{lei(discount)}</span></div>}
                  <div className="summary-line"><span>Net fără TVA</span><span><b>{lei(netFinal)}</b></span></div>
                  <div className="summary-line"><span>TVA 21%</span><span>{lei(tvaVal(netFinal))}</span></div>
                  <div className="summary-line total"><span>Total cu TVA</span><span>{leiCuTva(netFinal)}</span></div>
                </div>
              )
            })()}

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

      {/* Edit order lines modal — mini-coș */}
      {editModal && (
        <div className="modal-overlay" onClick={() => !editSaving && setEditModal(null)}>
          <div className="modal" style={{ width: 760, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>Editare comandă {editFirma ? `· ${editFirma.name}` : ''}</h3>
              <button className="modal-close" onClick={() => setEditModal(null)} disabled={editSaving}>×</button>
            </div>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
              Schimbă cantitatea sau unitatea de măsură (palet duba / TIR), elimină sau adaugă produse. Totalurile și transportul se recalculează automat.
            </div>

            <table>
              <thead>
                <tr>
                  <th>Produs</th>
                  <th style={{ width: 150 }}>Unitate măsură</th>
                  <th style={{ width: 90 }}>Cantitate</th>
                  <th className="text-right" style={{ width: 120 }}>Total linie</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {editCalc.liniiCalculate.map(l => {
                  const uoms = (l.produs.product_uom || []).filter(u => u.is_orderable).sort((a, b) => a.sort_order - b.sort_order)
                  return (
                    <tr key={l.productId}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{l.produs?.name || l.productId}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                          {l.produs?.cod} · {lei(l.pretClient)}/{primaryUom(l.produs).label}
                        </div>
                      </td>
                      <td>
                        <select value={l.unitateSel} onChange={e => setEditLineUom(l.productId, e.target.value)}
                          style={{ width: '100%', fontSize: 12, padding: '4px 6px' }}>
                          {uoms.map(u => <option key={u.uom_code} value={u.uom_code}>{u.uom_name} (×{u.coeficient})</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={1} style={{ width: 80 }} value={l.cantitate}
                          onChange={e => setEditLineQty(l.productId, parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="text-right" style={{ fontSize: 13 }}>
                        <b>{lei(cuTva(l.totalBrutLinie))}</b>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l.cantRole} {primaryUom(l.produs).label}</div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-danger" title="Elimină linia" onClick={() => removeEditLine(l.productId)}>✕</button>
                      </td>
                    </tr>
                  )
                })}
                {editCalc.liniiCalculate.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 14 }}>Nicio linie — adaugă un produs mai jos</td></tr>
                )}
              </tbody>
            </table>

            {/* Adaugă produs */}
            <div className="flex gap-8" style={{ marginTop: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>+ Adaugă produs:</span>
              <select defaultValue="" style={{ flex: 1, fontSize: 12 }}
                onChange={e => { addEditLine(e.target.value); e.target.value = '' }}>
                <option value="">— selectează produs —</option>
                {editVisibleProducts
                  .filter(p => !editModal.lines.some(l => l.productId === p.id))
                  .map(p => <option key={p.id} value={p.id}>{p.name} {p.cod ? `(${p.cod})` : ''}</option>)}
              </select>
            </div>

            {/* Transport */}
            <div className="flex gap-8" style={{ marginTop: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Transport:</span>
              <select value={editTransport}
                onChange={e => setEditModal(prev => ({ ...prev, transportOverride: e.target.value }))}
                style={{ fontSize: 12, padding: '4px 6px' }}>
                <option value="Van">Duba (Van)</option>
                <option value="Truck">TIR / Camion</option>
              </select>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                (auto-detectat: {editCalc.autoTransport === 'Truck' ? 'TIR' : 'Duba'})
              </span>
            </div>

            {/* Sumar */}
            <div className="summary-box" style={{ marginTop: 14 }}>
              <div className="summary-line"><span>Subtotal fără TVA</span><span>{lei(editCalc.totalBrut)}</span></div>
              {editCalc.totalDiscount !== 0 && <div className="summary-line" style={{ color: 'var(--green-text)' }}><span>Discounturi</span><span>{lei(-editCalc.totalDiscount)}</span></div>}
              <div className="summary-line"><span>Net fără TVA</span><span><b>{lei(editCalc.totalNet)}</b></span></div>
              <div className="summary-line"><span>TVA 21%</span><span>{lei(tvaVal(editCalc.totalNet))}</span></div>
              <div className="summary-line total"><span>Total cu TVA</span><span>{lei(editTotalCuTva)}</span></div>
            </div>

            <div style={{ margin: '14px 0 4px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Motiv modificare (trimis clientului pe email)</label>
              <textarea rows={2} style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                placeholder="ex: Nu putem produce articolul X — l-am înlocuit cu Y / am ajustat cantitatea..."
                value={editModal.reason}
                onChange={e => setEditModal(prev => ({ ...prev, reason: e.target.value }))} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)} disabled={editSaving}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={editSaving || editCalc.liniiCalculate.length === 0}>
                {editSaving ? 'Se salvează...' : 'Salvează și notifică clientul'}
              </button>
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
