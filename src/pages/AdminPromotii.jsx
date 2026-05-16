import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei, fmtDate } from '../utils'

// ── Rule Builder components ──
const TIPURI_REGULA = [
  { value: 'LINE_DISCOUNT',  label: 'Discount % pe linie produs' },
  { value: 'LINE_AMOUNT',    label: 'Discount valoric (RON) pe linie' },
  { value: 'MIX_MATCH',     label: 'Mix & Match (condiție multiplă → discount)' },
  { value: 'ORDER_VALUE',    label: 'Discount la valoare comandă (prag)' },
  { value: 'ORDER_AMOUNT',   label: 'Discount fix RON pe total comandă' },
  { value: 'BUY_X_GET_Y',   label: 'Buy X Get Y (produs gratuit)' },
  { value: 'CAMPAIGN',       label: 'Campanie temporară' },
  { value: 'CATEGORY',       label: 'Discount pe categorie' },
  { value: 'BRAND',          label: 'Discount pe marcă' },
  { value: 'FIRST_ORDER',    label: 'Prima comandă (client nou)' },
]
const TIPURI_CONDITIE = [
  { value: 'produs_in_cos',              label: 'Produs în coș cu cantitate minimă' },
  { value: 'cantitate_totala_categorie', label: 'Cantitate totală din categorie' },
  { value: 'valoare_cos',               label: 'Valoare coș minimă (RON)' },
  { value: 'grup_client',               label: 'Grup client (standard/gold/platinum)' },
  { value: 'marca_in_cos',              label: 'Marcă în coș cu cantitate minimă' },
]
const TIPURI_ACTIUNE = [
  { value: 'discount_procent_linie',  label: 'Discount % pe produs specific' },
  { value: 'discount_valoric_linie',  label: 'Discount RON pe produs specific' },
  { value: 'discount_procent_total',  label: 'Discount % pe total comandă' },
  { value: 'discount_valoric_total',  label: 'Discount RON pe total comandă' },
  { value: 'produs_gratuit',          label: 'Produse gratuite' },
]
const BAZE_CALCUL = [
  { value: 'pret_baza',                   label: 'Preț de bază (înainte de orice discount)' },
  { value: 'pret_dupa_discount_anterior', label: 'Preț după discounturile anterioare' },
  { value: 'total_net',                   label: 'Total net curent al coșului' },
]

function ConditionRow({ cond, idx, onChange, onRemove, products, categories, marci }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid var(--border)' }}>
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
              <option value="">Selectează...</option>
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
            <option value="">Selectează...</option>
            {['standard','gold','platinum'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}
      {cond.tip === 'marca_in_cos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11 }}>Marcă</label>
            <select className="w-full" value={cond.marca || ''} onChange={e => onChange({ ...cond, marca: e.target.value })} style={{ fontSize: 12 }}>
              <option value="">Selectează...</option>
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
  name: '', tip: 'LINE_DISCOUNT', activ: true, prioritate: 10, combinabil: true,
  bazaCalcul: 'pret_baza',
  conditii: [{ tip: 'produs_in_cos', productId: '', cantMin: 1, operator: 'AND' }],
  actiune: { tip: 'discount_procent_linie', productIdTinta: '', valoare: 10, eticheta: '', cantitateGratuita: 1 },
  restrictii: { dataStart: new Date().toISOString().split('T')[0], dataEnd: '', maxPerComanda: '', maxPerClient: '' }
}

const emptyPromo = {
  name: '', productId: '', firmId: '', discountPercent: 10,
  activa: true, dataStart: new Date().toISOString().split('T')[0], dataEnd: '',
}

function Toast({ msg, type = 'success', onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>✓ {msg}</div>
}

export default function AdminPromotii() {
  const { db, addPromotion, updatePromotion, togglePromotion,
          addPromotionRule, updatePromotionRule, togglePromotionRule } = useStore()

  const [tab, setTab] = useState('rules') // 'rules' | 'simple'
  const [editRule, setEditRule] = useState(null)
  const [isNewRule, setIsNewRule] = useState(false)
  const [editPromo, setEditPromo] = useState(null)
  const [isNewPromo, setIsNewPromo] = useState(false)
  const [toast, setToast] = useState(null)
  const [filterStatus, setFilterStatus] = useState('toate')

  const today = new Date().toISOString().split('T')[0]
  const products = db.products.filter(p => p.activ)
  const categories = [...new Set(db.products.map(p => p.categorie).filter(Boolean))]
  const marci = [...new Set(db.products.map(p => p.marca).filter(Boolean))]

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2500)
  }

  // ── STATUS helpers ──
  function getRuleStatus(r) {
    if (!r.activ) return 'inactiva'
    if (r.restrictii?.dataEnd && r.restrictii.dataEnd < today) return 'expirata'
    if (r.restrictii?.dataStart > today) return 'viitoare'
    return 'activa'
  }
  function getPromoStatus(p) {
    if (!p.activa) return 'inactiva'
    if (p.dataEnd && p.dataEnd < today) return 'expirata'
    if (p.dataStart > today) return 'viitoare'
    return 'activa'
  }
  const SB = { activa: 'badge-green', inactiva: 'badge-gray', expirata: 'badge-red', viitoare: 'badge-purple' }
  const SL = { activa: 'Activă', inactiva: 'Inactivă', expirata: 'Expirată', viitoare: 'Viitoare' }

  // ── Rule handlers ──
  function openNewRule() { setEditRule(JSON.parse(JSON.stringify(emptyRule))); setIsNewRule(true) }
  function openEditRule(r) { setEditRule(JSON.parse(JSON.stringify(r))); setIsNewRule(false) }

  function setConditie(idx, val) {
    setEditRule(f => { const c = [...f.conditii]; c[idx] = val; return { ...f, conditii: c } })
  }

  function normDate(d) {
    if (!d) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    if (/^\d{2}[\/.]\d{2}[\/.]\d{4}$/.test(d)) {
      const parts = d.split(/[\/.]/)
      return parts[2] + '-' + parts[1] + '-' + parts[0]
    }
    return d
  }

  function handleSaveRule() {
    if (!editRule.name.trim()) return
    const toSave = {
      ...editRule,
      activ: editRule.activ !== false,
      restrictii: {
        ...editRule.restrictii,
        dataStart: normDate(editRule.restrictii.dataStart) || new Date().toISOString().split('T')[0],
        dataEnd: normDate(editRule.restrictii.dataEnd) || null,
        maxPerComanda: editRule.restrictii.maxPerComanda === '' ? null : parseInt(editRule.restrictii.maxPerComanda) || null,
        maxPerClient: editRule.restrictii.maxPerClient === '' ? null : parseInt(editRule.restrictii.maxPerClient) || null,
      }
    }
    if (isNewRule) addPromotionRule(toSave)
    else updatePromotionRule(editRule.id, toSave)
    setEditRule(null)
    showToast(isNewRule ? 'Regulă adăugată!' : 'Regulă salvată!')
  }

  // ── Simple promo handlers ──
  function openNewPromo() { setEditPromo({ ...emptyPromo }); setIsNewPromo(true) }
  function openEditPromo(p) { setEditPromo({ ...p }); setIsNewPromo(false) }

  function handleSavePromo(e) {
    e.preventDefault()
    if (isNewPromo) addPromotion(editPromo)
    else updatePromotion(editPromo.id, editPromo)
    setEditPromo(null)
    showToast(isNewPromo ? 'Promoție adăugată!' : 'Promoție salvată!')
  }

  // ── Filtered lists ──
  const rules = (db.promotionRules || []).filter(r =>
    filterStatus === 'toate' || getRuleStatus(r) === filterStatus
  )
  const promos = (db.promotions || []).filter(p =>
    filterStatus === 'toate' || getPromoStatus(p) === filterStatus
  )

  const tipLabel = Object.fromEntries(TIPURI_REGULA.map(t => [t.value, t.label]))

  return (
    <Layout title="Promoții" subtitle="Motor de reguli + promoții simple"
      actions={
        tab === 'rules'
          ? <button className="btn btn-primary btn-sm" onClick={openNewRule}>+ Regulă nouă</button>
          : <button className="btn btn-primary btn-sm" onClick={openNewPromo}>+ Promoție simplă</button>
      }>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Tab switcher */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 8, padding: 3, marginRight: 12 }}>
            <button className={`btn btn-sm ${tab==='rules'?'btn-primary':'btn-secondary'}`}
              style={{ border: 'none' }} onClick={() => setTab('rules')}>
              ⚡ Motor de reguli
            </button>
            <button className={`btn btn-sm ${tab==='simple'?'btn-primary':'btn-secondary'}`}
              style={{ border: 'none' }} onClick={() => setTab('simple')}>
              🏷 Promoții simple
            </button>
          </div>
          {/* Status filters */}
          {[['toate','Toate'], ['activa','Active'], ['viitoare','Viitoare'], ['expirata','Expirate'], ['inactiva','Inactive']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm ${filterStatus===v?'btn-primary':'btn-secondary'}`}
              onClick={() => setFilterStatus(v)}>
              {l}
              {v !== 'toate' && (
                <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '0 5px' }}>
                  {tab === 'rules'
                    ? (db.promotionRules||[]).filter(r => getRuleStatus(r) === v).length
                    : (db.promotions||[]).filter(p => getPromoStatus(p) === v).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: MOTOR REGULI ── */}
      {tab === 'rules' && (
        <div className="card">
          {rules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚡</div>
              <div className="empty-state-title">Nicio regulă promoțională</div>
              <div className="empty-state-sub">Creează prima regulă cu butonul "Regulă nouă" din dreapta sus.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nume regulă</th>
                    <th>Tip</th>
                    <th>Acțiune</th>
                    <th style={{ textAlign: 'center' }}>Prioritate</th>
                    <th style={{ textAlign: 'center' }}>Combinabil</th>
                    <th>Perioadă</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => {
                    const status = getRuleStatus(r)
                    return (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openEditRule(r)}>
                        <td><b style={{ fontSize: 13 }}>{r.name}</b></td>
                        <td style={{ fontSize: 11, color: 'var(--text2)' }}>{tipLabel[r.tip] || r.tip}</td>
                        <td style={{ fontSize: 11 }}>
                          {r.actiune?.tip?.includes('procent') ? 'Disc. %' : r.actiune?.tip?.includes('valoric') ? 'Disc. RON' : r.actiune?.tip === 'produs_gratuit' ? 'Gratuit' : '—'}
                          {r.actiune?.valoare > 0 && <b style={{ color: 'var(--green-text)', marginLeft: 4 }}>−{r.actiune.valoare}{r.actiune.tip?.includes('procent') ? '%' : ' RON'}</b>}
                          {r.actiune?.cantitateGratuita > 0 && r.actiune?.tip === 'produs_gratuit' && <b style={{ color: 'var(--green-text)', marginLeft: 4 }}>{r.actiune.cantitateGratuita} buc.</b>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.prioritate}</td>
                        <td style={{ textAlign: 'center' }}>{r.combinabil ? <span style={{ color: 'var(--green-text)' }}>✓</span> : <span style={{ color: 'var(--red-text)' }}>✗</span>}</td>
                        <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {r.restrictii?.dataStart} → {r.restrictii?.dataEnd || '∞'}
                        </td>
                        <td><span className={`badge ${SB[status]}`}>{SL[status]}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditRule(r)}>✏</button>
                            <button className={`btn btn-sm ${r.activ ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => { togglePromotionRule(r.id); showToast(r.activ ? 'Dezactivată' : 'Activată') }}>
                              {r.activ ? 'OFF' : 'ON'}
                            </button>
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
      )}

      {/* ── TAB: PROMOȚII SIMPLE ── */}
      {tab === 'simple' && (
        <div className="card">
          {promos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏷️</div>
              <div className="empty-state-title">Nicio promoție simplă</div>
              <div className="empty-state-sub">Adaugă o promoție rapidă per produs/client.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nume</th><th>Produs</th><th>Client specific</th><th>Discount</th><th>Perioadă</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {promos.map(p => {
                    const prod = db.products.find(pr => pr.id === p.productId)
                    const firm = p.firmId ? db.firms.find(f => f.id === p.firmId) : null
                    const status = getPromoStatus(p)
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEditPromo(p)}>
                        <td><b>{p.name}</b></td>
                        <td style={{ fontSize: 12 }}>{prod?.name || '—'}</td>
                        <td>{firm ? <span className="badge badge-blue">{firm.name}</span> : <span style={{ color: 'var(--text3)', fontSize: 12 }}>Global</span>}</td>
                        <td><b style={{ color: 'var(--green-text)', fontSize: 14 }}>−{p.discountPercent}%</b></td>
                        <td style={{ fontSize: 12 }}>{fmtDate(p.dataStart)} → {fmtDate(p.dataEnd)}</td>
                        <td><span className={`badge ${SB[status]}`}>{SL[status]}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditPromo(p)}>✏</button>
                            <button className={`btn btn-sm ${p.activa ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => { togglePromotion(p.id); showToast(p.activa ? 'Dezactivată' : 'Activată') }}>
                              {p.activa ? 'OFF' : 'ON'}
                            </button>
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
      )}

      {/* ── MODAL: Editare regulă complexă ── */}
      {editRule && (
        <div className="modal-overlay" onClick={() => setEditRule(null)}>
          <div className="modal" style={{ width: 660, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNewRule ? '⚡ Regulă nouă' : `Editează: ${editRule.name}`}</h3>
              <button className="modal-close" onClick={() => setEditRule(null)}>×</button>
            </div>

            {/* General */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div className="section-title" style={{ fontSize: 11, marginBottom: 10 }}>📋 GENERAL</div>
              <div className="form-group">
                <label>Nume regulă *</label>
                <input className="w-full" placeholder="ex: Mix & Match Patrice + Mr Big → Royal Mini -15%"
                  value={editRule.name} onChange={e => setEditRule({ ...editRule, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tip regulă</label>
                  <select className="w-full" value={editRule.tip} onChange={e => setEditRule({ ...editRule, tip: e.target.value })}>
                    {TIPURI_REGULA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Prioritate (1 = primul aplicat)</label>
                  <input type="number" className="w-full" min={1} max={999} value={editRule.prioritate}
                    onChange={e => setEditRule({ ...editRule, prioritate: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Baza de calcul</label>
                  <select className="w-full" value={editRule.bazaCalcul} onChange={e => setEditRule({ ...editRule, bazaCalcul: e.target.value })}>
                    {BAZE_CALCUL.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 16, gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0, fontSize: 13 }}>
                    <input type="checkbox" checked={editRule.combinabil}
                      onChange={e => setEditRule({ ...editRule, combinabil: e.target.checked })} />
                    Combinabil cu alte reguli
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0, fontSize: 13 }}>
                    <input type="checkbox" checked={editRule.activ}
                      onChange={e => setEditRule({ ...editRule, activ: e.target.checked })} />
                    Activă
                  </label>
                </div>
              </div>
            </div>

            {/* Condiții */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="section-title" style={{ fontSize: 11 }}>🔍 CONDIȚII — când se aplică</div>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setEditRule(f => ({ ...f, conditii: [...f.conditii, { tip: 'produs_in_cos', productId: '', cantMin: 1, operator: 'AND' }] }))}>
                  + Adaugă condiție
                </button>
              </div>
              {editRule.conditii.map((cond, idx) => (
                <ConditionRow key={idx} cond={cond} idx={idx}
                  onChange={val => setConditie(idx, val)}
                  onRemove={() => setEditRule(f => ({ ...f, conditii: f.conditii.filter((_, i) => i !== idx) }))}
                  products={products} categories={categories} marci={marci} />
              ))}
            </div>

            {/* Acțiune */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div className="section-title" style={{ fontSize: 11, marginBottom: 10 }}>⚡ ACȚIUNE — ce se întâmplă</div>
              <div className="form-group">
                <label>Tip acțiune</label>
                <select className="w-full" value={editRule.actiune.tip}
                  onChange={e => setEditRule({ ...editRule, actiune: { ...editRule.actiune, tip: e.target.value } })}>
                  {TIPURI_ACTIUNE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {['discount_procent_linie','discount_valoric_linie','produs_gratuit'].includes(editRule.actiune.tip) && (
                <div className="form-group">
                  <label>Produs țintă</label>
                  <select className="w-full" value={editRule.actiune.productIdTinta || ''}
                    onChange={e => setEditRule({ ...editRule, actiune: { ...editRule.actiune, productIdTinta: e.target.value } })}>
                    <option value="">Selectează produs...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-row">
                {editRule.actiune.tip !== 'produs_gratuit' ? (
                  <div className="form-group">
                    <label>{editRule.actiune.tip?.includes('procent') ? 'Discount (%)' : 'Discount (RON)'}</label>
                    <input type="number" className="w-full" min={0} max={100} step={0.1}
                      value={editRule.actiune.valoare || ''}
                      onChange={e => setEditRule({ ...editRule, actiune: { ...editRule.actiune, valoare: parseFloat(e.target.value) || 0 } })} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Cantitate gratuită (role)</label>
                    <input type="number" className="w-full" min={1}
                      value={editRule.actiune.cantitateGratuita || 1}
                      onChange={e => setEditRule({ ...editRule, actiune: { ...editRule.actiune, cantitateGratuita: parseInt(e.target.value) || 1 } })} />
                  </div>
                )}
                <div className="form-group">
                  <label>Etichetă afișată clientului</label>
                  <input className="w-full" placeholder="ex: Mix & Match Mai 2025"
                    value={editRule.actiune.eticheta || ''}
                    onChange={e => setEditRule({ ...editRule, actiune: { ...editRule.actiune, eticheta: e.target.value } })} />
                </div>
              </div>
              {/* Preview */}
              {editRule.actiune.productIdTinta && (editRule.actiune.valoare > 0 || editRule.actiune.cantitateGratuita > 0) && (() => {
                const prod = db.products.find(p => p.id === editRule.actiune.productIdTinta)
                if (!prod) return null
                return (
                  <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <b>Preview impact — {prod.name}:</b> preț bază {lei(prod.pretBaza)} →{' '}
                    {editRule.actiune.tip === 'discount_procent_linie' && <b style={{ color: 'var(--green-text)' }}>{lei(prod.pretBaza * (1 - editRule.actiune.valoare/100))} (−{editRule.actiune.valoare}%)</b>}
                    {editRule.actiune.tip === 'discount_valoric_linie' && <b style={{ color: 'var(--green-text)' }}>−{lei(editRule.actiune.valoare)} pe linie</b>}
                    {editRule.actiune.tip === 'produs_gratuit' && <b style={{ color: 'var(--green-text)' }}>{editRule.actiune.cantitateGratuita} role gratuite (val. {lei(prod.pretBaza * editRule.actiune.cantitateGratuita)})</b>}
                  </div>
                )
              })()}
            </div>

            {/* Restricții */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div className="section-title" style={{ fontSize: 11, marginBottom: 10 }}>🔒 RESTRICȚII</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data start *</label>
                  <input type="date" className="w-full" value={editRule.restrictii.dataStart || ''}
                    onChange={e => setEditRule({ ...editRule, restrictii: { ...editRule.restrictii, dataStart: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>Data end (gol = fără expirare)</label>
                  <input type="date" className="w-full" value={editRule.restrictii.dataEnd || ''}
                    onChange={e => setEditRule({ ...editRule, restrictii: { ...editRule.restrictii, dataEnd: e.target.value } })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Max per comandă (gol = ∞)</label>
                  <input type="number" className="w-full" min={1} placeholder="∞"
                    value={editRule.restrictii.maxPerComanda || ''}
                    onChange={e => setEditRule({ ...editRule, restrictii: { ...editRule.restrictii, maxPerComanda: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>Max per client (gol = ∞)</label>
                  <input type="number" className="w-full" min={1} placeholder="∞"
                    value={editRule.restrictii.maxPerClient || ''}
                    onChange={e => setEditRule({ ...editRule, restrictii: { ...editRule.restrictii, maxPerClient: e.target.value } })} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditRule(null)}>Anulează</button>
              <button className="btn btn-primary" disabled={!editRule.name.trim()} onClick={handleSaveRule}>
                {isNewRule ? '+ Creează regula' : 'Salvează modificările'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Promoție simplă ── */}
      {editPromo && (
        <div className="modal-overlay" onClick={() => setEditPromo(null)}>
          <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{isNewPromo ? '🏷 Promoție nouă' : `Editează: ${editPromo.name}`}</h3>
              <button className="modal-close" onClick={() => setEditPromo(null)}>×</button>
            </div>
            <form onSubmit={handleSavePromo}>
              <div className="form-group">
                <label>Nume promoție *</label>
                <input className="w-full" required placeholder="ex: Campanie Iunie — Patrice XXL"
                  value={editPromo.name} onChange={e => setEditPromo({ ...editPromo, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Produs *</label>
                  <select className="w-full" required value={editPromo.productId}
                    onChange={e => setEditPromo({ ...editPromo, productId: e.target.value })}>
                    <option value="">Selectează...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client specific</label>
                  <select className="w-full" value={editPromo.firmId || ''}
                    onChange={e => setEditPromo({ ...editPromo, firmId: e.target.value || '' })}>
                    <option value="">Global (toți clienții)</option>
                    {db.firms.filter(f => f.status==='activ').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Discount (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="range" min={1} max={80} style={{ flex: 1, accentColor: 'var(--blue)' }}
                    value={editPromo.discountPercent}
                    onChange={e => setEditPromo({ ...editPromo, discountPercent: parseInt(e.target.value) })} />
                  <div style={{ background: 'var(--green-bg)', color: 'var(--green-text)', fontWeight: 700, fontSize: 16, padding: '4px 14px', borderRadius: 8, minWidth: 64, textAlign: 'center' }}>
                    −{editPromo.discountPercent}%
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data start *</label>
                  <input type="date" className="w-full" required value={editPromo.dataStart}
                    onChange={e => setEditPromo({ ...editPromo, dataStart: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data sfârșit *</label>
                  <input type="date" className="w-full" required value={editPromo.dataEnd}
                    min={editPromo.dataStart}
                    onChange={e => setEditPromo({ ...editPromo, dataEnd: e.target.value })} />
                </div>
              </div>
              {editPromo.productId && (() => {
                const prod = db.products.find(p => p.id === editPromo.productId)
                if (!prod) return null
                return (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 8 }}>
                    Preț bază: <b>{lei(prod.pretBaza)}</b> →{' '}
                    <b style={{ color: 'var(--green-text)' }}>{lei(prod.pretBaza * (1 - editPromo.discountPercent/100))}</b>
                    {' '}(economie {lei(prod.pretBaza * editPromo.discountPercent/100)}/rolă)
                  </div>
                )
              })()}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
                <input type="checkbox" checked={editPromo.activa}
                  onChange={e => setEditPromo({ ...editPromo, activa: e.target.checked })} />
                Promoție activă
              </label>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditPromo(null)}>Anulează</button>
                <button type="submit" className="btn btn-primary">{isNewPromo ? 'Adaugă' : 'Salvează'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
