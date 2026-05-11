import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei } from '../utils'

export default function AdminProduse() {
  const { db, updateProduct, addProduct } = useStore()
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)

  const emptyProduct = {
    cod: '', name: '', categorie: '', pretBaza: '', unitate: 'rola', stoc: 0, activ: true,
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
  }

  function openNew() {
    setSelected(null)
    setForm({ ...emptyProduct, tierPricing: emptyProduct.tierPricing.map(t => ({ ...t })) })
    setIsNew(true)
  }

  function handleSave() {
    if (isNew) {
      addProduct(form)
    } else {
      updateProduct(selected.id, form)
    }
    setSelected(null)
    setForm(null)
    setToast('Salvat!')
    setTimeout(() => setToast(null), 2000)
  }

  function updateTier(i, field, val) {
    const tiers = form.tierPricing.map((t, idx) => idx === i ? { ...t, [field]: parseFloat(val) || 0 } : t)
    setForm({ ...form, tierPricing: tiers })
  }

  return (
    <Layout title="Gestiune produse" actions={
      <button className="btn btn-primary btn-sm" onClick={openNew}>+ Produs nou</button>
    }>
      {toast && <div className="toast success">{toast}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cod</th><th>Produs</th><th>Categorie</th><th>Preț bază</th>
                <th>Tier 1 (1–99)</th><th>Tier 2 (100+)</th><th>Stoc</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {db.products.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.cod}</td>
                  <td><b>{p.name}</b></td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{p.categorie}</td>
                  <td>{lei(p.pretBaza)}/{p.unitate}</td>
                  <td style={{ fontSize: 12 }}>{lei(p.tierPricing[0]?.pret)}</td>
                  <td style={{ fontSize: 12 }}>{lei(p.tierPricing[1]?.pret)}</td>
                  <td>
                    {p.stoc > 1000
                      ? <span style={{ color: 'var(--green)', fontSize: 12 }}>{p.stoc.toLocaleString()}</span>
                      : <span style={{ color: 'var(--orange-text)', fontSize: 12 }}>{p.stoc}</span>
                    }
                  </td>
                  <td>
                    <span className={`badge ${p.activ ? 'badge-green' : 'badge-gray'}`}>
                      {p.activ ? 'Activ' : 'Inactiv'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(p) }}>
                      ✏ Editează
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/New modal */}
      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNew ? 'Produs nou' : `Editează ${selected?.name}`}</h3>
              <button className="modal-close" onClick={() => setForm(null)}>×</button>
            </div>

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
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.activ}
                    onChange={e => setForm({ ...form, activ: e.target.checked })} />
                  Produs activ
                </label>
              </div>
            </div>

            <div className="section-title" style={{ marginBottom: 10 }}>Tier pricing</div>
            <table>
              <thead><tr><th>De la (cant.)</th><th>Până la</th><th>Preț / {form.unitate}</th></tr></thead>
              <tbody>
                {form.tierPricing.map((t, i) => (
                  <tr key={i}>
                    <td><input type="number" style={{ width: 80 }} value={t.cantMin} onChange={e => updateTier(i, 'cantMin', e.target.value)} /></td>
                    <td><input type="number" style={{ width: 80 }} value={t.cantMax >= 9999 ? '∞' : t.cantMax} onChange={e => updateTier(i, 'cantMax', e.target.value)} /></td>
                    <td><input type="number" step="0.01" style={{ width: 100 }} value={t.pret} onChange={e => updateTier(i, 'pret', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {isNew ? 'Adaugă produs' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
