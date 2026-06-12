import { useState, useCallback } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { useNavigate } from 'react-router-dom'
import { lei, fmtDate } from '../utils'
import CopyButton from '../components/CopyButton'

const STATUS_CONFIG = {
  emisa:     { label: 'Emisă',     cls: 'badge-blue' },
  acceptata: { label: 'Acceptată', cls: 'badge-green' },
  expirata:  { label: 'Expirată',  cls: 'badge-red' },
  anulata:   { label: 'Anulată',   cls: 'badge-gray' },
}

function Toast({ msg, onDone }) {
  return <div className="toast success" onClick={onDone} style={{ cursor: 'pointer' }}>✓ {msg}</div>
}

export default function AdminOferte() {
  const { db, updateOfferStatus, deleteOffer, saveOffer } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('toate')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const offers = (db.offers || []).filter(o => filter === 'toate' || o.status === filter)

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }, [])

  const handleCopy = useCallback((offer) => {
    const now = Date.now()
    const rand = Math.floor(Math.random() * 900) + 100
    const newOffer = {
      ...JSON.parse(JSON.stringify(offer)),
      id: 'of' + now,
      nr: 'OF-' + new Date(now).getFullYear() + '-' + String(rand),
      dataEmitere: new Date(now).toISOString().split('T')[0],
      dataExpirare: new Date(now + (offer.valabilitate || 15) * 86400000).toISOString().split('T')[0],
      status: 'emisa',
      firmId: '',
      clientName: '',
    }
    saveOffer(newOffer)
    showToast('Ofertă copiată! O găsești în lista de mai jos.')
  }, [saveOffer, showToast])

  function handleStatusChange(offerId, status) {
    updateOfferStatus(offerId, status)
    if (selected?.id === offerId) setSelected(prev => ({ ...prev, status }))
    showToast(`Status actualizat: ${STATUS_CONFIG[status]?.label}`)
  }

  function handleDelete(offerId) {
    deleteOffer(offerId)
    setConfirmDelete(null)
    setSelected(null)
    showToast('Ofertă ștearsă.')
  }

  // Deschide oferta într-o fereastră de print → utilizatorul salvează ca PDF
  function handlePrintPdf(offer) {
    const rows = (offer.linii || []).map(l => {
      const prod = db.products.find(p => p.id === l.productId)
      return `<tr>
        <td>${prod?.name || l.productId}</td>
        <td style="text-align:center">${l.cantitate} ${l.unitateSel || ''}</td>
        <td style="text-align:right">${(l.pretUnitar || 0).toFixed(2)} RON</td>
        <td style="text-align:right"><b>${(l.total || 0).toFixed(2)} RON</b></td>
      </tr>`
    }).join('')
    const discRows = (offer.discountLinii || []).map(d =>
      `<tr style="color:#15803d"><td colspan="3" style="font-style:italic;padding-left:24px">└ ${d.eticheta || 'Discount'}</td><td style="text-align:right">${(d.valoare || 0).toFixed(2)} RON</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ofertă ${offer.nr}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 24px auto; color: #0f172a; font-size: 13px; }
        h1 { font-size: 22px; color: #21376c; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #21376c; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
        td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
        .totals { margin-top: 16px; margin-left: auto; width: 280px; }
        .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
        .totals .big { font-size: 16px; font-weight: 700; border-top: 2px solid #21376c; padding-top: 8px; }
        .meta { color: #64748b; font-size: 12px; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h1>GIXEN — Ofertă comercială</h1>
      <div class="meta">Nr. ${offer.nr} · Emisă: ${offer.dataEmitere || ''} · Valabilă până la: ${offer.dataExpirare || ''}</div>
      <div class="meta" style="margin-top:8px"><b>Client:</b> ${offer.clientName || '—'}</div>
      <table>
        <thead><tr><th>Produs</th><th style="text-align:center">Cantitate</th><th style="text-align:right">Preț/rolă fără TVA</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}${discRows}</tbody>
      </table>
      <div class="totals">
        <div><span>Total net (fără TVA)</span><span>${(offer.totalNet || 0).toFixed(2)} RON</span></div>
        <div><span>TVA 21%</span><span>${(offer.tva || 0).toFixed(2)} RON</span></div>
        <div class="big"><span>Total cu TVA</span><span>${(offer.totalCuTva || 0).toFixed(2)} RON</span></div>
      </div>
      ${offer.observatii ? `<p class="meta" style="margin-top:20px"><b>Observații:</b> ${offer.observatii}</p>` : ''}
      <script>window.onload = () => setTimeout(() => window.print(), 300)</` + `script>
      </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  // Editează oferta pentru alt client — preîncarcă produsele în generator
  function handleEditForClient(offer) {
    const productIds = offer.products_selected || (offer.linii || []).map(l => l.productId)
    navigate('/admin/oferta', { state: { products: productIds, fromOffer: offer.nr } })
  }

  const totalOferte = (db.offers || []).length
  const totalValoare = (db.offers || [])
    .filter(o => o.status !== 'anulata')
    .reduce((s, o) => s + (o.totalNet || 0), 0)

  return (
    <Layout title="Oferte emise"
      subtitle="Istoric și gestiune oferte comerciale"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/oferta')}>
          + Ofertă nouă
        </button>
      }>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* KPIs rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total oferte', val: totalOferte, icon: '📄' },
          { label: 'Valoare totală', val: lei(totalValoare), icon: '💰' },
          { label: 'Acceptate', val: (db.offers||[]).filter(o=>o.status==='acceptata').length, icon: '✅' },
          { label: 'Expirate', val: (db.offers||[]).filter(o=>o.status==='expirata').length, icon: '⏰' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8">
          {[['toate','Toate'], ['emisa','Emise'], ['acceptata','Acceptate'], ['expirata','Expirate'], ['anulata','Anulate']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${filter===v?'btn-primary':'btn-secondary'}`} onClick={() => setFilter(v)}>
              {l}
              {v !== 'toate' && (
                <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '0 5px' }}>
                  {(db.offers||[]).filter(o=>o.status===v).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel oferte */}
      <div className="card">
        {offers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-title">Nicio ofertă</div>
            <div className="empty-state-sub">Creează prima ofertă comercială din butonul de sus.</div>
            <button className="btn btn-primary" onClick={() => navigate('/admin/oferta')}>+ Ofertă nouă</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nr. ofertă</th>
                  <th>Client</th>
                  <th>Data emiterii</th>
                  <th>Valabilă până la</th>
                  <th>Total net</th>
                  <th>Total cu TVA</th>
                  <th>Status</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => {
                  const sc = STATUS_CONFIG[offer.status] || STATUS_CONFIG.emisa
                  return (
                    <tr key={offer.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(offer)}>
                      <td><CopyButton text={offer.nr}><b>{offer.nr}</b></CopyButton></td>
                      <td>{offer.clientName || '—'}</td>
                      <td style={{ fontSize: 12 }}>{fmtDate(offer.dataEmitere)}</td>
                      <td style={{ fontSize: 12, color: offer.dataExpirare < new Date().toISOString().split('T')[0] ? 'var(--red-text)' : 'var(--text2)' }}>
                        {fmtDate(offer.dataExpirare)}
                      </td>
                      <td><b>{lei(offer.totalNet || 0)}</b></td>
                      <td>{lei(offer.totalCuTva || 0)}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-8">
                          <button className="btn btn-secondary btn-sm" onClick={() => handlePrintPdf(offer)} title="Salvează / printează PDF">🖨</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEditForClient(offer)} title="Editează pentru alt client">✎</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(offer)} title="Copiază pentru client nou">
                            ⧉ Copiază
                          </button>
                          {offer.status === 'emisa' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(offer.id, 'acceptata')}>
                              ✓ Acceptată
                            </button>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(offer.id)} title="Șterge">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalii ofertă */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><CopyButton text={selected.nr}>Ofertă {selected.nr}</CopyButton></h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div><div className="text-muted">Client</div><b>{selected.clientName || '—'}</b></div>
              <div><div className="text-muted">Status</div><span className={`badge ${STATUS_CONFIG[selected.status]?.cls}`}>{STATUS_CONFIG[selected.status]?.label}</span></div>
              <div><div className="text-muted">Data emiterii</div>{fmtDate(selected.dataEmitere)}</div>
              <div><div className="text-muted">Valabilă până la</div>{fmtDate(selected.dataExpirare)}</div>
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>Linii ofertă</div>
            <table>
              <thead><tr><th>Produs</th><th>Cant.</th><th>Preț/rolă</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {(selected.linii || []).map((l, i) => {
                  const prod = db.products.find(p => p.id === l.productId)
                  const discLinii = (selected.discountLinii || []).filter(d => d.refLinie === i)
                  return (
                    <>
                      <tr key={i}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {prod?.imagine && <img src={prod.imagine} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
                          {prod?.name || l.productId}
                        </td>
                        <td>{l.cantitate} {l.unitateSel}</td>
                        <td>{lei(l.pretUnitar)}</td>
                        <td className="text-right"><b>{lei(l.total)}</b></td>
                      </tr>
                      {discLinii.map((d, di) => (
                        <tr key={`disc_${i}_${di}`} style={{ background: 'var(--green-bg)' }}>
                          <td colSpan={3} style={{ fontSize: 11, color: 'var(--green-text)', fontStyle: 'italic', paddingLeft: 36 }}>
                            └ {d.eticheta}{d.procent ? ` (−${d.procent}%)` : ''}
                          </td>
                          <td className="text-right" style={{ color: 'var(--green-text)', fontWeight: 600, fontSize: 12 }}>
                            {lei(d.valoare)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>

            <div className="summary-box" style={{ marginTop: 12 }}>
              <div className="summary-line"><span>Total brut</span><span>{lei(selected.totalBrut || 0)}</span></div>
              {(selected.totalDiscount || 0) < 0 && (
                <div className="summary-line summary-discount"><span>Total reduceri</span><span>{lei(selected.totalDiscount)}</span></div>
              )}
              <div className="summary-line"><span>Total net (fără TVA)</span><span>{lei(selected.totalNet || 0)}</span></div>
              <div className="summary-line"><span>TVA 21%</span><span>{lei(selected.tva || 0)}</span></div>
              <div className="summary-line total"><span>Total cu TVA</span><span>{lei(selected.totalCuTva || 0)}</span></div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => handlePrintPdf(selected)}>🖨 Salvează PDF</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleEditForClient(selected)}>✎ Editează pt. alt client</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(selected)}>⧉ Copiază ofertă</button>
              {selected.status === 'emisa' && (
                <>
                  <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(selected.id, 'acceptata')}>✓ Marchează acceptată</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(selected.id, 'anulata')}>✕ Anulează</button>
                </>
              )}
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 360 }}>
            <div className="modal-hdr"><h3>Șterge ofertă</h3><button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button></div>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Oferta va fi ștearsă permanent. Nu se poate recupera.</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Anulează</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Da, șterge</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
