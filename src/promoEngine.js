/**
 * Motor de promoții Gixen v4
 * Fix: uomCodes dinamic din product_uom, nu hardcodat
 */

const TODAY = () => new Date().toISOString().split('T')[0]

function normalizeDate(d) {
  if (!d) return null
  // ISO datetime ("2026-06-01T00:00:00...") sau Date → ia primii 10 caractere
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  const s = String(d)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{2})[\/\.](\d{2})[\/\.](\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s
}

// ── UoM conversie ──
export function toRole(cantitate, unitateSel, produs) {
  if (!cantitate || !produs) return cantitate || 0
  const uom = (produs.product_uom || []).find(u =>
    u.uom_code?.toLowerCase() === unitateSel?.toLowerCase() ||
    u.uom_name?.toLowerCase() === unitateSel?.toLowerCase()
  )
  return uom ? cantitate * uom.coeficient : cantitate
}

export function pretPerUnitate(pretPerRola, unitateSel, produs) {
  if (!produs) return pretPerRola
  const uom = (produs.product_uom || []).find(u =>
    u.uom_code?.toLowerCase() === unitateSel?.toLowerCase() ||
    u.uom_name?.toLowerCase() === unitateSel?.toLowerCase()
  )
  return uom ? pretPerRola * uom.coeficient : pretPerRola
}

// ── Commission rate cu prioritate ──
function getCommissionRate(agentId, productId, customerId, db) {
  if (!agentId || !db.commission_rules) return 0
  const rules = (db.commission_rules || []).filter(r => r.is_active && r.agent_id === agentId)
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)
  let match = sorted.find(r => r.product_id === productId && r.customer_id === customerId)
  if (match) return match.rate
  match = sorted.find(r => r.product_id == null && r.customer_id === customerId)
  if (match) return match.rate
  match = sorted.find(r => r.product_id === productId && r.customer_id == null)
  if (match) return match.rate
  match = sorted.find(r => r.product_id == null && r.customer_id == null)
  return match ? match.rate : 0
}

// ── Preț de bază ──
function getBasePret(produs) {
  const ap = (produs.product_prices || []).find(p => p.is_active)
  return ap?.base_price || produs.pretBaza || 0
}

// ── Preț pentru client (cu comision + client pricing) ──
export function getPretPentruClient(produs, firma, db) {
  let pret = getBasePret(produs)
  if (firma?.agent_id) {
    const commRate = getCommissionRate(firma.agent_id, produs.id, firma.id, db)
    pret = pret * (1 + commRate / 100)
  }
  const cp = (db.clientPricing || []).find(c => c.firmId === firma?.id && c.productId === produs.id)
  if (cp?.discountExtra > 0) pret = pret * (1 - cp.discountExtra / 100)
  return Math.round(pret * 100) / 100
}

// ── Verificare regulă activă (+ filtru client) ──
export function esteActiva(rule, customerId) {
  if (!rule.activ) return false
  const azi = TODAY()
  const start = normalizeDate(rule.restrictii?.dataStart)
  const end = normalizeDate(rule.restrictii?.dataEnd)
  if (start && start > azi) return false
  if (end && end < azi) return false
  if (rule.customer_ids?.length && customerId && !rule.customer_ids.includes(customerId)) return false
  return true
}

// ── Evaluare condiție ──
function evalConditie(cond, liniiCos, totalBrut, firma, db) {
  switch (cond.tip) {
    case 'produs_in_cos': {
      const linie = liniiCos.find(l => l.productId === cond.productId)
      return linie ? linie.cantRole >= (cond.cantMin || 0) : false
    }
    case 'valoare_cos': return totalBrut >= (cond.valoareMin || 0)
    case 'grup_client': return firma?.grupClient === cond.grup
    case 'marca_in_cos':
      return liniiCos.some(l => l.produs?.marca === cond.marca && l.cantRole >= (cond.cantMin || 0))
    case 'cumul_comenzi_luna': {
      if (!firma?.id) return false
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const count = (db.orders || []).filter(o =>
        (o.firmId === firma.id || o.customer_id === firma.id) &&
        !['anulata', 'anulat'].includes(o.status) &&
        (o.dataComanda || o.created_at || '').startsWith(ym)
      ).length
      return count >= (cond.nr_comenzi_min || 1)
    }
    case 'cumul_valoare_luna': {
      if (!firma?.id) return false
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const totalLuna = (db.orders || [])
        .filter(o =>
          (o.firmId === firma.id || o.customer_id === firma.id) &&
          !['anulata', 'anulat'].includes(o.status) &&
          (o.dataComanda || o.created_at || '').startsWith(ym)
        )
        .reduce((s, o) => s + (o.total || 0), 0)
      return totalLuna >= (cond.valoare_min || 0)
    }
    default: return false
  }
}

function evalToateConditiile(conditii, liniiCos, totalBrut, firma, db) {
  if (!conditii?.length) return false
  let result = evalConditie(conditii[0], liniiCos, totalBrut, firma, db)
  for (let i = 1; i < conditii.length; i++) {
    const val = evalConditie(conditii[i], liniiCos, totalBrut, firma, db)
    result = (conditii[i].operator || 'AND') === 'OR' ? result || val : result && val
  }
  return result
}

// ═══════════════════════════════════════════════════════
// MOTOR PRINCIPAL — calcul coș
// ═══════════════════════════════════════════════════════
export function calculeazaCos(liniiCos, firma, db, options = {}) {
  const { skipClientPricing = false, skipGlobalDiscount = false, skipPromoRules = false } = options
  if (!liniiCos?.length) return { liniiCalculate: [], discountLinii: [], totalBrut: 0, totalDiscount: 0, totalNet: 0 }

  const liniiCalculate = liniiCos.map((linie, idx) => {
    const { produs, cantRole } = linie
    const pretClient = getPretPentruClient(produs, firma, db)
    const pretAfisatPerUm = pretPerUnitate(pretClient, linie.unitateSel, produs)
    return { ...linie, idx, pretClient, pretAfisatPerUm, totalBrutLinie: pretClient * cantRole }
  })

  const totalBrut = liniiCalculate.reduce((s, l) => s + l.totalBrutLinie, 0)
  const discountLinii = []

  if (!skipPromoRules) {
    const rules = (db.promotionRules || [])
      .filter(r => esteActiva(r, firma?.id))
      .sort((a, b) => (a.prioritate || 99) - (b.prioritate || 99))

    const appliedIds = new Set()

    for (const rule of rules) {
      if (!rule.combinabil && appliedIds.size > 0) continue
      const totalCurent = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
      if (!evalToateConditiile(rule.conditii, liniiCalculate, totalCurent, firma, db)) continue
      const a = rule.actiune
      if (!a) continue

      switch (a.tip) {
        case 'discount_procent_linie': {
          const idx = liniiCalculate.findIndex(l => l.productId === a.productIdTinta)
          if (idx < 0) break
          discountLinii.push({ refLinieIdx: idx, productId: a.productIdTinta, eticheta: a.eticheta || rule.name, procent: a.valoare, valoare: Math.round(-liniiCalculate[idx].totalBrutLinie * a.valoare / 100 * 100) / 100, tip: rule.tip, ruleId: rule.id })
          appliedIds.add(rule.id); break
        }
        case 'discount_procent_total': {
          const baza = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
          discountLinii.push({ refLinieIdx: -1, productId: null, eticheta: a.eticheta || rule.name, procent: a.valoare, valoare: Math.round(-baza * a.valoare / 100 * 100) / 100, tip: rule.tip, ruleId: rule.id })
          appliedIds.add(rule.id); break
        }
        case 'discount_valoric_linie': {
          const idx = liniiCalculate.findIndex(l => l.productId === a.productIdTinta)
          if (idx < 0) break
          discountLinii.push({ refLinieIdx: idx, productId: a.productIdTinta, eticheta: a.eticheta || rule.name, procent: null, valoare: -Math.abs(a.valoare), tip: rule.tip, ruleId: rule.id })
          appliedIds.add(rule.id); break
        }
        case 'discount_valoric_total':
          discountLinii.push({ refLinieIdx: -1, productId: null, eticheta: a.eticheta || rule.name, procent: null, valoare: -Math.abs(a.valoare), tip: rule.tip, ruleId: rule.id })
          appliedIds.add(rule.id); break
        case 'produs_gratuit': {
          const idx = liniiCalculate.findIndex(l => l.productId === a.productIdTinta)
          if (idx < 0) break
          const cant = a.cantitateGratuita || 1
          discountLinii.push({ refLinieIdx: idx, productId: a.productIdTinta, eticheta: `${a.eticheta || rule.name} (${cant} role gratuite)`, procent: null, valoare: Math.round(-liniiCalculate[idx].pretClient * cant * 100) / 100, tip: rule.tip, ruleId: rule.id })
          appliedIds.add(rule.id); break
        }
      }
    }
  }

  if (!skipGlobalDiscount && firma?.discountGlobal > 0) {
    const net = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
    discountLinii.push({ refLinieIdx: -1, productId: null, eticheta: `Discount global −${firma.discountGlobal}%`, procent: firma.discountGlobal, valoare: Math.round(-net * firma.discountGlobal / 100 * 100) / 100, tip: 'GLOBAL_FIRM', ruleId: null })
  }

  const totalDiscount = discountLinii.reduce((s, d) => s + d.valoare, 0)
  return {
    liniiCalculate, discountLinii,
    totalBrut: Math.round(totalBrut * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalNet: Math.round((totalBrut + totalDiscount) * 100) / 100
  }
}

// ═══════════════════════════════════════════════════════
// MOTOR OFERTĂ — Fix principal: uomCodes dinamic
// ═══════════════════════════════════════════════════════
export function calculeazaOferta(productIds, firma, db) {
  const produse = productIds.map(id => (db.products || []).find(p => p.id === id)).filter(Boolean)
  if (!produse.length) return { produse: [], pricesPerUom: {}, eligibleRules: [], scenarios: [], uomCodes: [] }

  // ── FIX: Colectăm uomCodes DIN produsele reale, NU hardcodat ──
  const seenUom = new Set()
  const uomOrder = [] // ordinea de afișare
  for (const produs of produse) {
    ;(produs.product_uom || [])
      .filter(u => u.is_offer_display !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .forEach(u => {
        if (!seenUom.has(u.uom_code)) {
          seenUom.add(u.uom_code)
          uomOrder.push(u.uom_code)
        }
      })
  }
  const uomCodes = uomOrder.length ? uomOrder : ['ROLA', 'BAX', 'PALET_DUBA', 'PALET_CAMION']

  // ── Prețuri per produs per UoM ──
  const pricesPerUom = {}
  produse.forEach(produs => {
    const pretRola = getPretPentruClient(produs, firma, db)
    pricesPerUom[produs.id] = { name: produs.name, cod: produs.cod }
    ;(produs.product_uom || [])
      .filter(u => u.is_offer_display !== false)
      .forEach(uom => {
        pricesPerUom[produs.id][uom.uom_code] = Math.round(pretRola * uom.coeficient * 100) / 100
      })
  })

  // ── Promoții eligibile (simulare coș cu cantitate maximă) ──
  const liniiSimulate = produse.map(produs => {
    const pretRola = getPretPentruClient(produs, firma, db)
    return {
      productId: produs.id, cantitate: 9999, cantRole: 9999,
      unitateSel: 'ROLA', produs,
      totalBrutLinie: pretRola * 9999
    }
  })
  const totalSimulat = liniiSimulate.reduce((s, l) => s + l.totalBrutLinie, 0)

  const eligibleRules = (db.promotionRules || []).filter(rule =>
    esteActiva(rule, firma?.id) && evalToateConditiile(rule.conditii, liniiSimulate, totalSimulat, firma, db)
  )

  // ── Calculează discount per produs per UoM pentru fiecare scenariu ──
  function applyRulesToPrices(rules) {
    const result = {}
    uomCodes.forEach(uomCode => {
      let totalUom = 0
      produse.forEach(produs => {
        let pretUom = pricesPerUom[produs.id]?.[uomCode]
        if (pretUom == null) return

        rules.forEach(rule => {
          const a = rule.actiune
          if (!a) return
          const targetsProdus = a.productIdTinta === produs.id
          const targetsAll = a.tip?.includes('total')

          if (targetsProdus || targetsAll) {
            if (a.tip === 'discount_procent_linie' || a.tip === 'discount_procent_total') {
              pretUom = pretUom * (1 - a.valoare / 100)
            } else if (a.tip === 'produs_gratuit' && targetsProdus) {
              // Reducere per unitate: câte role gratuite / coeficient UoM
              const uomDef = (produs.product_uom || []).find(u => u.uom_code === uomCode)
              const coef = uomDef?.coeficient || 1
              const pretRola = pricesPerUom[produs.id]?.ROLA || 0
              pretUom = Math.max(0, pretUom - (pretRola * (a.cantitateGratuita || 1) / coef))
            }
          }
        })
        totalUom += Math.max(0, pretUom)
      })
      result[uomCode] = Math.round(totalUom * 100) / 100
    })
    return result
  }

  // ── Construiește scenariile ──
  const scenarios = []

  // Scenariu 0: fără promoții
  scenarios.push({
    id: 'no_promo',
    label: 'Fără promoții',
    totals: applyRulesToPrices([]),
    rules: []
  })

  // Un scenariu per promoție individuală
  eligibleRules.forEach(rule => {
    scenarios.push({
      id: rule.id,
      label: rule.name,
      eticheta: rule.actiune?.eticheta,
      totals: applyRulesToPrices([rule]),
      rules: [rule.id]
    })
  })

  // Scenarii cumulate (combinații de reguli combinabile)
  const combinabile = eligibleRules.filter(r => r.combinabil !== false)
  if (combinabile.length > 1) {
    scenarios.push({
      id: 'cumul_toate',
      label: 'Cumul promoții: ' + combinabile.map(r => r.actiune?.eticheta || r.name).join(' + '),
      totals: applyRulesToPrices(combinabile),
      rules: combinabile.map(r => r.id)
    })
  }

  return {
    produse: produse.map(p => ({ id: p.id, name: p.name, cod: p.cod, imagine: p.imagine })),
    pricesPerUom,
    eligibleRules: eligibleRules.map(r => ({
      id: r.id, name: r.name, eticheta: r.actiune?.eticheta,
      conditii: r.conditii, tip: r.tip
    })),
    scenarios,
    uomCodes
  }
}

// ── Notificări promoții aproape active ──
export function getPromotiiNotificabile(liniiCos, firma, db) {
  if (!liniiCos?.length) return []
  const notif = []
  ;(db.promotionRules || []).filter(r => esteActiva(r, firma?.id)).forEach(rule => {
    const primaCond = (rule.conditii || []).find(c => c.tip === 'produs_in_cos' && c.productId)
    if (!primaCond) return
    const linie = liniiCos.find(l => l.productId === primaCond.productId)
    if (linie && linie.cantRole < (primaCond.cantMin || 0)) {
      const lipsesc = (primaCond.cantMin || 0) - linie.cantRole
      const produs = (db.products || []).find(p => p.id === primaCond.productId)
      notif.push({
        ruleId: rule.id,
        tip: 'aproape_activa',
        mesaj: `Adaugă încă ${lipsesc} role de ${produs?.name || primaCond.productId} pentru: "${rule.actiune?.eticheta || rule.name}"`,
        productIdSugerat: primaCond.productId
      })
    }
  })
  return notif
}
