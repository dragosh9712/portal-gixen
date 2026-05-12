import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei } from '../utils'

function ProductImage({ src, style }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        🧻
      </div>
    )
  }
  return <img src={src} alt="" style={style} onError={() => setErr(true)} />
}

export default function AdminProduse() {
  const { db, updateProduct, addProduct } = useStore()
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [imgPreviewErr, setImgPreviewErr] = useState(false)

  const emptyProduct = {
    cod: '', name: '', categorie: '', pretBaza: '', unitate: 'rola', stoc: 0, activ: true, imagine: '',
    tierPricing: [
      { cantMin: 1, cantMax: 99, pret: 0 },
      { cantMin: 100, cantMax: 499, pret: 0 },
      { cantMin: 500, cantMax: 9999, pret: 0 },
    ]
  }

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
    setSelected(null)
    setToast('Salvat cu succes!')
    setTimeout(() => setToast(null), 2000)
  }

  function updateTier(i, field, val) {
    const tiers = form.tierPricing.map((t, idx) => idx === i ? { ...t, [field]: parseFloat(val) || 0 } : t)
    setForm({ ...form, tierPricing: tiers })
  }

  function handleImgChange(val) {
    setImgPreviewErr(false)
    setForm({ ...form, imagine: val })
  }

  const imgPreview = form?.imagine && !imgPreviewErr

  return (
    <Layout title="Gestiune produse" actions={
      <button className="btn btn-primary btn-sm" onClick={openNew}>+ Produs nou</button>
    }>
      {toast && (
        <div className="toast success">{toast}</div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Cod</th>
                <th>Produs</th>
                <th>Categorie</th>
                <th>Preț bază</th>
                <th>Tier 1 (1–99)</th>
                <th>Tier 2 (100+)</th>
                <th>Stoc</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {db.products.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
                  <td>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      <ProductImage
                        src={p.imagine}
                        style={{ width: 44, height: 44, objectFit: 'contain' }}
                      />
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.cod}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{p.categorie}</td>
                  <td>{lei(p.pretBaza)}/{p.unitate}</td>
                  <td style={{ fontSize: 12 }}>{lei(p.tierPricing[0]?.pret)}</td>
                  <td style={{ fontSize: 12 }}>{lei(p.tierPricing[1]?.pret)}</td>
                  <td>
                    {p.stoc > 1000
                      ? <span style={{ color: 'var(--green)', fontSize: 12 }}>{p.stoc.toLocaleString()}</span>
                      : p.stoc > 0
                      ? <span style={{ color: 'var(--orange-text)', fontSize: 12 }}>{p.stoc}</span>
                      : <span style={{ color: 'var(--red-text)', fontSize: 12 }}>0</span>
                    }
                  </td>
                  <td>
                    <span className={`badge ${p.activ ? 'badge-green' : 'badge-gray'}`}>
                      {p.activ ? 'Activ' : 'Inactiv'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                      ✏ Editează
                    </button>
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
          <div className="modal" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNew ? 'Produs nou' : `Editează ${selected?.name}`}</h3>
              <button className="modal-close" onClick={() => setForm(null)}>×</button>
            </div>

            {/* Image section */}
            <div style={{ marginBottom: 20 }}>
              <label>Imagine produs</label>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 6 }}>
                {/* Preview */}
                <div style={{
                  width: 100, height: 100, flexShrink: 0,
                  background: 'var(--bg)', borderRadius: 10,
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                }}>
                  {imgPreview
                    ? <img src={form.imagine} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setImgPreviewErr(true)} />
                    : <span style={{ fontSize: 36 }}>🧻</span>
                  }
                </div>
                {/* Input */}
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="w-full"
                    placeholder="/images/nume-produs.png  sau  https://..."
                    value={form.imagine || ''}
                    onChange={e => handleImgChange(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                    <b>Local:</b> pune fișierul în <code>public/images/</code> și scrie <code>/images/nume.png</code><br />
                    <b>URL extern:</b> lipește direct URL-ul imaginii
                  </div>
                  {form.imagine && imgPreviewErr && (
                    <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 6 }}>
                      ⚠ Imaginea nu a putut fi încărcată — verifică path-ul sau URL-ul
                    </div>
                  )}
                  {form.imagine && !imgPreviewErr && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleImgChange('')}
                      >
                        🗑 Șterge imaginea
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* Info fields */}
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
                <label>Preț bază ({form.unitate})</label>
                <input type="number" step="0.01" className="w-full" value={form.pretBaza}
                  onChange={e => setForm({ ...form, pretBaza: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label>Unitate</label>
                <select className="w-full" value={form.unitate} onChange={e => setForm({ ...form, unitate: e.target.value })}>
                  <option value="rola">rola</option>
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

            <div className="section-title" style={{ marginBottom: 10 }}>Tier pricing</div>
            <table>
              <thead>
                <tr>
                  <th>De la (cant.)</th>
                  <th>Până la</th>
                  <th>Preț / {form.unitate}</th>
                </tr>
              </thead>
              <tbody>
                {form.tierPricing.map((t, i) => (
                  <tr key={i}>
                    <td>
                      <input type="number" style={{ width: 90 }} value={t.cantMin}
                        onChange={e => updateTier(i, 'cantMin', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" style={{ width: 90 }}
                        value={t.cantMax >= 9999 ? '' : t.cantMax}
                        placeholder="∞"
                        onChange={e => updateTier(i, 'cantMax', e.target.value || 9999)} />
                    </td>
                    <td>
                      <input type="number" step="0.01" style={{ width: 110 }} value={t.pret}
                        onChange={e => updateTier(i, 'pret', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {isNew ? 'Adaugă produs' : 'Salvează modificările'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
