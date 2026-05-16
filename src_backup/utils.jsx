// Format currency
export function lei(val) {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' lei'
}

// Format date
export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Order status badge
export function statusBadge(status) {
  const map = {
    draft:         { label: 'Draft',           cls: 'badge-gray' },
    plasata:       { label: 'Plasată',          cls: 'badge-blue' },
    in_aprobare:   { label: 'În aprobare',      cls: 'badge-orange' },
    aprobata:      { label: 'Aprobată',         cls: 'badge-purple' },
    in_procesare:  { label: 'Pick depozit',     cls: 'badge-blue' },
    aviz_generat:  { label: 'Aviz generat',     cls: 'badge-purple' },
    in_livrare:    { label: 'În livrare',       cls: 'badge-orange' },
    livrata:       { label: 'Livrată',          cls: 'badge-green' },
    anulata:       { label: 'Anulată',          cls: 'badge-red' },
    activ:         { label: 'Activ',            cls: 'badge-green' },
    in_aprobare_cont: { label: 'În aprobare',   cls: 'badge-orange' },
    respinsa:      { label: 'Respinsă',         cls: 'badge-red' },
  }
  const s = map[status] || { label: status, cls: 'badge-gray' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

// Compute line price considering tier + client discount + promo
export function calcLinePrice(product, qty, firmId, db) {
  // Tier pricing
  const tier = product.tierPricing?.find(t => qty >= t.cantMin && qty <= t.cantMax)
  let pret = tier ? tier.pret : product.pretBaza

  // Client-specific extra discount on this product
  const cp = db.clientPricing.find(c => c.firmId === firmId && c.productId === product.id)
  const discClient = cp ? cp.discountExtra : 0

  // Active promotion — per product (global or this firm)
  const today = new Date().toISOString().split('T')[0]
  const promo = db.promotions.find(p =>
    p.activa &&
    p.productId === product.id &&
    (p.firmId === null || p.firmId === firmId) &&
    p.dataStart <= today && p.dataEnd >= today
  )
  const discPromo = promo ? promo.discountPercent : 0

  // Global firm discount
  const firm = db.firms.find(f => f.id === firmId)
  const discGlobal = firm ? (firm.discountGlobal || 0) : 0

  // Best discount wins (nu cumulam)
  const discTotal = Math.max(discClient, discPromo)

  const pretFinal = pret * (1 - discTotal / 100) * (1 - discGlobal / 100)
  const total = Math.round(pretFinal * qty * 100) / 100

  return {
    pretUnitar: Math.round(pretFinal * 100) / 100,
    pretBazaTier: pret,
    discTotal,
    discPromo,
    discClient,
    discGlobal,
    total,
    promoLabel: promo ? promo.name : null
  }
}
