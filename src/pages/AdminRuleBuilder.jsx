import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei } from '../utils'

const TIPURI_REGULA = [
  { value: 'LINE_DISCOUNT',  label: 'Discount % pe linie produs' },
  { value: 'LINE_AMOUNT',    label: 'Discount valoric pe linie produs' },
  { value: 'MIX_MATCH',     label: 'Mix & Match (condiție multiplă → discount)' },
  { value: 'ORDER_VALUE',    label: 'Discount la valoare comandă' },
  { value: 'ORDER_AMOUNT',   label: 'Discount fix (RON) pe total comandă' },
  { value: 'BUY_X_GET_Y',   label: 'Buy X Get Y (produs gratuit)' },
  { value: 'CAMPAIGN',       label: 'Campanie temporară' },
  { value: 'CATEGORY',       label: 'Discount pe categorie' },
  { value: 'BRAND',          label: 'Discount pe marcă' },
  { value: 'FIRST_ORDER',    label: 'Prima comandă (new client)' },
]

const TIPURI_CONDITIE = [
  { value: 'produs_in_cos',             label: 'Produs în coș cu cantitate minimă' },
  { value: 'cantitate_totala_categorie', label: 'Cantitate totală din categorie' },
  { value: 'valoare_cos',               label: 'Valoare coș minimă' },
  { value: 'grup_client',               label: 'Grup client' },
  { value: 'marca_in_cos',              label: 'Marcă în coș' },
]

const TIPURI_ACTIUNE = [
  { value: 'discount_procent_linie',  label: 'Discount % pe produs specific' },
  { value: 'discount_valoric_linie',  label: 'Discount RON pe produs specific' },
  { value: 'discount_procent_total',  label: 'Discount % pe total comandă' },
  { value: 'discount_valoric_total',  label: 'Discount RON pe total comandă' },
  { value: 'produs_gratuit',          label: 'Produse gratuite' },
]

const BAZE_CALCUL = [
  { value: 'pret_baza',                  label: 'Preț de bază (înainte de orice discount)' },
  { value: 'pret_dupa_discount_anterior', label: 'Preț după discounturile anterioare (cumulat)' },
  { value: 'total_net',                  label: 'Total net curent al coșului' },
]

const GRUPURI_CLIENT = ['standard', 'gold', 'platinum']

function ConditionRow({ cond, idx, onChange, onRemove, products, categories, marci }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        {idx > 0 && (
          <select value={cond.operator || 'AND'} onChange={e => onChange({ ...cond, operator: e.target.value })}
            style={{ width: 70, fontSize: 12 }}>
            <option value="AND">ȘI</option>
            <option value="OR">SAU</option>
          </select>
        )}
        <select value={cond.tip} onChange={e => onChange({ ...cond, tip: e.target.value, productId: '', grup: '', categorie: '', marca: '', cantMin: 0, valoareMin: 0 })}
          style={{ flex: 1, fontSize: 12 }}>
          {TIPURI_CONDITIE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={onRemove} className="btn btn-danger btn-sm">✕</button>
      </div>

      {cond.tip === 'produs_in_cos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11 }}>Produs</label>
            <select className="w-full" value={cond.productId || ''} onChange={e => onChange({ ...cond, productId: e.target.value })} style={{ fontSize: 12 }}>
              <option value="">Selectează produs...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11 }}>Cantitate minimă (role)</label>
            <input type="number" className="w-full" min={0} value={cond.cantMin || 0} style={{ fontSize: 12 }}
              onChange={e => onChange({ ...cond, cantMin: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      )}

      {cond.tip === 'cantitate_totala_categorie' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11 }}>Categorie</label>
            <select className="w-full" value={cond.categorie || ''} onChange={e => onChange({ ...cond, categorie: e.target.value })} style={{ fontSize: 12 }}>
              <option value="">Selectează categorie...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11 }}>Cantitate minimă (role)</label>
            <input type="number" className="w-full" min={0} value={cond.cantMin || 0} style={{ fontSize: 12 }}
              onChange={e => onChange({ ...cond, cantMin: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      )}

      {cond.tip === 'valoare_cos' && (
        <div>
          <label style={{ fontSize: 11 }}>Valoare minimă coș (RON)</label>
          <input type="number" className="w-full" min={0} value={cond.valoareMin || 0} style={{ fontSize: 12 }}
            onChange={e => onChange({ ...cond, valoareMin: parseFloat(e.target.value) || 0 })} />
        </div>
      )}

      {cond.tip === 'grup_client' && (
        <div>
          <label style={{ fontSize: 11 }}>Grup client</label>
          <select className="w-full" value={cond.grup || ''} onChange={e => onChange({ ...cond, grup: e.target.value })} style={{ fontSize: 12 }}>
            <option value="">Selectează grup...</option>
            {GRUPURI_CLIENT.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      {cond.tip === 'marca_in_cos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11 }}>Marcă</label>
            <select className="w-full" value={cond.marca || ''} onChange={e => onChange({ ...cond, marca: e.target.value })} style={{ fontSize: 12 }}>
              <option value="">Selectează marcă...</option>
              {marci.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11 }}>Cantitate minimă (role)</label>
            <input type="number" className="w-full" min={0} value={cond.cantMin || 0} style={{ fontSize: 12 }}
              onChange={e => onChange({ ...cond, cantMin: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      )}
    </div>
  )
}

const emptyRule = {
  name: '', tip: 'LINE_DISCOUNT', activ: true,
  prioritate: 10, combinabil: true,
  bazaCalcul: 'pret_baza',
  conditii: [{ tip: 'produs_in_cos', productId: '', cantMin: 1, operator: 'AND' }],
  actiune: { tip: 'discount_procent_linie', productIdTinta: '', valoare: 10, eticheta: '', cantitateGratuita: 1 },
  restrictii: { dataStart: new Date().toISOString().split('T')[0], dataEnd: '', maxPerComanda: '', maxPerClient: '' }
}

export default function AdminRuleBuilder() {
  const { db, addPromotionRule, updatePromotionRule } = useStore()
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('toate')

  const products = db.products.filter(p => p.activ)
  const categories = [...new Set(db.products.map(p => p.categorie).filter(Boolean))]
  const marci = [...new Set(db.products.map(p => p.marca).filter(Boolean))]
  const today = new Date().toISOString().split('T')[0]

  function getStatus(r) {
    if (!r.activ) return 'inactiva'
    if (r.restrictii?.dataEnd && r.restrictii.dataEnd < today) return 'expirata'
    if (r.restrictii?.dataStart > today) return 'viitoare'
    return 'activa'
  }

  const rules = (db.promotionRules || []).filter(r => {
    if (filter === 'toate') return true
    return getStatus(r) === filter
  })

  const statusBadge = { activa: 'badge-green', inactiva: 'badge-gray', expirata: 'badge-red', viitoare: 'badge-purple' }
  const statusLabel = { activa: 'Activă', inactiva: 'Inactivă', expirata: 'Expirată', viitoare: 'Viitoare' }

  function openNew() {
    setForm(JSON.parse(JSON.stringify(emptyRule)))
    setIsNew(true)
  }

  function openEdit(rule) {
    setForm(JSON.parse(JSON.stringify(rule)))
    setSelected(rule)
    setIsNew(false)
  }

  function setConditie(idx, val) {
    setForm(f => { const c = [...f.conditii]; c[idx] = val; return { ...f, conditii: c } })
  }

  function addConditie() {
    setForm(f => ({ ...f, conditii: [...f.conditii, { tip: 'produs_in_cos', productId: '', cantMin: 1, operator: 'AND' }] }))
  }

  function removeConditie(idx) {
    setForm(f => ({ ...f, conditii: f.conditii.filter((_, i) => i !== idx) }))
  }

  function handleSave() {
    if (!form.name.trim()) return
    const toSave = {
      ...form,
      restrictii: {
        ...form.restrictii,
        maxPerComanda: form.restrictii.maxPerComanda === '' ? null : parseInt(form.restrictii.maxPerComanda),
        maxPerClient: form.restrictii.maxPerClient === '' ? null : parseInt(form.restrictii.maxPerClient),
        dataEnd: form.restrictii.dataEnd || null,
      }
    }
    if (isNew) {
      addPromotionRule(toSave)
    } else {
      updatePromotionRule(selected.id, toSave)
    }
    setForm(null)
    setToast(isNew ? 'Regulă adăugată!' : 'Regulă salvată!')
    setTimeout(() => setToast(null), 2500)
  }

  const tipLabel = Object.fromEntries(TIPURI_REGULA.map(t => [t.value, t.label]))
  const actiuneLabel = Object.fromEntries(TIPURI_ACTIUNE.map(t => [t.value, t.label]))

  return (
    <Layout title="Motor promoții — Rule Builder"
      subtitle="Creează orice tip de regulă promoțională"
      actions={<button className="btn btn-primary btn-sm" onClick={openNew}>+ Regulă nouă</button>}>

      {toast && <div className="toast success">{toast}</div>}

      {/* Filtre */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8">
          {[['toate','Toate'], ['activa','Active'], ['viitoare','Viitoare'], ['expirata','Expirate'], ['inactiva','Inactive']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(v)}>
              {l}
              {v !== 'toate' && <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '0 5px' }}>
                {(db.promotionRules || []).filter(r => getStatus(r) === v).length}
              </span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel reguli */}
      <div className="card">
        {!rules.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <div className="empty-state-title">Nicio regulă promoțională</div>
            <div className="empty-state-sub">Creează prima regulă cu butonul de sus</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nume regulă</th>
                  <th>Tip</th>
                  <th>Acțiune</th>
                  <th>Prioritate</th>
                  <th>Combinabil</th>
                  <th>Baza calcul</th>
                  <th>Perioadă</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => {
                  const status = getStatus(r)
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(r)}>
                      <td><b>{r.name}</b></td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{tipLabel[r.tip] || r.tip}</td>
                      <td style={{ fontSize: 11 }}>
                        {actiuneLabel[r.actiune?.tip] || r.actiune?.tip}
                        {r.actiune?.valoare ? <span style={{ color: 'var(--green-text)', fontWeight: 700 }}> −{r.actiune.valoare}{r.actiune.tip?.includes('procent') ? '%' : ' RON'}</span> : ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>{r.prioritate}</td>
                      <td style={{ textAlign: 'center' }}>{r.combinabil ? '✓' : '✗'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {BAZE_CALCUL.find(b => b.value === r.bazaCalcul)?.label?.split(' ')[0] || r.bazaCalcul}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {r.restrictii?.dataStart} → {r.restrictii?.dataEnd || '∞'}
                      </td>
                      <td><span className={`badge ${statusBadge[status]}`}>{statusLabel[status]}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>✏ Editează</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal editare */}
      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" style={{ width: 680, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNew ? 'Regulă nouă' : `Editează: ${selected?.name}`}</h3>
              <button className="modal-close" onClick={() => setForm(null)}>×</button>
            </div>

            {/* Informații generale */}
            <div className="card" style={{ marginBottom: 14, background: 'var(--bg)' }}>
              <div className="section-title" style={{ marginBottom: 12, fontSize: 12 }}>📋 Informații generale</div>
              <div className="form-group">
                <label>Nume regulă *</label>
                <input className="w-full" placeholder="ex: Mix & Match Patrice + Mr Big → Royal Mini -15%"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tip regulă</label>
                  <select className="w-full" value={form.tip} onChange={e => setForm({ ...form, tip: e.target.value })}>
                    {TIPURI_REGULA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Prioritate (1 = primul aplicat)</label>
                  <input type="number" className="w-full" min={1} max={999} value={form.prioritate}
                    onChange={e => setForm({ ...form, prioritate: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Baza de calcul</label>
                  <select className="w-full" value={form.bazaCalcul} onChange={e => setForm({ ...form, bazaCalcul: e.target.value })}>
                    {BAZE_CALCUL.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                    <input type="checkbox" checked={form.combinabil}
                      onChange={e => setForm({ ...form, combinabil: e.target.checked })} />
                    Combinabil cu alte reguli
                  </label>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.activ}
                  onChange={e => setForm({ ...form, activ: e.target.checked })} />
                Regulă activă
              </label>
            </div>

            {/* Condiții */}
            <div className="card" style={{ marginBottom: 14, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ fontSize: 12 }}>🔍 Condiții (CÂND se aplică)</div>
                <button className="btn btn-secondary btn-sm" onClick={addConditie}>+ Adaugă condiție</button>
              </div>
              {form.conditii.map((cond, idx) => (
                <ConditionRow key={idx} cond={cond} idx={idx}
                  onChange={val => setConditie(idx, val)}
                  onRemove={() => removeConditie(idx)}
                  products={products} categories={categories} marci={marci} />
              ))}
            </div>

            {/* Acțiune */}
            <div className="card" style={{ marginBottom: 14, background: 'var(--bg)' }}>
              <div className="section-title" style={{ marginBottom: 12, fontSize: 12 }}>⚡ Acțiune (CE se întâmplă)</div>
              <div className="form-group">
                <label>Tip acțiune</label>
                <select className="w-full" value={form.actiune.tip}
                  onChange={e => setForm({ ...form, actiune: { ...form.actiune, tip: e.target.value } })}>
                  {TIPURI_ACTIUNE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {(form.actiune.tip === 'discount_procent_linie' || form.actiune.tip === 'discount_valoric_linie' || form.actiune.tip === 'produs_gratuit') && (
                <div className="form-group">
                  <label>Produs țintă</label>
                  <select className="w-full" value={form.actiune.productIdTinta || ''}
                    onChange={e => setForm({ ...form, actiune: { ...form.actiune, productIdTinta: e.target.value } })}>
                    <option value="">Selectează produs țintă...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-row">
                {form.actiune.tip !== 'produs_gratuit' && (
                  <div className="form-group">
                    <label>{form.actiune.tip?.includes('procent') ? 'Discount (%)' : 'Discount (RON)'}</label>
                    <input type="number" className="w-full" min={0} max={100} step={0.1}
                      value={form.actiune.valoare || ''}
                      onChange={e => setForm({ ...form, actiune: { ...form.actiune, valoare: parseFloat(e.target.value) || 0 } })} />
                  </div>
                )}
                {form.actiune.tip === 'produs_gratuit' && (
                  <div className="form-group">
                    <label>Cantitate gratuită (role)</label>
                    <input type="number" className="w-full" min={1}
                      value={form.actiune.cantitateGratuita || 1}
                      onChange={e => setForm({ ...form, actiune: { ...form.actiune, cantitateGratuita: parseInt(e.target.value) || 1 } })} />
                  </div>
                )}
                <div className="form-group">
                  <label>Etichetă afișată clientului</label>
                  <input className="w-full" placeholder="ex: Mix & Match Mai 2025"
                    value={form.actiune.eticheta || ''}
                    onChange={e => setForm({ ...form, actiune: { ...form.actiune, eticheta: e.target.value } })} />
                </div>
              </div>

              {/* Preview impact */}
              {form.actiune.productIdTinta && (form.actiune.valoare > 0 || form.actiune.cantitateGratuita > 0) && (() => {
                const prod = db.products.find(p => p.id === form.actiune.productIdTinta)
                if (!prod) return null
                return (
                  <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <b>Preview impact pentru {prod.name}:</b><br />
                    {form.actiune.tip === 'discount_procent_linie' && (
                      <span>Preț bază {lei(prod.pretBaza)} → <b style={{ color: 'var(--green-text)' }}>{lei(prod.pretBaza * (1 - form.actiune.valoare / 100))}</b> per rolă (economie {lei(prod.pretBaza * form.actiune.valoare / 100)}/rolă)</span>
                    )}
                    {form.actiune.tip === 'discount_valoric_linie' && (
                      <span>Reducere fixă: <b style={{ color: 'var(--green-text)' }}>−{lei(form.actiune.valoare)}</b> pe linie</span>
                    )}
                    {form.actiune.tip === 'produs_gratuit' && (
                      <span><b style={{ color: 'var(--green-text)' }}>{form.actiune.cantitateGratuita} role gratuite</b> (valoare {lei(prod.pretBaza * form.actiune.cantitateGratuita)})</span>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Restricții */}
            <div className="card" style={{ marginBottom: 14, background: 'var(--bg)' }}>
              <div className="section-title" style={{ marginBottom: 12, fontSize: 12 }}>🔒 Restricții</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data start *</label>
                  <input type="date" className="w-full" value={form.restrictii.dataStart || ''}
                    onChange={e => setForm({ ...form, restrictii: { ...form.restrictii, dataStart: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>Data end (gol = fără expirare)</label>
                  <input type="date" className="w-full" value={form.restrictii.dataEnd || ''}
                    onChange={e => setForm({ ...form, restrictii: { ...form.restrictii, dataEnd: e.target.value } })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Max utilizări per comandă (gol = nelimitat)</label>
                  <input type="number" className="w-full" min={1} value={form.restrictii.maxPerComanda || ''}
                    placeholder="∞"
                    onChange={e => setForm({ ...form, restrictii: { ...form.restrictii, maxPerComanda: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>Max utilizări per client (gol = nelimitat)</label>
                  <input type="number" className="w-full" min={1} value={form.restrictii.maxPerClient || ''}
                    placeholder="∞"
                    onChange={e => setForm({ ...form, restrictii: { ...form.restrictii, maxPerClient: e.target.value } })} />
                </div>
              </div>
              {form.restrictii.dataStart && form.restrictii.dataEnd && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Durată: {Math.max(0, Math.round((new Date(form.restrictii.dataEnd) - new Date(form.restrictii.dataStart)) / 86400000))} zile
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Anulează</button>
              <button className="btn btn-primary" disabled={!form.name.trim()} onClick={handleSave}>
                {isNew ? 'Creează regula' : 'Salvează modificările'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
