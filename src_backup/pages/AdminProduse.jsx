import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei } from '../utils'

function Toast({ msg, onDone }) {
  return <div className="toast success" onClick={onDone} style={{ cursor: 'pointer' }}>✓ {msg}</div>
}

function TierEditor({ tiers, onChange }) {
  function setTier(i, field, val) {
    const next = tiers.map((t, idx) =>
      idx === i ? { ...t, [field]: field === 'pret' ? parseFloat(val) || 0 : parseInt(val) || 0 } : t
    )
    onChange(next)
  }

  function addTier() {
    const last = tiers[tiers.length - 1]
    const newMin = last ? last.cantMax + 1 : 1
    onChange([...tiers, { cantMin: newMin, cantMax: newMin + 99, pret: last?.pret || 0 }])
  }

  function removeTier(i) {
    if (tiers.length <= 1) return
    onChange(tiers.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>De la (cant.)</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Până la</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preț / unitate</div>
        <div />
      </div>
      {tiers.map((t, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input type="number" min={0} value={t.cantMin}
            onChange={e => setTier(i, 'cantMin', e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px' }} />
          <input type="number" min={0}
            value={t.cantMax >= 9999 ? '' : t.cantMax}
            placeholder="∞"
            onChange={e => setTier(i, 'cantMax', e.target.value || 9999)}
            style={{ fontSize: 13, padding: '6px 10px' }} />
          <div style={{ position: 'relative' }}>
            <input type="number" step="0.01" min={0} value={t.pret}
              onChange={e => setTier(i, 'pret', e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', width: '100%', paddingRight: 36 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text3)' }}>RON</span>
          </div>
          <button
            onClick={() => removeTier(i)}
            disabled={tiers.length <= 1}
            style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: tiers.length <= 1 ? 'var(--bg)' : 'var(--red-bg)', color: tiers.length <= 1 ? 'var(--text3)' : 'var(--red-text)', cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addTier} style={{ marginTop: 4 }}>
        + Adaugă tier
      </button>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
        Lasă "Până la" gol pentru cantitate nelimitată (∞)
      </div>
    </div>
  )
}

// Global tier pricing editor — applies same structure to all products
function GlobalTierModal({ products, onSave, onClose }) {
  const [globalTiers, setGlobalTiers] = useState([
    { cantMin: 1, cantMax: 99, pret: 0 },
    { cantMin: 100, cantMax: 499, pret: 0 },
    { cantMin: 500, cantMax: 9999, pret: 0 },
  ])
  const [applyMode, setApplyMode] = useState('structure') // 'structure' | 'prices'
  const [selectedIds, setSelectedIds] = useState([])

  function toggleProduct(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSave() {
    if (selectedIds.length === 0) return
    onSave(selectedIds, globalTiers, applyMode)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>Editare globală tier pricing</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ marginBottom: 8 }}>Ce să aplici:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
              <input type="radio" checked={applyMode === 'structure'} onChange={() => setApplyMode('structure')} />
              Structura tier-urilor (cantități)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
              <input type="radio" checked={applyMode === 'prices'} onChange={() => setApplyMode('prices')} />
              Și prețurile (suprascrie tot)
            </label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {applyMode === 'structure'
              ? 'Aplică doar cantitățile min/max — prețurile rămân cele existente per produs'
              : 'Aplică cantitățile ȘI prețurile — suprascrie complet tier pricing-ul selectat'}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ marginBottom: 8 }}>Structura tier-uri:</label>
          <TierEditor tiers={globalTiers} onChange={setGlobalTiers} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label>Aplică la produsele:</label>
            <button className="btn btn-ghost btn-sm" onClick={() =>
              setSelectedIds(selectedIds.length === products.length ? [] : products.map(p => p.id))
            }>
              {selectedIds.length === products.length ? 'Deselectează toate' : 'Selectează toate'}
            </button>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            {products.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer', borderRadius: 4 }}>
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                <span style={{ fontSize: 12 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{p.cod}</span>
              </label>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--blue-text)', marginTop: 4 }}>
              {selectedIds.length} produs(e) selectate
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Anulează</button>
          <button className="btn btn-primary" disabled={selectedIds.length === 0} onClick={handleSave}>
            Aplică la {selectedIds.length} produs(e)
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminProduse() {
  const { db, updateProduct, addProduct } = useStore()
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(null)
  const [imgPreviewErr, setImgPreviewErr] = useState(false)
  const [toast, setToast] = useState(null)
  const [showGlobal, setShowGlobal] = useState(false)
  const [search, setSearch] = useState('')

  const emptyProduct = {
    cod: '', name: '', categorie: '', pretBaza: '', unitate: 'rola',
    stoc: 0, activ: true, imagine: '',
    tierPricing: [
      { cantMin: 1, cantMax: 99, pret: 0 },
      { cantMin: 100, cantMax: 499, pret: 0 },
      { cantMin: 500, cantMax: 9999, pret: 0 },
    ]
  }

  const filtered = db.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cod.toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(product) {
    setSelected(product)
    setForm({ ...product, tierPricing: product.tierPricing.map(t => ({ ...t })) })
    setIsNew(false)
    setImgPreviewErr(false)
  }

  function openNew() {
    setSelected(null)
    setForm({ ...emptyProduct, tierPricing: emptyProduct.tierPricing.map(t => ({ ...t })) })
    setIsNew(true)
    setImgPreviewErr(false)
  }

  function handleSave() {
    if (isNew) addProduct(form)
    else updateProduct(selected.id, form)
    setForm(null)
    showToast(isNew ? 'Produs adăugat!' : 'Salvat!')
  }

  function handleGlobalSave(productIds, tiers, mode) {
    productIds.forEach(id => {
      const product = db.products.find(p => p.id === id)
      if (!product) return
      let newTiers
      if (mode === 'structure') {
        // Keep existing prices, just update cantMin/cantMax structure
        newTiers = tiers.map((t, i) => ({
          cantMin: t.cantMin,
          cantMax: t.cantMax,
          pret: product.tierPricing[i]?.pret || product.pretBaza || t.pret
        }))
      } else {
        newTiers = tiers.map(t => ({ ...t }))
      }
      updateProduct(id, { tierPricing: newTiers })
    })
    setShowGlobal(false)
    showToast(`Tier pricing actualizat pentru ${productIds.length} produse!`)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const imgPreview = form?.imagine && !imgPreviewErr

  return (
    <Layout title="Gestiune produse" actions={
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowGlobal(true)}>
          ⚙ Tier pricing global
        </button>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Produs nou</button>
      </div>
    }>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <div className="card" style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Caută produs după nume sau cod..."
          style={{ width: 300 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 52 }}></th>
                <th>Cod</th>
                <th>Produs</th>
                <th>Categorie</th>
                <th>Preț bază</th>
                <th>Tier-uri</th>
                <th>Stoc</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
                  <td>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {p.imagine
                        ? <img src={p.imagine} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                        : <span style={{ fontSize: 20 }}>🧻</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.cod}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{p.categorie}</td>
                  <td>{lei(p.pretBaza)}/{p.unitate}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {p.tierPricing.map((t, i) => (
                        <div key={i} style={{ fontSize: 10, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {t.cantMin}–{t.cantMax >= 9999 ? '∞' : t.cantMax}: <b>{lei(t.pret)}</b>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: p.stoc > 1000 ? 'var(--green)' : p.stoc > 0 ? 'var(--orange-text)' : 'var(--red-text)', fontSize: 12 }}>
                      {p.stoc.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.activ ? 'badge-green' : 'badge-gray'}`}>
                      {p.activ ? 'Activ' : 'Inactiv'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏ Editează</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New modal */}
      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNew ? 'Produs nou' : `Editează — ${selected?.name}`}</h3>
              <button className="modal-close" onClick={() => setForm(null)}>×</button>
            </div>

            {/* Image */}
            <div style={{ marginBottom: 20 }}>
              <label>Imagine produs</label>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 6 }}>
                <div style={{ width: 90, height: 90, flexShrink: 0, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imgPreview
                    ? <img src={form.imagine} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setImgPreviewErr(true)} />
                    : <span style={{ fontSize: 32 }}>🧻</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="text" className="w-full" placeholder="/images/nume.png sau https://..."
                    value={form.imagine || ''} style={{ marginBottom: 6 }}
                    onChange={e => { setImgPreviewErr(false); setForm({ ...form, imagine: e.target.value }) }} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                    Local: pune în <code>public/images/</code> și scrie <code>/images/nume.png</code><br />
                    Extern: lipește URL-ul direct
                  </div>
                  {form.imagine && (
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 6 }}
                      onClick={() => { setForm({ ...form, imagine: '' }); setImgPreviewErr(false) }}>
                      🗑 Șterge
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* Info */}
            <div className="form-row">
              <div className="form-group">
                <label>Cod produs</label>
                <input className="w-full" value={form.cod} onChange={e => setForm({ ...form, cod: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Categorie</label>
                <input className="w-full" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Denumire produs</label>
              <input className="w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preț bază</label>
                <input type="number" step="0.01" className="w-full" value={form.pretBaza}
                  onChange={e => setForm({ ...form, pretBaza: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label>Unitate</label>
                <select className="w-full" value={form.unitate} onChange={e => setForm({ ...form, unitate: e.target.value })}>
                  <option value="rola">rolă</option>
                  <option value="pachet">pachet</option>
                  <option value="buc">buc</option>
                  <option value="cutie">cutie</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Stoc curent</label>
                <input type="number" className="w-full" value={form.stoc}
                  onChange={e => setForm({ ...form, stoc: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                  <input type="checkbox" checked={form.activ}
                    onChange={e => setForm({ ...form, activ: e.target.checked })} />
                  Produs activ
                </label>
              </div>
            </div>

            <div className="divider" />

            <div style={{ marginBottom: 10 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Tier pricing</div>
              <TierEditor
                tiers={form.tierPricing}
                onChange={tiers => setForm({ ...form, tierPricing: tiers })}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {isNew ? 'Adaugă produs' : 'Salvează modificările'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global tier modal */}
      {showGlobal && (
        <GlobalTierModal
          products={db.products.filter(p => p.activ)}
          onSave={handleGlobalSave}
          onClose={() => setShowGlobal(false)}
        />
      )}
    </Layout>
  )
}
