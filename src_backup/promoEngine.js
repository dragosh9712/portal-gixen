/**
 * Motor de promoții Gixen — suportă orice combinație de reguli
 * Inspirat din NAV/Business Central Sales Pricing & Discounts
 */

const TODAY = () => new Date().toISOString().split('T')[0]

// ── Conversia cantităților ──
export function toRole(cantitate, unitateSel, produs) {
  if (!produs?.conversii) return cantitate
  const { rolePerBax, rolePerPalet } = produs.conversii
  if (unitateSel === 'rolă' || unitateSel === 'rola') return cantitate
  if (unitateSel === 'bax') return cantitate * rolePerBax
  if (unitateSel === 'palet') return cantitate * rolePerPalet
  return cantitate
}

export function fromRole(cantRole, unitateSel, produs) {
  if (!produs?.conversii) return cantRole
  const { rolePerBax, rolePerPalet } = produs.conversii
  if (unitateSel === 'rolă' || unitateSel === 'rola') return cantRole
  if (unitateSel === 'bax') return cantRole / rolePerBax
  if (unitateSel === 'palet') return cantRole / rolePerPalet
  return cantRole
}

export function pretPerUnitate(pretPerRola, unitateSel, produs) {
  if (!produs?.conversii) return pretPerRola
  const { rolePerBax, rolePerPalet } = produs.conversii
  if (unitateSel === 'rolă' || unitateSel === 'rola') return pretPerRola
  if (unitateSel === 'bax') return pretPerRola * rolePerBax
  if (unitateSel === 'palet') return pretPerRola * rolePerPalet
  return pretPerRola
}

// ── Tier pricing per rolă ──
export function getTierPret(product, cantRole) {
  if (!product?.tierPricing?.length) return product?.pretBaza || 0
  const tier = product.tierPricing.find(t => cantRole >= t.cantMin && cantRole <= t.cantMax)
  return tier ? tier.pret : product.tierPricing[product.tierPricing.length - 1].pret
}

// ── Verificare condiție individuală ──
function evalConditie(cond, cosRolе, totalBrut, firma) {
  switch (cond.tip) {
    case 'produs_in_cos': {
      const linie = cosRolе.find(l => l.productId === cond.productId)
      return linie ? linie.cantRole >= (cond.cantMin || 0) : false
    }
    case 'cantitate_totala_categorie': {
      const total = cosRolе
        .filter(l => l.categorie === cond.categorie)
        .reduce((s, l) => s + l.cantRole, 0)
      return total >= (cond.cantMin || 0)
    }
    case 'valoare_cos':
      return totalBrut >= (cond.valoareMin || 0)
    case 'grup_client':
      return firma?.grupClient === cond.grup
    case 'marca_in_cos': {
      return cosRolе.some(l => l.marca === cond.marca && l.cantRole >= (cond.cantMin || 0))
    }
    default:
      return false
  }
}

// ── Verificare set condiții (AND/OR) ──
function evalConditii(conditii, cosRole, totalBrut, firma) {
  if (!conditii?.length) return true
  let result = evalConditie(conditii[0], cosRole, totalBrut, firma)
  for (let i = 1; i < conditii.length; i++) {
    const cond = conditii[i]
    const val = evalConditie(cond, cosRole, totalBrut, firma)
    if (cond.operator === 'OR') result = result || val
    else result = result && val // AND default
  }
  return result
}

// ── Verificare validitate temporală ──
function esteActiva(rule) {
  const azi = TODAY()
  if (!rule.activ) return false
  if (rule.restrictii?.dataStart && rule.restrictii.dataStart > azi) return false
  if (rule.restrictii?.dataEnd && rule.restrictii.dataEnd < azi) return false
  return true
}

/**
 * MOTORUL PRINCIPAL
 * 
 * Input:
 *   liniiCos: [{ productId, cantRole, cantitateAfisata, unitateSel, pretBazaPerRola, produs, firma }]
 *   firma: { id, grupClient, discountGlobal }
 *   db: { promotionRules, clientPricing }
 * 
 * Output:
 *   { liniiCalculate, discountLinii, totalBrut, totalDiscount, totalNet }
 */
export function calculeazaCos(liniiCos, firma, db) {
  if (!liniiCos?.length) return {
    liniiCalculate: [], discountLinii: [], totalBrut: 0, totalDiscount: 0, totalNet: 0
  }

  // Step 1: Calculează prețul tier per linie (baza de calcul)
  const liniiCalculate = liniiCos.map((linie, idx) => {
    const { produs, cantRole, unitateSel } = linie
    const tierPret = getTierPret(produs, cantRole) // per rolă
    const pretAfisatPerUm = pretPerUnitate(tierPret, unitateSel, produs)
    const totalBrutLinie = tierPret * cantRole

    return {
      ...linie,
      idx,
      tierPret,           // per rolă
      pretAfisatPerUm,    // per unitatea selectată de client
      totalBrutLinie,     // total brut fără niciun discount
      pretNetPerRola: tierPret, // va fi actualizat de engine
    }
  })

  // Step 2: Calculează total brut pentru condiții de valoare
  const totalBrut = liniiCalculate.reduce((s, l) => s + l.totalBrutLinie, 0)

  // Step 3: Sortează regulile după prioritate
  const azi = TODAY()
  const rules = (db.promotionRules || [])
    .filter(r => esteActiva(r))
    .sort((a, b) => (a.prioritate || 99) - (b.prioritate || 99))

  // Step 4: Aplică discount clientPricing (discount negociat per produs per client)
  const discountLinii = []

  // Client pricing — discount extra per produs
  if (firma?.id) {
    liniiCalculate.forEach(linie => {
      const cp = (db.clientPricing || []).find(
        c => c.firmId === firma.id && c.productId === linie.productId
      )
      if (cp?.discountExtra > 0) {
        const baza = linie.totalBrutLinie
        const valDisc = -(baza * cp.discountExtra / 100)
        discountLinii.push({
          refLinieIdx: linie.idx,
          productId: linie.productId,
          eticheta: `Discount negociat ${cp.discountExtra}%`,
          procent: cp.discountExtra,
          valoare: Math.round(valDisc * 100) / 100,
          tip: 'CLIENT_PRICING',
          ruleId: null,
        })
      }
    })
  }

  // Step 5: Aplică regulile promoționale în ordinea priorității
  const appliedRules = new Set()

  rules.forEach(rule => {
    // Verifică dacă regula poate fi combinată
    if (!rule.combinabil && appliedRules.size > 0) return

    // Construiește array pentru evaluare condiții
    const cosForEval = liniiCalculate.map(l => ({
      productId: l.productId,
      cantRole: l.cantRole,
      categorie: l.produs?.categorie,
      marca: l.produs?.marca,
    }))

    // Calculează totalul curent (după discounturile anterioare) pentru condiții de valoare
    const totalCurent = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)

    if (!evalConditii(rule.conditii, cosForEval, totalCurent, firma)) return

    const actiune = rule.actiune

    // Determină baza de calcul pentru această regulă
    const getBaza = (linieIdx) => {
      const linie = liniiCalculate[linieIdx]
      if (rule.bazaCalcul === 'pret_baza') {
        return linie.totalBrutLinie
      } else if (rule.bazaCalcul === 'pret_dupa_discount_anterior') {
        const discPrev = discountLinii
          .filter(d => d.refLinieIdx === linieIdx)
          .reduce((s, d) => s + d.valoare, 0)
        return linie.totalBrutLinie + discPrev
      } else if (rule.bazaCalcul === 'total_net') {
        return totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
      }
      return linie.totalBrutLinie
    }

    switch (actiune.tip) {
      case 'discount_procent_linie': {
        const tintaIdx = liniiCalculate.findIndex(l => l.productId === actiune.productIdTinta)
        if (tintaIdx < 0) return
        const baza = getBaza(tintaIdx)
        const valDisc = -(baza * actiune.valoare / 100)
        discountLinii.push({
          refLinieIdx: tintaIdx,
          productId: actiune.productIdTinta,
          eticheta: actiune.eticheta || rule.name,
          procent: actiune.valoare,
          valoare: Math.round(valDisc * 100) / 100,
          tip: rule.tip,
          ruleId: rule.id,
        })
        appliedRules.add(rule.id)
        break
      }

      case 'discount_valoric_linie': {
        const tintaIdx = liniiCalculate.findIndex(l => l.productId === actiune.productIdTinta)
        if (tintaIdx < 0) return
        discountLinii.push({
          refLinieIdx: tintaIdx,
          productId: actiune.productIdTinta,
          eticheta: actiune.eticheta || rule.name,
          procent: null,
          valoare: -Math.abs(actiune.valoare),
          tip: rule.tip,
          ruleId: rule.id,
        })
        appliedRules.add(rule.id)
        break
      }

      case 'discount_procent_total': {
        // Aplică pe total — linie specială fără refLinieIdx
        const baza = rule.bazaCalcul === 'total_net'
          ? totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
          : totalBrut
        const valDisc = -(baza * actiune.valoare / 100)
        discountLinii.push({
          refLinieIdx: -1, // -1 = discount pe total
          productId: null,
          eticheta: actiune.eticheta || rule.name,
          procent: actiune.valoare,
          valoare: Math.round(valDisc * 100) / 100,
          tip: rule.tip,
          ruleId: rule.id,
        })
        appliedRules.add(rule.id)
        break
      }

      case 'discount_valoric_total': {
        discountLinii.push({
          refLinieIdx: -1,
          productId: null,
          eticheta: actiune.eticheta || rule.name,
          procent: null,
          valoare: -Math.abs(actiune.valoare),
          tip: rule.tip,
          ruleId: rule.id,
        })
        appliedRules.add(rule.id)
        break
      }

      case 'produs_gratuit': {
        const tintaIdx = liniiCalculate.findIndex(l => l.productId === actiune.productIdTinta)
        if (tintaIdx < 0) return
        const linie = liniiCalculate[tintaIdx]
        const valGratuit = -(linie.tierPret * actiune.cantitateGratuita)
        discountLinii.push({
          refLinieIdx: tintaIdx,
          productId: actiune.productIdTinta,
          eticheta: `${actiune.eticheta} (${actiune.cantitateGratuita} role gratuite)`,
          procent: null,
          valoare: Math.round(valGratuit * 100) / 100,
          tip: rule.tip,
          ruleId: rule.id,
          isGratuit: true,
          cantitateGratuita: actiune.cantitateGratuita,
        })
        appliedRules.add(rule.id)
        break
      }

      default:
        break
    }
  })

  // Step 6: Discount global firmă — aplicat pe total net
  if (firma?.discountGlobal > 0) {
    const netDupaReguli = totalBrut + discountLinii.reduce((s, d) => s + d.valoare, 0)
    const valDisc = -(netDupaReguli * firma.discountGlobal / 100)
    discountLinii.push({
      refLinieIdx: -1,
      productId: null,
      eticheta: `Discount global firmă ${firma.discountGlobal}%`,
      procent: firma.discountGlobal,
      valoare: Math.round(valDisc * 100) / 100,
      tip: 'GLOBAL_FIRM',
      ruleId: null,
    })
  }

  // Step 7: Calculează totaluri finale
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

// ── Promoții active care pot fi notificate clientului ──
export function getPromotiiNotificabile(liniiCos, firma, db) {
  const azi = TODAY()
  const notif = []

  ;(db.promotionRules || [])
    .filter(r => esteActiva(r))
    .forEach(rule => {
      const cosForEval = liniiCos.map(l => ({
        productId: l.productId,
        cantRole: l.cantRole,
        categorie: l.produs?.categorie,
        marca: l.produs?.marca,
      }))
      const totalBrut = liniiCos.reduce((s, l) => s + l.totalBrutLinie, 0)

      // Verifică dacă regula e aproape activabilă (are produse în coș dar nu cantitate suficientă)
      if (rule.conditii?.length) {
        const primaCond = rule.conditii[0]
        if (primaCond.tip === 'produs_in_cos') {
          const linieExista = liniiCos.find(l => l.productId === primaCond.productId)
          if (linieExista && linieExista.cantRole < (primaCond.cantMin || 0)) {
            const lipsesc = primaCond.cantMin - linieExista.cantRole
            const produs = db.products.find(p => p.id === primaCond.productId)
            notif.push({
              ruleId: rule.id,
              tip: 'aproape_activa',
              mesaj: `Adaugă încă ${lipsesc} role de ${produs?.name} și activezi: "${rule.name}"`,
              actiuneTip: rule.actiune?.tip,
              valoare: rule.actiune?.valoare,
            })
          }
        }

        // Promoții complet neactivate dar relevante pentru produsele din coș
        const cosIds = new Set(liniiCos.map(l => l.productId))
        if (rule.actiune?.productIdTinta && cosIds.has(rule.actiune.productIdTinta)) {
          const condNesatisfacute = rule.conditii.filter(c => {
            if (c.tip === 'produs_in_cos') {
              const l = liniiCos.find(ll => ll.productId === c.productId)
              return !l || l.cantRole < (c.cantMin || 0)
            }
            return false
          })
          if (condNesatisfacute.length > 0) {
            const produs = db.products.find(p => p.id === condNesatisfacute[0].productId)
            notif.push({
              ruleId: rule.id,
              tip: 'promotie_disponibila',
              mesaj: `Promoție disponibilă: "${rule.name}" — adaugă ${produs?.name} în coș`,
              actiuneTip: rule.actiune?.tip,
              valoare: rule.actiune?.valoare,
              productIdSugerat: condNesatisfacute[0].productId,
            })
          }
        }
      }
    })

  return notif
}
