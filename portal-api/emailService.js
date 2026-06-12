const nodemailer = require('nodemailer')

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  })
}

// LOGO_EMAIL_URL în .env — pune URL-ul direct al PNG-ului alb (ex: https://portal.gixen.ro/logo-white.png)
// Dacă nu e setat, afișează text.
const LOGO_URL = process.env.LOGO_EMAIL_URL
  || (process.env.APP_URL || 'https://portal.gixen.ro').replace(/\/$/, '') + '/logo-email-white.svg'

function header() {
  const logoHtml = LOGO_URL
    ? `<img src="${LOGO_URL}" alt="Gixen" width="160" height="48" style="display:block;margin:0 auto;max-width:160px;border:0" />`
    : `<span style="color:#fff;font-size:26px;font-weight:900;letter-spacing:2px">GIXEN</span>`
  return `
  <div style="background:#1a3a6b;padding:28px 32px;text-align:center;border-radius:8px 8px 0 0">
    ${logoHtml}
    <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:6px;letter-spacing:1px">PORTAL</div>
  </div>`
}

function wrap(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="padding:0">${header()}</td></tr>
  <tr><td style="background:#fff;padding:32px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a2e">${title}</h2>
    ${body}
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#999">Gixen SRL · Portal B2B · <a href="https://gixen.ro" style="color:#1a6bbf;text-decoration:none">gixen.ro</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

async function send(to, subject, html) {
  const t = getTransport()
  if (!t) return
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html })
}

// ── Exports ──────────────────────────────────────────────────────────────────

async function sendOnboardingPending(email, firmName) {
  const html = wrap('Cerere înregistrată', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Cererea de înregistrare pentru firma <strong>${firmName}</strong> a fost primită și este în curs de analiză.</p>
    <p style="color:#444;line-height:1.7">Veți fi notificat pe email imediat ce contul este aprobat.</p>
    <p style="color:#999;font-size:12px;margin-top:24px">Dacă nu ați inițiat această cerere, ignorați acest email.</p>`)
  await send(email, 'Cerere înregistrare Gixen Portal — în așteptare', html).catch(() => {})
}

async function sendOnboardingApproved(email, firmName) {
  const portalUrl = process.env.APP_URL || 'https://portal.gixen.ro'
  const html = wrap('Cont aprobat!', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Contul firmei <strong>${firmName}</strong> a fost aprobat. Vă puteți autentifica acum în portal.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${portalUrl}/login" style="display:inline-block;background:#1a6bbf;color:#fff;text-decoration:none;padding:12px 28px;border-radius:7px;font-weight:700;font-size:14px">Accesați portalul</a>
    </div>
    <p style="color:#999;font-size:12px">Dacă butonul nu funcționează: <a href="${portalUrl}/login" style="color:#1a6bbf">${portalUrl}/login</a></p>`)
  await send(email, 'Cont aprobat — Gixen Portal B2B', html).catch(() => {})
}

async function sendOnboardingRejected(email, firmName, reason) {
  const html = wrap('Cerere respinsă', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Ne pare rău că firma <strong>${firmName}</strong> nu îndeplinește criteriile necesare pentru activarea contului în portalul nostru B2B.</p>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:7px;padding:14px;margin:16px 0;color:#dc2626;font-size:13px"><strong>Motiv:</strong> ${reason}</div>` : ''}
    <p style="color:#444;line-height:1.7">Pentru mai multe informații, vă rugăm să contactați echipa noastră de vânzări.</p>`)
  await send(email, 'Cerere respinsă — Gixen Portal B2B', html).catch(() => {})
}

async function sendOrderPlaced(email, order) {
  const html = wrap(`Comandă confirmată — #${order.nr || order.id}`, `
    <p style="color:#444;line-height:1.7">Comanda dumneavoastră a fost plasată cu succes.</p>
    <table width="100%" style="border-collapse:collapse;margin:16px 0;font-size:13px">
      <tr style="background:#f8fafc"><td style="padding:8px 12px;font-weight:600;color:#555;width:40%">Număr comandă</td><td style="padding:8px 12px">#${order.nr || order.id}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600;color:#555">Total (cu TVA)</td><td style="padding:8px 12px;font-weight:700;color:#1a6bbf">${order.totalDisplay || ''}</td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px 12px;font-weight:600;color:#555">Status</td><td style="padding:8px 12px"><span style="background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:20px;font-size:12px">În procesare</span></td></tr>
    </table>
    <p style="color:#444;line-height:1.7">Veți fi notificat când statusul comenzii se actualizează.</p>`)
  await send(email, `Comandă confirmată #${order.nr || order.id} — Gixen`, html).catch(() => {})
}

async function sendOrderStatusChanged(email, order, newStatus) {
  const statusLabels = {
    'in_procesare': 'În procesare', 'confirmata': 'Confirmată', 'in_livrare': 'În livrare',
    'livrata': 'Livrată', 'anulata': 'Anulată',
  }
  const statusColors = {
    'confirmata': '#16a34a', 'livrata': '#16a34a',
    'in_livrare': '#d97706', 'anulata': '#dc2626', 'in_procesare': '#1e40af',
  }
  const label = statusLabels[newStatus] || newStatus
  const color = statusColors[newStatus] || '#555'
  const html = wrap(`Status comandă actualizat — #${order.nr || order.id}`, `
    <p style="color:#444;line-height:1.7">Statusul comenzii <strong>#${order.nr || order.id}</strong> a fost actualizat.</p>
    <div style="text-align:center;margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px">
      <span style="font-size:18px;font-weight:700;color:${color}">${label}</span>
    </div>
    ${newStatus === 'anulata' ? '<p style="color:#dc2626;font-size:13px">Comanda a fost anulată. Contactați echipa noastră pentru detalii suplimentare.</p>' : ''}`)
  await send(email, `Status comandă #${order.nr || order.id}: ${label} — Gixen`, html).catch(() => {})
}

async function sendCreditLimitWarning(email, firmName, pct, available) {
  const html = wrap('Avertisment limită credit', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Limita de credit pentru firma <strong>${firmName}</strong> a atins <strong style="color:#d97706">${pct}%</strong> din limita alocată.</p>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:7px;padding:14px;margin:16px 0;color:#92400e;font-size:13px">
      Credit disponibil rămas: <strong>${available}</strong>
    </div>
    <p style="color:#444;line-height:1.7">Vă rugăm să contactați managerul de cont pentru ajustarea limitei de credit.</p>`)
  await send(email, 'Avertisment limită credit — Gixen Portal', html).catch(() => {})
}

async function sendPasswordReset(email, resetLink) {
  const html = wrap('Resetare parolă', `
    <p style="color:#444;line-height:1.7">Ați solicitat resetarea parolei pentru contul Gixen Portal.</p>
    <p style="color:#444;line-height:1.7">Apăsați butonul de mai jos pentru a seta o parolă nouă. Link-ul este valabil <strong>2 ore</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetLink}" style="display:inline-block;background:#1a6bbf;color:#fff;text-decoration:none;padding:12px 28px;border-radius:7px;font-weight:700;font-size:14px">Resetează parola</a>
    </div>
    <p style="color:#999;font-size:12px">Dacă nu ați solicitat resetarea, ignorați acest email. Parola rămâne neschimbată.</p>
    <p style="color:#999;font-size:12px;word-break:break-all">Link: <a href="${resetLink}" style="color:#1a6bbf">${resetLink}</a></p>`)
  await send(email, 'Resetare parolă — Gixen Portal B2B', html).catch(() => {})
}

module.exports = {
  sendOnboardingPending,
  sendOnboardingApproved,
  sendOnboardingRejected,
  sendOrderPlaced,
  sendOrderStatusChanged,
  sendCreditLimitWarning,
  sendPasswordReset,
}
