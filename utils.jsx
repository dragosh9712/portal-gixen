export function lei(val) {
  if (val == null || isNaN(val)) return '0,00 RON'
  return Number(val).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
}

// ── TVA — sursă unică de adevăr ──
export const TVA = 0.21
export function cuTva(net) {
  return Math.round((Number(net) || 0) * (1 + TVA) * 100) / 100
}
export function tvaVal(net) {
  return Math.round((Number(net) || 0) * TVA * 100) / 100
}
export function leiCuTva(net) {
  return lei(cuTva(net))
}

export function eur(val) {
  if (val == null || isNaN(val)) return '€0.00'
  return '€' + Number(val).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP = {
  in_aprobare:  { label: 'În aprobare',  cls: 'badge-yellow' },
  aprobat:      { label: 'Aprobat',      cls: 'badge-blue' },
  in_procesare: { label: 'În procesare', cls: 'badge-blue' },
  livrat:       { label: 'Livrat',       cls: 'badge-green' },
  anulat:       { label: 'Anulat',       cls: 'badge-red' },
  activ:        { label: 'Activ',        cls: 'badge-green' },
  inactiv:      { label: 'Inactiv',      cls: 'badge-gray' },
  respinsa:     { label: 'Respinsă',     cls: 'badge-red' },
  draft:        { label: 'Draft',        cls: 'badge-gray' },
  trimisa:      { label: 'Trimisă',      cls: 'badge-blue' },
  acceptata:    { label: 'Acceptată',    cls: 'badge-green' },
  expirata:     { label: 'Expirată',     cls: 'badge-red' },
}

export function statusBadge(status) {
  const s = STATUS_MAP[status] || { label: status || '-', cls: 'badge-gray' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function calcLinePrice(product, qty, firm, exchange) {
  if (!product) return 0
  const currency = firm?.currency || 'RON'
  const tier = firm?.tier || 'standard'
  const rate = exchange?.rate || 5
  const tierDiscounts = { platinum: 0.15, gold: 0.10, silver: 0.05, standard: 0 }
  const discount = tierDiscounts[tier] || 0
  let price = (product.pret_ron || 0) * (1 - discount)
  if (currency === 'EUR') price = price / rate
  return Math.round(price * qty * 100) / 100
}
