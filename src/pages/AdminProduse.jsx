import { useState, useRef, useEffect } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei, fmtDate } from '../utils'
import { primaryUom } from '../promoEngine.js'
import api from '../api'

function Toast({ msg, type = 'success', onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

function ImageUpload({ imageUrl, onUpload, onRemove }) {
  const fileRef = useRef()
  const [preview, setPreview] = useState(imageUrl || null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => { setPreview(e.target.result); onUpload(file, e.target.result) }
    reader.readAsDataURL(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
      onClick={() => fileRef.current?.click()}
      style={{
        width: '100%', minHeight: 140, borderRadius: 10, cursor: 'pointer',
        border: `2px dashed ${dragging ? 'var(--blue)' : preview ? 'transparent' : 'var(--border)'}`,
        background: dragging ? 'var(--blue-bg)' : preview ? 'var(--bg)' : 'var(--bg2)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
      }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])} />
      {preview ? (
        <>
          <img src={preview} alt="Preview" style={{ maxHeight: 120, maxWidth: '90%', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={e => { e.stopPropagation(); setPreview(null); onRemove() }}
            style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'var(--red-text)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, marginBottom: 4, opacity: 0.3 }}>📷</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
            Click sau drag & drop<br />imagine produs
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>JPG, PNG, WebP · Max 5MB</div>
        </>
      )}
    </div>
  )
}

function OwnerPickerModal({ firms, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const filtered = (firms || []).filter(f => {
    const s = q.toLowerCase()
    return !s || (f.name || '').toLowerCase().includes(s) || String(f.cui || f.tax_id || '').toLowerCase().includes(s)
  })
  return (
    <div className="modal-overlay" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Alege proprietarul produsului</h3>
        <input autoFocus className="w-full" placeholder="Caută client după nume sau CUI..."
          value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div onClick={() => onSelect(null)}
            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            🏠 Gixen (produs propriu)
          </div>
          {filtered.map(f => (
            <div key={f.id} onClick={() => onSelect(f)}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{f.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.cui || f.tax_id || '—'}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 16, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>Niciun client găsit</div>}
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>Anulează</button>
      </div>
    </div>
  )
}

const EMPTY_PRODUCT = {
  name: '', cod: '', barcode: '', brand: '', categorie: 'Prosoape',
  product_type: 'P2', white_color_type: 'A', marca: 'Gixen',
  rolls_per_pack: 6, packs_per_pallet_van: 44, packs_per_pallet_truck: 56,
  location_id: '', selectsoft_cod: '', um: 'BUC', base_price: 0,
  fsinc: false, fsinc_stoc: false, fsinc_pret: false, fdiscount: false,
  activ: true, image_url: null,
}

function ClientiAsociati({ productId, customers }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selCid, setSelCid] = useState('')

  const load = () => {
    setLoading(true)
    api.products.listClients(productId).then(r => { setList(r || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [productId])

  const handleAdd = async () => {
    if (!selCid) return
    setAdding(true)
    try { await api.products.addClient(productId, selCid); load(); setSelCid('') }
    catch (e) { alert(e.message) }
    setAdding(false)
  }
  const handleRemove = async (cid) => {
    if (!confirm('Elimini asocierea?')) return
    await api.products.removeClient(productId, cid).catch(e => alert(e.message))
    load()
  }

  const existingIds = new Set(list.map(l => l.customer_id))
  const available = customers.filter(c => !existingIds.has(c.id))

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 10 }}>Clienți care văd acest produs (privat)</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
        Produsul privat este vizibil DOAR clienților de mai jos. Produsele publice (fără asocieri) sunt vizibile tuturor.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <select className="form-input" style={{ flex: 1 }} value={selCid} onChange={e => setSelCid(e.target.value)}>
          <option value="">— selectează client —</option>
          {available.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !selCid}>Adaugă</button>
      </div>
      {loading ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>Se încarcă…</div> : list.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>Niciun client asociat — produsul este public.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map(l => (
            <div key={l.customer_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: 7, padding: '8px 12px', fontSize: 13 }}>
              <span>{l.customer_name}</span>
              <button onClick={() => handleRemove(l.customer_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminProduse() {
  const { db, updateProduct, addProduct, updateProductUom, addProductPrice } = useStore()
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('detalii')
  const [ssSyncing, setSsSyncing] = useState(false)
  const [ssResult, setSsResult] = useState(null)
  const [ssSending, setSsSending] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [filterActiv, setFilterActiv] = useState('toate')
  const [filterTip, setFilterTip] = useState('toate')
  const [filterMarca, setFilterMarca] = useState('toate')
  const [search, setSearch] = useState('')
  const [addUomOpen, setAddUomOpen] = useState(false)
  const [addPretOpen, setAddPretOpen] = useState(false)
  const [newPret, setNewPret] = useState({ base_price: '', valid_from: '', valid_until: '' })
  const [newUom, setNewUom] = useState({ uom_id: '', coeficient: 1 })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false)

  const firms = db.firms || db.customers || []
  const ownerName = id => firms.find(f => f.id === id)?.name || id

  const products = (db.products || []).filter(p => {
    const matchActiv = filterActiv === 'toate' || (filterActiv === 'activ' ? p.activ : !p.activ)
    const matchTip = filterTip === 'toate' || p.product_type === filterTip
    const matchMarca = filterMarca === 'toate' || p.marca === filterMarca
    const q = search.toLowerCase()
    const matchSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.cod || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.selectsoft_cod || '').includes(q)
    return matchActiv && matchTip && matchSearch && matchMarca
  })

  const categories = [...new Set((db.products || []).map(p => p.categorie).filter(Boolean))]
  const productTypes = [...new Set((db.products || []).map(p => p.product_type).filter(Boolean))]
  const marci = [...new Set((db.products || []).map(p => p.marca).filter(Boolean))]
  const uomList = db.unit_of_measure || []
  const locations = db.locations || []

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  function openProduct(p) { setSelected(p); setEditForm({ ...p }); setTab('detalii'); setImagePreview(p.image_url || p.imagine || null) }

  function openNewProduct() {
    const defLoc = locations.find(l => l.is_default_order)
    setSelected('new')
    setEditForm({ ...EMPTY_PRODUCT, location_id: defLoc?.id || '' })
    setTab('detalii')
    setImagePreview(null)
    setImageFile(null)
  }

  function handleSave() {
    if (selected === 'new') {
      if (!editForm.name.trim()) return showToast('Completează denumirea produsului!', 'error')
      // Construiesc UoM auto din rolls_per_pack
      const rpb = editForm.rolls_per_pack || 6
      const ppv = editForm.packs_per_pallet_van || 44
      const ppt = editForm.packs_per_pallet_truck || 56
      const newProduct = {
        ...editForm,
        id: 'p_' + Date.now(),
        image_url: imagePreview, // va fi base64 în mock, URL la API
        imagine: imagePreview,
        product_uom: [
          { uom_id: 1, uom_code: 'ROLA',        uom_name: 'Rolă',           coeficient: 1,           is_orderable: true, is_offer_display: true, sort_order: 1 },
          { uom_id: 2, uom_code: 'BAX',          uom_name: 'Bax',            coeficient: rpb,         is_orderable: true, is_offer_display: true, sort_order: 2 },
          { uom_id: 3, uom_code: 'PALET_DUBA',   uom_name: 'Palet (Duba)',   coeficient: rpb * ppv,   is_orderable: true, is_offer_display: true, sort_order: 3 },
          { uom_id: 4, uom_code: 'PALET_CAMION', uom_name: 'Palet (Camion)', coeficient: rpb * ppt,   is_orderable: true, is_offer_display: true, sort_order: 4 },
        ],
        product_prices: editForm.base_price ? [{ id: Date.now(), base_price: parseFloat(editForm.base_price), is_active: true, created_at: new Date().toISOString() }] : [],
      }
      addProduct(newProduct)
      setSelected(null)
      showToast('Produs creat cu succes!')
    } else {
      updateProduct(selected.id, { ...editForm, image_url: imagePreview || editForm.image_url, imagine: imagePreview || editForm.imagine })
      setSelected({ ...selected, ...editForm })
      showToast('Produs actualizat!')
    }
  }

  function handleAddPrice() {
    if (!newPret.base_price || selected === 'new') return
    addProductPrice(selected.id, { ...newPret, base_price: parseFloat(newPret.base_price) })
    setNewPret({ base_price: '', valid_from: '', valid_until: '' })
    setAddPretOpen(false)
    showToast('Preț adăugat!')
  }

  function handleAddUom() {
    if (!newUom.uom_id || selected === 'new') return
    const uomData = uomList.find(u => u.id === parseInt(newUom.uom_id))
    if (!uomData) return
    updateProductUom(selected.id, { uom_id: uomData.id, uom_code: uomData.code, uom_name: uomData.name, coeficient: parseFloat(newUom.coeficient) || 1, is_orderable: true, is_offer_display: true, sort_order: (selected.product_uom || []).length + 1 })
    setNewUom({ uom_id: '', coeficient: 1 })
    setAddUomOpen(false)
    showToast('UoM adăugat!')
  }

  const isNew = selected === 'new'
  const currentProduct = isNew ? editForm : selected
  const TABS = isNew
    ? [{ id: 'detalii', label: 'Detalii produs' }]
    : [{ id: 'detalii', label: 'Detalii' }, { id: 'preturi', label: 'Prețuri' }, { id: 'uom', label: 'UoM' }, { id: 'clienti', label: 'Clienți asociați' }, { id: 'retetar', label: 'Rețetar' }]

  return (
    <Layout title="Produse" subtitle={`${products.length} afișate din ${(db.products || []).length}`} actions={
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" disabled={ssSyncing} onClick={async () => {
          setSsSyncing(true)
          try { const r = await api.selectsoft.syncProducts(); setSsResult(r) }
          catch (err) { setSsResult({ ok: false, error: err.message }) }
          finally { setSsSyncing(false) }
        }}>{ssSyncing ? '⏳ Sincronizare...' : '🔄 Sync produse SS'}</button>
        <button className="btn btn-primary btn-sm" onClick={openNewProduct}>+ Produs nou</button>
      </div>
    }>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {ownerPickerOpen && (
        <OwnerPickerModal firms={firms} onClose={() => setOwnerPickerOpen(false)}
          onSelect={f => {
            setEditForm(p => ({ ...p, private_brand_firm_id: f?.id || null, marca: f ? 'Client' : 'Gixen', vizibilitate: f ? 'privat' : (p.vizibilitate || 'public') }))
            setOwnerPickerOpen(false)
          }} />
      )}

      {ssResult && (
        <div className="modal-overlay" onClick={() => setSsResult(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Rezultat sincronizare Selectsoft</h3>
            {ssResult.ok === false && <p style={{ color: 'var(--red-text)' }}>Eroare: {ssResult.error}</p>}
            {ssResult.message && <p>{ssResult.message}</p>}
            {(ssResult.createdList || []).length > 0 && (
              <><h4>🆕 Create ({ssResult.createdList.length}):</h4>
              <ul style={{ fontSize: 12, maxHeight: 160, overflow: 'auto' }}>{ssResult.createdList.map((x, i) => <li key={i}>{x}</li>)}</ul></>
            )}
            {(ssResult.updatedList || []).length > 0 && (
              <><h4>♻️ Actualizate ({ssResult.updatedList.length}):</h4>
              <ul style={{ fontSize: 12, maxHeight: 160, overflow: 'auto' }}>{ssResult.updatedList.map((x, i) => <li key={i}>{x}</li>)}</ul></>
            )}
            {(ssResult.errors || []).length > 0 && (
              <><h4 style={{ color: 'var(--red-text)' }}>⚠️ Erori:</h4>
              <ul style={{ fontSize: 12, color: 'var(--red-text)' }}>{ssResult.errors.map((x, i) => <li key={i}>{x}</li>)}</ul></>
            )}
            <button className="btn btn-primary" onClick={() => setSsResult(null)}>Închide</button>
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Caută produs, cod, brand, cod SS..." style={{ flex: 1, minWidth: 200 }} value={search} onChange={e => setSearch(e.target.value)} />
          <select value={filterMarca} onChange={e => setFilterMarca(e.target.value)}>
            <option value="toate">Toate mărcile</option>
            {marci.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterTip} onChange={e => setFilterTip(e.target.value)}>
            <option value="toate">Toate tipurile</option>
            {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterActiv} onChange={e => setFilterActiv(e.target.value)}>
            <option value="toate">Toate</option>
            <option value="activ">Active</option>
            <option value="inactiv">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Produs</th><th>Proprietar</th><th>Brand</th><th>Tip</th><th>Preț bază</th><th>R/bax</th><th>Bax/Duba</th><th>Bax/TIR</th><th>Cod SS</th><th>Imagine</th><th></th></tr>
            </thead>
            <tbody>
              {products.slice(0, 100).map(p => {
                const ap = (p.product_prices || []).find(pr => pr.is_active)
                const hasImage = !!(p.image_url || p.imagine)
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openProduct(p)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {hasImage
                            ? <img src={p.image_url || p.imagine} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                            : <span style={{ fontSize: 18, opacity: 0.4 }}>🧻</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, maxWidth: 300, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.35 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.cod}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: p.private_brand_firm_id ? 'var(--blue-text)' : 'var(--text3)' }}>
                      {p.private_brand_firm_id ? ownerName(p.private_brand_firm_id) : 'Gixen'}
                    </td>
                    <td style={{ fontSize: 12 }}>{p.brand || '—'}</td>
                    <td><span style={{ fontSize: 11, padding: '1px 6px', background: 'var(--bg3)', borderRadius: 4, fontFamily: 'monospace' }}>{p.product_type || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{ap ? lei(ap.base_price) : '—'}</td>
                    <td style={{ fontSize: 12, textAlign: 'center' }}>{p.rolls_per_pack || '—'}</td>
                    <td style={{ fontSize: 12, textAlign: 'center' }}>{p.packs_per_pallet_van || '—'}</td>
                    <td style={{ fontSize: 12, textAlign: 'center' }}>{p.packs_per_pallet_truck || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.selectsoft_cod || '—'}</td>
                    <td>{hasImage ? <span style={{ color: 'var(--green-text)' }}>✓</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: p.activ ? 'var(--green-bg)' : 'var(--bg3)', color: p.activ ? 'var(--green-text)' : 'var(--text3)', fontWeight: 600 }}>
                        {p.activ ? 'Activ' : 'Inactiv'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {products.length > 100 && (
          <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
            Se afișează primele 100 din {products.length} produse. Folosește filtrele pentru a restrânge.
          </div>
        )}
      </div>

      {/* Detail/Create panel */}
      {(selected || isNew) && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelected(null)}>
          <div style={{ width: 740, background: 'var(--white)', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{isNew ? '✨ Produs nou' : editForm.name?.slice(0, 60)}</div>
                {!isNew && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.cod} · SS: {selected.selectsoft_cod || '—'}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!isNew && (
                  <button className="btn btn-secondary btn-sm" disabled={ssSending} onClick={async () => {
                    setSsSending(true)
                    try { const r = await api.products.syncSS(selected.id); showToast(r?.message || '✓ Trimis în SS') }
                    catch (err) { showToast('Eroare SS: ' + err.message, 'error') }
                    finally { setSsSending(false) }
                  }}>{ssSending ? '⏳...' : '📤 Trimite în SS'}</button>
                )}
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent', color: tab === t.id ? 'var(--blue)' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400, fontSize: 12, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* TAB DETALII */}
              {tab === 'detalii' && (
                <div>
                  {/* Image upload */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>Imagine produs</label>
                    <ImageUpload
                      imageUrl={imagePreview || editForm.image_url || editForm.imagine}
                      onUpload={(file, preview) => { setImageFile(file); setImagePreview(preview) }}
                      onRemove={() => { setImageFile(null); setImagePreview(null) }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                      <label>Denumire produs *</label>
                      <input className="w-full" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: P2A300 PROSOP ALB 2S 300G H19 D21" />
                    </div>
                    {[['Cod intern', 'cod'], ['Cod bare (EAN)', 'barcode'], ['Brand', 'brand'], ['Cod SelectSoft', 'selectsoft_cod']].map(([l, k]) => (
                      <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                        <label>{l}</label>
                        <input className="w-full" value={editForm[k] || ''} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Proprietar produs</label>
                      <button type="button" className="w-full" onClick={() => setOwnerPickerOpen(true)}
                        style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', fontSize: 13 }}>
                        {editForm.private_brand_firm_id
                          ? <>👤 {ownerName(editForm.private_brand_firm_id)}</>
                          : <>🏠 Gixen (produs propriu)</>}
                      </button>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Vizibilitate</label>
                      <select className="w-full" value={(editForm.vizibilitate || 'public').startsWith('privat') ? 'privat' : 'public'}
                        onChange={e => setEditForm(p => ({ ...p, vizibilitate: e.target.value }))}>
                        <option value="public">Public (vizibil tuturor clienților)</option>
                        <option value="privat">Privat (doar proprietarul)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Tip produs</label>
                      <select className="w-full" value={editForm.product_type || 'P2'} onChange={e => setEditForm(p => ({ ...p, product_type: e.target.value }))}>
                        {['P2', 'P3', 'P4', 'HIG'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Categorie</label>
                      <select className="w-full" value={editForm.categorie || ''} onChange={e => setEditForm(p => ({ ...p, categorie: e.target.value }))}>
                        <option value="Prosoape">Prosoape</option>
                        <option value="Hârtie igienică">Hârtie igienică</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Gestiune</label>
                      <select className="w-full" value={editForm.location_id || ''} onChange={e => setEditForm(p => ({ ...p, location_id: e.target.value }))}>
                        <option value="">—</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="section-title" style={{ marginBottom: 10, marginTop: 20 }}>Ambalare (definește UoM automat)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[[`${primaryUom(editForm).label.charAt(0).toUpperCase() + primaryUom(editForm).label.slice(1)} / Bax`, 'rolls_per_pack'], ['Baxuri / Palet Duba', 'packs_per_pallet_van'], ['Baxuri / Palet Camion', 'packs_per_pallet_truck']].map(([l, k]) => (
                      <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                        <label>{l}</label>
                        <input type="number" min={1} className="w-full" value={editForm[k] || ''} onChange={e => setEditForm(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))} />
                      </div>
                    ))}
                  </div>

                  {/* UoM preview */}
                  {editForm.rolls_per_pack > 0 && (
                    <div style={{ background: 'var(--blue-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--blue-text)' }}>
                      {(() => { const u = primaryUom(editForm).label; return <>📦 <strong>1 BAX</strong> = {editForm.rolls_per_pack} {u} · <strong>1 PALET DUBA</strong> = {editForm.rolls_per_pack * (editForm.packs_per_pallet_van || 0)} {u} · <strong>1 PALET CAMION</strong> = {editForm.rolls_per_pack * (editForm.packs_per_pallet_truck || 0)} {u}</> })()}
                    </div>
                  )}

                  {isNew && (
                    <div className="form-group">
                      <label>Preț de bază (RON/rolă)</label>
                      <input type="number" step="0.01" min={0} className="w-full" value={editForm.base_price || ''} onChange={e => setEditForm(p => ({ ...p, base_price: e.target.value }))} placeholder="Ex: 3.20" />
                    </div>
                  )}

                  {!isNew && (
                    <>
                      <div className="section-title" style={{ marginBottom: 10, marginTop: 20 }}>Flags SelectSoft</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {[['Nu sync produs', 'fsinc'], ['Nu sync stoc', 'fsinc_stoc'], ['Nu sync preț', 'fsinc_pret'], ['Fără discount', 'fdiscount']].map(([l, k]) => (
                          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                            <input type="checkbox" checked={editForm[k] || false} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.checked }))} />
                            {l}
                          </label>
                        ))}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
                        <input type="checkbox" checked={editForm.activ !== false} onChange={e => setEditForm(p => ({ ...p, activ: e.target.checked }))} />
                        <strong>Produs activ</strong>
                      </label>
                    </>
                  )}

                  {!isNew && (
                    <>
                      <div className="section-title" style={{ marginBottom: 10, marginTop: 20 }}>Fișă tehnică (PDF)</div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        {editForm.datasheet_url ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" type="button"
                              onClick={() => window.open(editForm.datasheet_url, '_blank')}>📄 Vizualizează PDF</button>
                            <button className="btn btn-ghost btn-sm" type="button" style={{ color: 'var(--red)' }}
                              onClick={async () => {
                                try {
                                  await api.products.deleteDatasheet(selected.id)
                                  setEditForm(p => ({ ...p, datasheet_url: null }))
                                } catch (err) { alert(err.message) }
                              }}>✕ Șterge</button>
                          </div>
                        ) : (
                          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                            📤 Încarcă fișă tehnică PDF
                            <input type="file" accept=".pdf" style={{ display: 'none' }}
                              onChange={async e => {
                                const file = e.target.files[0]
                                if (!file) return
                                try {
                                  const r = await api.products.uploadDatasheet(selected.id, file)
                                  setEditForm(p => ({ ...p, datasheet_url: r.datasheet_url }))
                                } catch (err) { alert(err.message) }
                              }} />
                          </label>
                        )}
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <label style={{ fontSize: 12, color: 'var(--text2)' }}>Specificații tehnice</label>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => {
                            const specs = editForm.specs_json ? (typeof editForm.specs_json === 'string' ? JSON.parse(editForm.specs_json) : editForm.specs_json) : []
                            setEditForm(p => ({ ...p, specs_json: [...specs, { key: '', value: '' }] }))
                          }}>+ Adaugă</button>
                        </div>
                        {(() => {
                          const specs = editForm.specs_json ? (typeof editForm.specs_json === 'string' ? JSON.parse(editForm.specs_json) : editForm.specs_json) : []
                          if (!specs.length) return <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nicio specificație adăugată</div>
                          return specs.map((s, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                              <input type="text" value={s.key} placeholder="Proprietate (ex: Gramaj)"
                                onChange={e => {
                                  const ns = [...specs]; ns[i] = { ...ns[i], key: e.target.value }
                                  setEditForm(p => ({ ...p, specs_json: ns }))
                                }} />
                              <input type="text" value={s.value} placeholder="Valoare (ex: 2×800g)"
                                onChange={e => {
                                  const ns = [...specs]; ns[i] = { ...ns[i], value: e.target.value }
                                  setEditForm(p => ({ ...p, specs_json: ns }))
                                }} />
                              <button className="btn btn-ghost btn-sm" type="button" style={{ color: 'var(--red)' }}
                                onClick={() => {
                                  const ns = specs.filter((_, j) => j !== i)
                                  setEditForm(p => ({ ...p, specs_json: ns }))
                                }}>✕</button>
                            </div>
                          ))
                        })()}
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleSave}>{isNew ? '✨ Creează produs' : 'Salvează'}</button>
                    <button className="btn btn-secondary" onClick={() => setSelected(null)}>Anulează</button>
                  </div>
                </div>
              )}

              {/* TAB PREȚURI */}
              {tab === 'preturi' && !isNew && (
                <div>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <div className="section-title">Istoric prețuri (preț bază per rolă, fără TVA)</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setAddPretOpen(true)}>+ Preț nou</button>
                  </div>
                  <div className="table-wrap" style={{ marginBottom: 16 }}>
                    <table>
                      <thead><tr><th>Preț bază/rolă</th><th>Preț cu TVA 21%</th><th>De la</th><th>Până la</th><th>Status</th></tr></thead>
                      <tbody>
                        {(selected.product_prices || []).map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{lei(p.base_price)}</td>
                            <td style={{ color: 'var(--text3)' }}>{lei(Math.round(p.base_price * 1.21 * 100) / 100)}</td>
                            <td>{p.valid_from || '—'}</td>
                            <td>{p.valid_until || 'Nelimitat'}</td>
                            <td>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: p.is_active ? 'var(--green-bg)' : 'var(--bg3)', color: p.is_active ? 'var(--green-text)' : 'var(--text3)', fontWeight: 600 }}>
                                {p.is_active ? 'Activ' : 'Arhivat'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {addPretOpen && (
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Preț bază (RON/rolă, fără TVA)</label>
                          <input type="number" step="0.01" className="w-full" value={newPret.base_price} onChange={e => setNewPret(p => ({ ...p, base_price: e.target.value }))} />
                          {newPret.base_price && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Cu TVA: {lei(parseFloat(newPret.base_price) * 1.21)}</div>}
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Valabil de la</label>
                          <input type="date" className="w-full" value={newPret.valid_from} onChange={e => setNewPret(p => ({ ...p, valid_from: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Valabil până la</label>
                          <input type="date" className="w-full" value={newPret.valid_until} onChange={e => setNewPret(p => ({ ...p, valid_until: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddPretOpen(false)}>Anulează</button>
                        <button className="btn btn-primary btn-sm" onClick={handleAddPrice}>Adaugă preț</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB UOM */}
              {tab === 'uom' && !isNew && (
                <div>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <div className="section-title">Unități de măsură</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setAddUomOpen(true)}>+ Adaugă UoM</button>
                  </div>
                  <div className="table-wrap" style={{ marginBottom: 16 }}>
                    <table>
                      <thead><tr><th>UoM</th><th>Coeficient</th><th>= Role</th><th>Comandabil</th><th>Afișat ofertă</th></tr></thead>
                      <tbody>
                        {(selected.product_uom || []).sort((a, b) => a.sort_order - b.sort_order).map(u => (
                          <tr key={u.uom_code}>
                            <td><span style={{ fontWeight: 700 }}>{u.uom_name}</span></td>
                            <td>× {u.coeficient}</td>
                            <td style={{ color: 'var(--text3)', fontSize: 12 }}>= {u.coeficient} role</td>
                            <td>{u.is_orderable ? '✓' : '✗'}</td>
                            <td>{u.is_offer_display ? '✓' : '✗'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {selected.rolls_per_pack && (
                    <div style={{ background: 'var(--blue-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--blue-text)' }}>
                      📦 1 Bax = <strong>{selected.rolls_per_pack}</strong> role · 1 Palet Duba = <strong>{selected.rolls_per_pack * (selected.packs_per_pallet_van || 0)}</strong> role · 1 Palet Camion = <strong>{selected.rolls_per_pack * (selected.packs_per_pallet_truck || 0)}</strong> role
                    </div>
                  )}
                  {addUomOpen && (
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginTop: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Unitate de măsură</label>
                          <select className="w-full" value={newUom.uom_id} onChange={e => setNewUom(p => ({ ...p, uom_id: e.target.value }))}>
                            <option value="">Selectează...</option>
                            {uomList.filter(u => !(selected.product_uom || []).find(pu => pu.uom_id === u.id)).map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Coeficient (câte role)</label>
                          <input type="number" min={1} className="w-full" value={newUom.coeficient} onChange={e => setNewUom(p => ({ ...p, coeficient: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddUomOpen(false)}>Anulează</button>
                        <button className="btn btn-primary btn-sm" onClick={handleAddUom}>Adaugă</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CLIENȚI ASOCIAȚI */}
              {tab === 'clienti' && !isNew && (
                <ClientiAsociati productId={selected.id} customers={db.firms || db.customers || []} />
              )}

              {/* TAB REȚETAR */}
              {tab === 'retetar' && !isNew && (
                <div>
                  <div className="section-title" style={{ marginBottom: 12 }}>Rețetar produs finit</div>
                  {(() => {
                    const recipe = (db.recipes || []).find(r => r.product_id === selected.id && r.is_active)
                    if (!recipe) return (
                      <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                        Niciun rețetar definit. Accesează secțiunea <strong>Rețetar</strong> din meniu.
                      </div>
                    )
                    const costTotal = (recipe.items || []).reduce((s, i) => s + (i.cantitate * i.cost_unitar), 0)
                    return (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{recipe.name} (v{recipe.version})</div>
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>Componentă</th><th>Cantitate</th><th>UM</th><th>Cost/UM</th><th>Subtotal</th></tr></thead>
                            <tbody>
                              {(recipe.items || []).map(item => (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 500 }}>{item.component_name}</td>
                                  <td>{item.cantitate}</td>
                                  <td style={{ color: 'var(--text3)' }}>{item.uom_code}</td>
                                  <td>{item.cost_unitar?.toFixed(4)} RON</td>
                                  <td style={{ fontWeight: 600 }}>{(item.cantitate * item.cost_unitar).toFixed(4)} RON</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ marginTop: 10, padding: '8px 14px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 13, color: 'var(--green-text)' }}>
                          <strong>Cost producție: {costTotal.toFixed(4)} RON/buc</strong>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
