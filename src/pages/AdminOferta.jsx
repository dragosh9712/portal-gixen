import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { useAuth } from '../AuthContext'
import { GixenLogo } from '../GixenLogo'
import { calculeazaOferta } from '../promoEngine.js'
import { lei, eur } from '../utils'

const TVA_RATE = 0.21
const TVA_LABEL = '21%'

const GIXEN = {
  name: 'Gixen SRL', cui: 'RO46291658', regCom: 'J40/12345/2020',
  adresa: 'Str. Câmpului nr. 1, Jilava, Ilfov',
  email: 'contact@gixen.ro', telefon: '+40 736 050 434'
}

function todayFmt() {
  return new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function genNr() {
  const n = new Date()
  return `OF-${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 900) + 100)}`
}


export default function AdminOferta() {
  const { db, saveOffer, getExchangeRate } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  // Pre-populare din "Editează pt. alt client" (AdminOferte)
  const presetProducts = routerLocation.state?.products || []

  const [step, setStep] = useState(1)
  const [selectedFirmId, setSelectedFirmId] = useState('')
  const [selectedProducts, setSelectedProducts] = useState(presetProducts)
  const [observatii, setObservatii] = useState('')
  const [offerNr] = useState(genNr())
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [copyTarget, setCopyTarget] = useState('')
  const [showCopy, setShowCopy] = useState(false)
  const [catFilter, setCatFilter] = useState('toate')

  const firms = (db.firms || []).filter(f => f.status === 'activ')
  const selectedFirm = firms.find(f => f.id === selectedFirmId) || null
  const exRate = getExchangeRate('EUR')
  const eurRate = parseFloat(exRate?.applied_rate || exRate?.rate || 0)
  const isEur = selectedFirm?.currency === 'EUR'

  const visibleProducts = useMemo(() => {
    const all = (db.products || []).filter(p => p.activ)
    if (!selectedFirm) return all
    const marci = selectedFirm.marciPermise || []
    return all.filter(p => marci.length === 0 || marci.includes(p.marca))
  }, [db.products, selectedFirm])

  const categories = ['toate', ...new Set(visibleProducts.map(p => p.categorie).filter(Boolean))]

  const filteredProducts = visibleProducts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.cod || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    const matchCat = catFilter === 'toate' || p.categorie === catFilter
    return matchSearch && matchCat
  })

  const ofertaCalc = useMemo(() => {
    if (!selectedProducts.length) return null
    return calculeazaOferta(selectedProducts, selectedFirm, db)
  }, [selectedProducts, selectedFirm, db])


  function toggleProduct(id) {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function fmtVal(val, forceLei = false) {
    if (val == null) return '—'
    if (!forceLei && isEur && eurRate > 0) return eur(val / eurRate)
    return lei(val)
  }

  // Construiește liniile ofertei (preț/rolă + discounturi din promoții) pentru o firmă dată
  function buildOfferData(calc) {
    const linii = []
    const discountLinii = []
    let totalBrut = 0
    let totalNet = 0
    calc.produse.forEach((p, idx) => {
      const pretBaza = calc.pricesPerUom[p.id]?.ROLA ?? 0
      const promoAplic = calc.eligibleRules.filter(rule => {
        const orig = (db.promotionRules || []).find(r => r.id === rule.id)
        if (!orig) return true
        const a = orig.actiune
        return !a || a.tip?.includes('total') || a.productIdTinta === p.id
      })
      let pretFinal = pretBaza
      promoAplic.forEach(rule => {
        const orig = (db.promotionRules || []).find(r => r.id === rule.id)
        const a = orig?.actiune
        if (!a) return
        if (a.tip === 'discount_procent_linie' || a.tip === 'discount_procent_total') {
          pretFinal = pretFinal * (1 - a.valoare / 100)
        } else if (a.tip === 'produs_gratuit' && a.productIdTinta === p.id) {
          pretFinal = Math.max(0, pretFinal - pretBaza * (a.cantitateGratuita || 1))
        }
      })
      pretFinal = Math.round(pretFinal * 100) / 100
      totalBrut += pretBaza
      totalNet += pretFinal
      linii.push({ productId: p.id, cantitate: 1, unitateSel: 'ROLA', pretUnitar: pretBaza, total: pretFinal })
      if (pretFinal < pretBaza) {
        discountLinii.push({ refLinie: idx, eticheta: promoAplic.map(r => r.eticheta || r.name).filter(Boolean).join(', ') || 'Promoție', valoare: Math.round((pretFinal - pretBaza) * 100) / 100 })
      }
    })
    totalBrut = Math.round(totalBrut * 100) / 100
    totalNet = Math.round(totalNet * 100) / 100
    const tva = Math.round(totalNet * TVA_RATE * 100) / 100
    return {
      linii, discountLinii,
      totalBrut, totalNet, tva,
      totalDiscount: Math.round((totalNet - totalBrut) * 100) / 100,
      totalCuTva: Math.round((totalNet + tva) * 100) / 100,
    }
  }

  async function doSave(firmIdOverride) {
    if (!ofertaCalc) return false
    const tFirm = firmIdOverride ? firms.find(f => f.id === firmIdOverride) : selectedFirm
    const calc = firmIdOverride ? calculeazaOferta(selectedProducts, tFirm, db) : ofertaCalc
    const totals = buildOfferData(calc)
    await saveOffer({
      id: 'of' + Date.now(), nr: firmIdOverride ? genNr() : offerNr,
      firmId: firmIdOverride || selectedFirmId || null,
      customer_id: firmIdOverride || selectedFirmId || null,
      clientName: tFirm?.name || 'Ofertă generală',
      offer_type: (firmIdOverride || selectedFirmId) ? 'client' : 'agent',
      agent_id: tFirm?.agent_id || null,
      created_by_user_id: user.id, status: 'emisa',
      dataEmitere: new Date().toISOString().split('T')[0],
      products_selected: selectedProducts,
      prices_per_uom: calc.pricesPerUom,
      ...totals,
      currency: tFirm?.currency || 'RON',
      applied_exchange_rate: tFirm?.currency === 'EUR' ? eurRate : null,
      observatii,
    })
    return true
  }

  // Print: CSS @media print afișează DOAR .oferta-preview → print identic cu preview-ul
  function printOferta() {
    if (!ofertaCalc) return
    window.print()
  }

  // Descriere lizibilă a condițiilor + acțiunii unei promoții (pentru secțiunea din ofertă)
  function describeRule(ruleLite) {
    const rule = (db.promotionRules || []).find(r => r.id === ruleLite.id) || ruleLite
    const prodName = id => (db.products || []).find(p => p.id === id)?.name || id
    const conditii = (rule.conditii || []).map(c => {
      switch (c.tip) {
        case 'produs_in_cos':              return `minim ${c.cantMin || 1} role din ${prodName(c.productId)}`
        case 'cantitate_totala_categorie': return `minim ${c.cantMin || 1} role din categoria ${c.categorie || '—'}`
        case 'valoare_cos':                return `valoare coș minim ${c.valoareMin || 0} RON`
        case 'grup_client':                return `client din grupul ${c.grup || '—'}`
        case 'marca_in_cos':               return `minim ${c.cantMin || 1} role din marca ${c.marca || '—'}`
        default:                           return c.tip || ''
      }
    }).filter(Boolean)
    const a = rule.actiune || {}
    let beneficiu = ''
    if (a.tip === 'discount_procent_linie' || a.tip === 'discount_procent_total') beneficiu = `reducere ${a.valoare}%`
    else if (a.tip === 'discount_valoric') beneficiu = `reducere ${a.valoare} RON`
    else if (a.tip === 'produs_gratuit') beneficiu = `${a.cantitateGratuita || 1} buc gratuit${a.productIdTinta ? ` din ${prodName(a.productIdTinta)}` : ''}`
    return { nume: rule.name || rule.eticheta || 'Promoție', eticheta: rule.eticheta || a.eticheta, conditii, beneficiu, combinabil: rule.combinabil !== false }
  }

  const totalFaraPromo = ofertaCalc?.scenarios?.[0]?.totals || {}

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <Layout title="Generator ofertă" subtitle={offerNr}>

      {/* Step nav */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setStep(1)} className={`btn ${step === 1 ? 'btn-primary' : 'btn-secondary'}`}>
          1. Selectare produse
          {selectedProducts.length > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 8px', fontSize: 11, marginLeft: 6 }}>{selectedProducts.length}</span>}
        </button>
        <button onClick={() => { if (selectedProducts.length) setStep(2) }} disabled={!selectedProducts.length}
          className={`btn ${step === 2 ? 'btn-primary' : 'btn-secondary'}`}>
          2. Previzualizare &amp; Salvare
        </button>
      </div>

      {/* ══ STEP 1 ══ */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          <div>
            {/* Filters */}
            <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select style={{ minWidth: 280 }} value={selectedFirmId} onChange={e => setSelectedFirmId(e.target.value)}>
                  <option value="">— Ofertă generală (fără client) —</option>
                  {firms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.currency}) — {(db.agents || []).find(a => a.id === f.agent_id)?.name || '?'}
                    </option>
                  ))}
                </select>
                <input type="text" placeholder="Caută produs..." style={{ flex: 1, minWidth: 160 }} value={search} onChange={e => setSearch(e.target.value)} />
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c === 'toate' ? 'Toate categoriile' : c}</option>)}
                </select>
              </div>
              {selectedFirm && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 14 }}>
                  <span>Agent: <strong>{(db.agents || []).find(a => a.id === selectedFirm.agent_id)?.name}</strong></span>
                  <span>Grup: <strong>{selectedFirm.grupClient}</strong></span>
                  <span>Valută: <strong style={{ color: selectedFirm.currency === 'EUR' ? '#b45309' : 'inherit' }}>{selectedFirm.currency}</strong></span>
                  <span>Transport: <strong>{selectedFirm.default_transport_type}</strong></span>
                </div>
              )}
            </div>

            {/* Product grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {filteredProducts.map(product => {
                const isSel = selectedProducts.includes(product.id)
                const ap = (product.product_prices || []).find(p => p.is_active)
                return (
                  <div key={product.id} onClick={() => toggleProduct(product.id)}
                    style={{ border: `2px solid ${isSel ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', background: isSel ? 'var(--blue-bg)' : 'var(--white)', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, flex: 1 }}>{product.name.length > 55 ? product.name.slice(0, 55) + '…' : product.name}</div>
                      <span style={{ fontSize: 18, flexShrink: 0, marginLeft: 8 }}>{isSel ? '✓' : '○'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{product.brand || product.marca} · {product.cod}</div>
                    <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700 }}>{lei(ap?.base_price || 0)}/rolă</div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                      {(product.product_uom || []).filter(u => u.is_offer_display).map(u => (
                        <span key={u.uom_code} style={{ fontSize: 9, padding: '1px 5px', background: 'var(--bg3)', borderRadius: 3, color: 'var(--text2)', fontFamily: 'monospace' }}>
                          {u.uom_code.replace('_', ' ')}=×{u.coeficient}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1/-1', color: 'var(--text3)', padding: 32, textAlign: 'center' }}>Niciun produs găsit.</div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 16 }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 12 }}>Selectate ({selectedProducts.length})</div>
              {selectedProducts.length === 0
                ? <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Click pe produs pentru adăugare</div>
                : <>
                  {selectedProducts.map(pid => {
                    const p = (db.products || []).find(x => x.id === pid)
                    return p ? (
                      <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border2)', fontSize: 12 }}>
                        <span style={{ fontWeight: 500, flex: 1, paddingRight: 8 }}>{p.name.length > 42 ? p.name.slice(0, 42) + '…' : p.name}</span>
                        <button onClick={() => toggleProduct(pid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-text)', fontSize: 16, flexShrink: 0 }}>×</button>
                      </div>
                    ) : null
                  })}
                  <button className="btn btn-primary w-full" style={{ marginTop: 16, justifyContent: 'center' }} onClick={() => setStep(2)}>
                    Generează ofertă →
                  </button>
                </>
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 2: Previzualizare A4 ══ */}
      {step === 2 && ofertaCalc && (
        <div>
          {/* Toolbar */}
          <div className="card no-print" style={{ marginBottom: 16, padding: '10px 16px' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>← Modifică</button>
              <button className="btn btn-secondary btn-sm" onClick={printOferta}>🖨 Print / PDF</button>
              {!saved
                ? <button className="btn btn-primary btn-sm" onClick={async () => {
                    try { await doSave(); setSaved(true) }
                    catch (err) { alert('Eroare la salvare: ' + (err.message || err)) }
                  }}>💾 Salvează oferta</button>
                : <button className="btn btn-success btn-sm" onClick={() => navigate('/admin/oferte')}>✓ Salvată → Oferte</button>
              }
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCopy(v => !v)}>📋 Copiază pentru alt client</button>
            </div>

            {showCopy && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Copiază pentru:</span>
                <select style={{ flex: 1 }} value={copyTarget} onChange={e => setCopyTarget(e.target.value)}>
                  <option value="">— Selectează firma —</option>
                  {firms.filter(f => f.id !== selectedFirmId).map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.currency})</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" disabled={!copyTarget} onClick={async () => {
                  const name = firms.find(f => f.id === copyTarget)?.name
                  try {
                    await doSave(copyTarget)
                    setShowCopy(false); setCopyTarget('')
                    alert(`✓ Ofertă copiată și salvată pentru ${name}`)
                  } catch (err) { alert('Eroare la salvare: ' + (err.message || err)) }
                }}>Copiază</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowCopy(false); setCopyTarget('') }}>×</button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              OFERTĂ A4 — Live preview
          ═══════════════════════════════════════════ */}
          <div className="oferta-preview" style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.12)', maxWidth: 900, margin: '0 auto' }}>

            {/* ── HEADER ── */}
            <div style={{ background: '#0f172a', padding: '20px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <GixenLogo color="#ffffff" height={42} showSymbol={true} />
                <div style={{ color: '#475569', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 5 }}>
                  Ofertă comercială
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18, letterSpacing: '0.02em' }}>{offerNr}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Data emiterii: {todayFmt()}</div>
              </div>
            </div>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #1d4ed8, #3b82f6, #1d4ed8)' }} />

            {/* ── PARTIES ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '20px 36px', borderBottom: '1px solid #f1f5f9', gap: 32 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>Furnizor</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 6 }}>{GIXEN.name}</div>
                {[`CUI: ${GIXEN.cui}`, `Reg. Com.: ${GIXEN.regCom}`, GIXEN.adresa, GIXEN.email, GIXEN.telefon].map((v, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>{v}</div>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>Cumpărător</div>
                {selectedFirm ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 6 }}>{selectedFirm.name}</div>
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>CUI: {selectedFirm.cui}</div>
                    {selectedFirm.regCom && <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>Reg. Com.: {selectedFirm.regCom}</div>}
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>{selectedFirm.adresa}{selectedFirm.localitate ? `, ${selectedFirm.localitate}` : ''}</div>
                    {selectedFirm.email && <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>{selectedFirm.email}</div>}
                    {selectedFirm.telefon && <div style={{ fontSize: 11, color: '#475569' }}>{selectedFirm.telefon}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 24 }}>Ofertă generală</div>
                )}
              </div>
            </div>

            <div style={{ padding: '20px 36px' }}>

              {/* ── DEFINIȚIE UoM ── */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 16px', marginBottom: 20, border: '1px solid #e2e8f0', fontSize: 12, color: '#334155' }}>
                <strong style={{ color: '#0f172a' }}>1 Rolă</strong>
                <span style={{ color: '#64748b' }}> (baza) · toate prețurile sunt exprimate per rolă</span>
              </div>

              {/* ── TABEL PREȚURI PER ROLĂ ── */}
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>
                Prețuri comerciale {selectedFirm ? `— ${selectedFirm.name}` : '(prețuri de bază)'}
                {isEur && eurRate > 0 && <span style={{ color: '#b45309', marginLeft: 8 }}>· EUR la {eurRate.toFixed(4)} RON</span>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 2 }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>PRODUS</th>
                    <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: 10, color: '#e2e8f0', fontWeight: 700 }}>PREȚ/ROLĂ</th>
                    <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: 10, color: '#fbbf24', fontWeight: 700 }}>PREȚ FINAL/ROLĂ</th>
                    <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>TVA {TVA_LABEL}</th>
                    {isEur && <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: 10, color: '#fcd34d', fontWeight: 700 }}>EUR/ROLĂ</th>}
                  </tr>
                </thead>
                <tbody>
                  {ofertaCalc.produse.map((p, rowIdx) => {
                    const product = (db.products || []).find(x => x.id === p.id)
                    if (!product) return null
                    const pretBaza = ofertaCalc.pricesPerUom[p.id]?.ROLA ?? 0
                    // Promoții aplicabile acestui produs
                    const promoAplic = ofertaCalc.eligibleRules.filter(rule => {
                      const orig = (db.promotionRules || []).find(r => r.id === rule.id)
                      if (!orig) return true // include if can't determine
                      const a = orig.actiune
                      return !a || a.tip?.includes('total') || a.productIdTinta === p.id
                    })
                    // Preț final din scenariul cumul sau best available
                    const bestScenario = ofertaCalc.scenarios.find(s => s.id === 'cumul_toate') ||
                      ofertaCalc.scenarios.slice(1).sort((a, b) => (a.totals.ROLA ?? 0) - (b.totals.ROLA ?? 0))[0]
                    // Per-product final price: apply eligible promos on pretBaza
                    let pretFinal = pretBaza
                    promoAplic.forEach(rule => {
                      const orig = (db.promotionRules || []).find(r => r.id === rule.id)
                      const a = orig?.actiune
                      if (!a) return
                      if (a.tip === 'discount_procent_linie' || a.tip === 'discount_procent_total') {
                        pretFinal = pretFinal * (1 - a.valoare / 100)
                      } else if (a.tip === 'produs_gratuit' && a.productIdTinta === p.id) {
                        pretFinal = Math.max(0, pretFinal - pretBaza * (a.cantitateGratuita || 1))
                      }
                    })
                    pretFinal = Math.round(pretFinal * 100) / 100
                    const hasPromo = promoAplic.length > 0 && pretFinal < pretBaza
                    return (
                      <tr key={p.id} style={{ background: rowIdx % 2 === 1 ? '#f8fafc' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {(product.imagine || product.image_url) && (
                              <img src={product.imagine || product.image_url} alt=""
                                style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, flexShrink: 0, background: '#f8fafc' }}
                                onError={e => e.target.style.display = 'none'} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', lineHeight: 1.3 }}>{product.name}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{product.cod}{product.brand ? ` · ${product.brand}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: hasPromo ? '#94a3b8' : '#1d4ed8', textDecoration: hasPromo ? 'line-through' : 'none' }}>
                            {fmtVal(pretBaza)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: hasPromo ? '#16a34a' : '#1d4ed8' }}>{fmtVal(pretFinal)}</div>
                          {hasPromo && <div style={{ fontSize: 9, color: '#16a34a', marginTop: 1 }}>−{fmtVal(pretBaza - pretFinal)}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{fmtVal(Math.round(pretFinal * TVA_RATE * 100) / 100)}</div>
                        </td>
                        {isEur && eurRate > 0 && (
                          <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309' }}>{eur(pretFinal / eurRate)}</div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#1e3a5f' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                      {fmtVal(totalFaraPromo.ROLA)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {(() => {
                        const bestTotals = (ofertaCalc.scenarios.find(s => s.id === 'cumul_toate') ||
                          ofertaCalc.scenarios.slice(1).sort((a, b) => (a.totals.ROLA ?? 0) - (b.totals.ROLA ?? 0))[0])?.totals
                        const totalFinal = bestTotals?.ROLA ?? totalFaraPromo.ROLA
                        return <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>{fmtVal(totalFinal)}</div>
                      })()}
                    </td>
                    <td />
                    {isEur && <td />}
                  </tr>
                  <tr style={{ background: '#17304d' }}>
                    <td style={{ padding: '8px 16px', fontSize: 11, color: '#94a3b8' }}>TVA {TVA_LABEL}</td>
                    <td colSpan={isEur ? 4 : 3} style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: '#94a3b8' }}>
                      {fmtVal(Math.round((totalFaraPromo.ROLA || 0) * TVA_RATE * 100) / 100)}
                    </td>
                  </tr>
                  <tr style={{ background: '#0f2035', borderTop: '2px solid #fbbf24' }}>
                    <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>TOTAL CU TVA ({TVA_LABEL})</td>
                    <td colSpan={isEur ? 4 : 3} style={{ padding: '11px 14px', textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>
                        {fmtVal(Math.round((totalFaraPromo.ROLA || 0) * (1 + TVA_RATE) * 100) / 100)}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* ── PROMOȚII APLICABILE (cu condiții) ── */}
              {ofertaCalc.eligibleRules.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#15803d', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>
                    Promoții aplicabile
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ofertaCalc.eligibleRules.map(rl => {
                      const d = describeRule(rl)
                      return (
                        <div key={rl.id} className="promo-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>{d.nume}</span>
                            {d.eticheta && d.eticheta !== d.nume && <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 12, background: '#16a34a', color: '#fff', fontWeight: 600 }}>{d.eticheta}</span>}
                            {d.combinabil && <span style={{ fontSize: 9, color: '#15803d', border: '1px solid #16a34a', borderRadius: 10, padding: '0 6px' }}>cumulabilă</span>}
                          </div>
                          {d.beneficiu && <div style={{ fontSize: 12, color: '#166534', marginBottom: d.conditii.length ? 4 : 0 }}>🎁 Beneficiu: <strong>{d.beneficiu}</strong></div>}
                          {d.conditii.length > 0 && (
                            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                              Condiții: {d.conditii.join(' și ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── CONDIȚII ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 0', marginTop: 28 }}>
                {[
                  ['🚚', 'Livrare', 'La sediul / punctul de livrare indicat de cumpărător'],
                  ['💳', 'Plată', 'Ordin de plată (OP) conform contract'],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ padding: '0 20px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', marginBottom: 5 }}>{icon} {title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                ))}
              </div>

              {/* Observații */}
              {observatii && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: 8, padding: '11px 16px', margin: '16px 0', fontSize: 11, color: '#1d4ed8', lineHeight: 1.6 }}>
                  {observatii}
                </div>
              )}

              {/* Semnături */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, padding: '24px 0 12px' }}>
                {['Furnizor — Gixen SRL', selectedFirm ? `Cumpărător — ${selectedFirm.name}` : 'Cumpărător'].map(label => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 36 }}>{label}</div>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 5, fontSize: 10, color: '#94a3b8' }}>Semnătură și ștampilă</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{ background: '#0f172a', padding: '10px 36px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.8 }}>
                {GIXEN.name} · CUI {GIXEN.cui} · Reg. Com. {GIXEN.regCom} · {GIXEN.adresa} · {GIXEN.email} · {GIXEN.telefon}
              </div>
              <div style={{ fontSize: 9, color: '#334155', marginTop: 2 }}>
                Prețurile sunt exprimate per rolă, fără TVA.
              </div>
            </div>
          </div>

          {/* Observații input */}
          <div className="card" style={{ marginTop: 16, maxWidth: 900, margin: '16px auto 0' }}>
            <label style={{ fontWeight: 500, fontSize: 13 }}>Observații suplimentare (opțional)</label>
            <textarea className="w-full" rows={2} value={observatii} onChange={e => setObservatii(e.target.value)}
              placeholder="Condiții speciale de livrare, note pentru client..." style={{ marginTop: 6 }} />
          </div>
        </div>
      )}
    </Layout>
  )
}
