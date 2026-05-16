/**
 * Motor de promoții Gixen v2 — complet, fără bug-uri
 */

// ── Utils ──
const TODAY = () => new Date().toISOString().split('T')[0]

function normalizeDate(d) {
  if (!d) return null
  // YYYY-MM-DD → ok
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  // DD/MM/YYYY sau DD.MM.YYYY
  const m = d.match(/^(\d{2})[\/\.](\d{2})[\/\.](\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return d
}

// ── UoM conversii ──
export function toRole(cantitate, unitateSel, produs) {
  if (!cantitate || !produs?.conversii) return cantitate || 0
  const { rolePerBax = 1, rolePerPalet = 1 } = produs.conversii
  if (!unitateSel || unitateSel === 'rolă' || unitateSel === 'rola') return cantitate
  if (unitateSel === 'bax') return cantitate * rolePerBax
  if (unitateSel === 'palet') return cantitate * rolePerPalet
  return cantitate
}

export function pretPerUnitate(pretPerRola, unitateSel, produs) {
  if (!produs?.conversii) return pretPerRola
  const { rolePerBax = 1, rolePerPalet = 1 } = produs.conversii
  if (!unitateSel || unitateSel === 'rolă' || unitateSel === 'rola') return pretPerRola
  if (unitateSel === 'bax') return pretPerRola * rolePerBax
  if (unitateSel === 'palet') return pretPerRola * rolePerPalet
  return pretPerRola
}

// ── Tier pricing ──
export function getTierPret(product, cantRole) {
  if (!product?.tierPricing?.length) return product?.pretBaza || 0
  const tier = [...product.tierPricing]
    .sort((a, b) => b.cantMin - a.cantMin)
    .find(t => cantRole >= t.cantMin)
  return tier ? tier.pret : product.pretBaza || 0
}

// ── Verificare regulă activă ──
function esteActiva(rule) {
  if (!rule.activ) return false
  const azi = TODAY()
  const start = normalizeDate(rule.restrictii?.dataStart)
  const end = normalizeDate(rule.restrictii?.dataEnd)
  if (start && start > azi) return false
  if (end && end < azi) return false
  return true
}

// ── Evaluare O singură condiție ──
function evalConditie(cond, liniiCos, totalBrut, firma) {
  switch (cond.tip) {
    case 'produs_in_cos': {
      if (!cond.productId) return false
      const linie = liniiCos.find(l => l.productId === cond.productId)
      if (!linie) return false
      return linie.cantRole >= (cond.cantMin || 0)
    }
    case 'cantitate_totala_categorie': {
      if (!cond.categorie) return false
      const total = liniiCos
        .filter(l => l.produs?.categorie === cond.categorie)
        .reduce((s, l) => s + l.cantRole, 0)
      return total >= (cond.cantMin || 0)
    }
    case 'valoare_cos':
      return totalBrut >= (cond.valoareMin || 0)
    case 'grup_client':
      if (!firma || !cond.grup) return false
      return firma.grupClient === cond.grup
    case 'marca_in_cos': {
      if (!cond.marca) return false
      return liniiCos.some(l => l.produs?.marca === cond.marca && l.cantRole >= (cond.cantMin || 0))
    }
    default:
      return false
  }
}

// ── Evaluare set de condiții cu AND/OR ──
function evalToateConditiile(conditii, liniiCos, totalBrut, firma) {
  if (!conditii?.length) return false // fără condiții = nu se aplică
  
  // Prima condiție fără operator
  let result = evalConditie(conditii[0], liniiCos, totalBrut, firma)
  
  for (let i = 1; i < conditii.length; i++) {
    const cond = conditii[i]
    const val = evalConditie(cond, liniiCos, totalBrut, firma)
    if ((cond.operator || 'AND') === 'OR') {
      result = result || val
    } else {
      result = result && val
    }
  }
  return result
}

/**
 * MOTORUL PRINCIPAL
 *
 * @param {Array} liniiCos - [{ productId, cantitate, cantRole, unitateSel, produs, totalBrutLinie }]
 * @param {Object|null} firma - { id, grupClient, discountGlobal } sau null pentru oferte fără client
 * @param {Object} db - { promotionRules, clientPricing, products }
 * @param {Object} options - { skipClientPricing, skipGlobalDiscount, skipPromoRules }
 */
export function calculeazaCos(liniiCos, firma, db, options = {}) {
  const { skipClientPricing = false, skipGlobalDiscount = false, skipPromoRules = false } = options

  if (!liniiCos?.length) {
    return { liniiCalculate: [], discountLinii: [], totalBrut: 0, totalDiscount: 0, totalNet: 0 }
  }

  // Step 1: Calculează tier pricing per linie
  const liniiCalculate = liniiCos.map((linie, idx) => {
    const { produs, cantRole } = linie
    const tierPret = getTierPret(produs, cantRole)
    const pretAfisatPerUm = pretPerUnitate(tierPret, linie.unitateSel, produs)
    const totalBrutLinie = tierPret * cantRole
    return { ...linie, idx, tierPret, pretAfisatPerUm, totalBrutLinie }
  })

  const totalBrut = liniiCalculate.reduce((s, l) => s + l.totalBrutLinie, 0)
  const discountLinii = []

  // Step 2: Client pricing (discount negociat per produs)
  if (!skipClientPricing && firma?.id) {
    liniiCalculate.forEach(linie => {
      const cp = (db.clientPricing || []).find(
        c => c.firmId === firma.id && c.productId === linie.productId
      )
      if (cp?.discountExtra > 0) {
        const valDisc = -(linie.totalBrutLinie * cp.discountExtra / 100)
        discountLinii.push({
          refLinieIdx: linie.idx,
          productId: linie.productId,
          eticheta: `Discount negociat −${cp.discountExtra}%`,
          procent: cp.discountExtra,
          valoare: Math.round(valDisc * 100) / 100,
          tip: 'CLIENT_PRICING',
          ruleId: null,
        })
      }
    })
  }

  // Step 3: Reguli promoționale
  if (!skipPromoRules) {
    const rules = (db.promotionRules || [])
      .filter(r => esteActiva(r))
      .sort((a, b) => (a.prioritate || 99) - (b.prioritate || 99))

    const appliedRuleIds = new Set()

    for (const rule of rules) {
      // Verifică combinabilitate
      if (!rule.combinabil && appliedRuleIds.size > 0) continue

      // Calculează totalul curent pentru condiții de valoare
      const totalCurent = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)

      // Verifică toate condițiile
      if (!evalToateConditiile(rule.conditii, liniiCalculate, totalCurent, firma)) continue

      const actiune = rule.actiune
      if (!actiune) continue

      // Determină baza de calcul
      function getBaza(linieIdx) {
        const linie = liniiCalculate[linieIdx]
        if (!linie) return 0
        if (rule.bazaCalcul === 'pret_baza') return linie.totalBrutLinie
        if (rule.bazaCalcul === 'pret_dupa_discount_anterior') {
          const discPrev = discountLinii
            .filter(d => d.refLinieIdx === linieIdx)
            .reduce((s, d) => s + d.valoare, 0)
          return linie.totalBrutLinie + discPrev
        }
        if (rule.bazaCalcul === 'total_net') {
          return totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
        }
        return linie.totalBrutLinie
      }

      switch (actiune.tip) {
        case 'discount_procent_linie': {
          const tintaIdx = liniiCalculate.findIndex(l => l.productId === actiune.productIdTinta)
          if (tintaIdx < 0) continue
          const baza = getBaza(tintaIdx)
          discountLinii.push({
            refLinieIdx: tintaIdx,
            productId: actiune.productIdTinta,
            eticheta: actiune.eticheta || rule.name,
            procent: actiune.valoare,
            valoare: Math.round(-baza * actiune.valoare / 100 * 100) / 100,
            tip: rule.tip, ruleId: rule.id,
          })
          appliedRuleIds.add(rule.id)
          break
        }
        case 'discount_valoric_linie': {
          const tintaIdx = liniiCalculate.findIndex(l => l.productId === actiune.productIdTinta)
          if (tintaIdx < 0) continue
          discountLinii.push({
            refLinieIdx: tintaIdx,
            productId: actiune.productIdTinta,
            eticheta: actiune.eticheta || rule.name,
            procent: null,
            valoare: -Math.abs(actiune.valoare),
            tip: rule.tip, ruleId: rule.id,
          })
          appliedRuleIds.add(rule.id)
          break
        }
        case 'discount_procent_total': {
          const baza = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
          discountLinii.push({
            refLinieIdx: -1, productId: null,
            eticheta: actiune.eticheta || rule.name,
            procent: actiune.valoare,
            valoare: Math.round(-baza * actiune.valoare / 100 * 100) / 100,
            tip: rule.tip, ruleId: rule.id,
          })
          appliedRuleIds.add(rule.id)
          break
        }
        case 'discount_valoric_total': {
          discountLinii.push({
            refLinieIdx: -1, productId: null,
            eticheta: actiune.eticheta || rule.name,
            procent: null,
            valoare: -Math.abs(actiune.valoare),
            tip: rule.tip, ruleId: rule.id,
          })
          appliedRuleIds.add(rule.id)
          break
        }
        case 'produs_gratuit': {
          const tintaIdx = liniiCalculate.findIndex(l => l.productId === actiune.productIdTinta)
          if (tintaIdx < 0) continue
          const linie = liniiCalculate[tintaIdx]
          const cantGrat = actiune.cantitateGratuita || 1
          discountLinii.push({
            refLinieIdx: tintaIdx,
            productId: actiune.productIdTinta,
            eticheta: `${actiune.eticheta || rule.name} (${cantGrat} role gratuite)`,
            procent: null,
            valoare: Math.round(-linie.tierPret * cantGrat * 100) / 100,
            tip: rule.tip, ruleId: rule.id,
          })
          appliedRuleIds.add(rule.id)
          break
        }
        default: break
      }
    }
  }

  // Step 4: Discount global firmă
  if (!skipGlobalDiscount && firma?.discountGlobal > 0) {
    const netDupaReguli = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
    discountLinii.push({
      refLinieIdx: -1, productId: null,
      eticheta: `Discount global firmă −${firma.discountGlobal}%`,
      procent: firma.discountGlobal,
      valoare: Math.round(-netDupaReguli * firma.discountGlobal / 100 * 100) / 100,
      tip: 'GLOBAL_FIRM', ruleId: null,
    })
  }

  const totalDiscount = discountLinii.reduce((s, d) => s + d.valoare, 0)
  const totalNet = Math.round((totalBrut + totalDiscount) * 100) / 100

  return {
    liniiCalculate,
    discountLinii,
    totalBrut: Math.round(totalBrut * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalNet,
  }
}

// ── Notificări promoții aproape active ──
export function getPromotiiNotificabile(liniiCos, firma, db) {
  const notif = []
  if (!liniiCos?.length) return notif

  ;(db.promotionRules || [])
    .filter(r => esteActiva(r))
    .forEach(rule => {
      if (!rule.conditii?.length) return

      // Verifică prima condiție de tip produs
      const primaCond = rule.conditii.find(c => c.tip === 'produs_in_cos' && c.productId)
      if (!primaCond) return

      const linieExista = liniiCos.find(l => l.productId === primaCond.productId)

      if (linieExista && linieExista.cantRole < (primaCond.cantMin || 0)) {
        const lipsesc = (primaCond.cantMin || 0) - linieExista.cantRole
        const produs = db.products.find(p => p.id === primaCond.productId)
        notif.push({
          ruleId: rule.id,
          tip: 'aproape_activa',
          mesaj: `Adaugă încă ${lipsesc} role de ${produs?.name || primaCond.productId} pentru: "${rule.actiune?.eticheta || rule.name}"`,
          productIdSugerat: null,
        })
      }

      // Promoție cu produs țintă în coș dar condiție nesatisfăcută
      if (rule.actiune?.productIdTinta) {
        const cosIds = new Set(liniiCos.map(l => l.productId))
        if (cosIds.has(rule.actiune.productIdTinta) && !linieExista) {
          const produs = db.products.find(p => p.id === primaCond.productId)
          notif.push({
            ruleId: rule.id,
            tip: 'promotie_disponibila',
            mesaj: `Promoție: "${rule.actiune?.eticheta || rule.name}" — adaugă ${produs?.name} în coș`,
            productIdSugerat: primaCond.productId,
          })
        }
      }
    })

  return notif
}
