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

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 83.56 49.28" style="height:38px;width:auto;display:block;margin:0 auto"><path fill="white" d="M59.89,34.59h.07c.24-.34.54-.68.91-1.01.37-.33.78-.62,1.25-.87.47-.25.99-.46,1.55-.61.57-.16,1.17-.23,1.8-.23s1.19.07,1.76.2c.56.14,1.08.35,1.55.64.47.29.88.67,1.24,1.13.36.47.64,1.02.85,1.65.12.36.19.74.23,1.16.04.41.06.9.06,1.45v10.76h-4.06v-10.14c0-.44-.02-.82-.05-1.14-.04-.32-.09-.6-.19-.84-.2-.53-.51-.9-.93-1.13-.42-.23-.92-.34-1.51-.34-.79,0-1.54.19-2.27.56-.72.37-1.36.91-1.92,1.62v11.42h-4.06v-16.57h3.36l.37,2.3ZM48.21,35.02c-.51,0-.97.09-1.37.28-.4.19-.74.44-1.03.77-.29.33-.52.71-.69,1.14-.18.43-.29.89-.34,1.38h6.52c0-.49-.06-.95-.2-1.38-.13-.43-.32-.81-.58-1.14-.26-.33-.58-.58-.96-.77-.39-.19-.83-.28-1.34-.28ZM49.84,46.02c.79,0,1.61-.08,2.46-.23.86-.16,1.72-.39,2.6-.68v3.22c-.52.23-1.33.44-2.41.65-1.08.2-2.21.3-3.37.3s-2.29-.15-3.35-.46c-1.05-.3-1.97-.79-2.77-1.46-.79-.67-1.41-1.55-1.88-2.62-.46-1.07-.7-2.37-.7-3.9s.22-2.82.65-3.95c.43-1.13,1.02-2.06,1.75-2.8.73-.74,1.56-1.3,2.51-1.67.94-.37,1.92-.55,2.92-.55s2.02.16,2.91.48c.88.32,1.65.82,2.3,1.5.65.68,1.15,1.56,1.51,2.63.36,1.08.54,2.35.54,3.82-.01.57-.03,1.05-.05,1.45h-10.87c.06.77.23,1.42.51,1.97.29.54.65.99,1.12,1.33.46.34,1,.59,1.61.74.62.16,1.28.23,2,.23ZM33.49,43.1l-4.28,5.76h-4.65l6.55-8.45-6.15-8.12h4.77l3.87,5.47,3.94-5.47h4.79l-6.33,8.11,6.51,8.47h-4.74l-4.26-5.76ZM21.07,32.29h4.06v16.57h-4.06v-16.57ZM72.28,45.23c.2-3.55.23-6.62.92-10.03,2.64-13.1,10.35-13.09,10.36-22.3,0-7.81-7.18-14.47-15.62-12.57-3.99.9-6.64,3.29-8.29,6.04-.89,1.49-1.58,3.42-1.73,5.47-.12,1.68.2,4.97,1.03,6.06l.88-1.5,1.95.69-.24,1.46c0,.7-.07.19.12.42.39.36.98-.52,1.84-.7.22.48.9,1.09,1.19,1.53-.28.76-1.89,1.65-.52,1.82h1.4s.31,2.09.31,2.09l-1.15.44c.14.17.04.08.28.22,2.55,1.47,6.15,1.73,8.96.78.58-.2.61-.6.92-1.11,1.03-1.7,3.45-3.79,5.3-4.77-.26.31-.82.77-1.14,1.07-5.66,5.2-7.21,13.49-7,21,.03,1.18.27,2.9.24,3.89ZM69.79,8.21c3.03-.76,5.46,1.48,5.97,3.81.66,2.99-1.42,5.48-3.85,5.99-4.61.96-7.73-4.17-5.15-7.81.72-1.02,1.59-1.63,3.02-1.99ZM15.24,40.1h-5.13v-3.5h9.34v11.55c-.34.13-.78.26-1.31.4-.53.13-1.12.26-1.78.37-.65.11-1.33.2-2.03.26-.7.07-1.38.11-2.07.11-2.06,0-3.85-.27-5.38-.83-1.54-.55-2.81-1.33-3.83-2.34-1.02-1-1.79-2.2-2.3-3.59-.51-1.39-.76-2.92-.76-4.6,0-1.19.13-2.32.4-3.4.27-1.08.67-2.08,1.19-3,.52-.92,1.16-1.75,1.9-2.49.74-.74,1.59-1.38,2.55-1.9.95-.52,1.99-.92,3.13-1.2,1.13-.28,2.35-.42,3.65-.42,1.15,0,2.25.08,3.29.25,1.03.16,1.89.37,2.55.6v3.53c-.89-.27-1.79-.48-2.69-.62-.91-.15-1.82-.22-2.74-.22-1.24,0-2.41.19-3.49.55-1.09.37-2.02.92-2.81,1.65-.79.72-1.42,1.62-1.87,2.68-.46,1.06-.68,2.29-.68,3.68.01,2.7.72,4.74,2.11,6.09,1.4,1.35,3.38,2.03,5.95,2.03.48,0,.98-.02,1.48-.08.51-.05.96-.12,1.35-.2v-5.37Z"/></svg>`

function header() {
  return `
  <div style="background:#1a3a6b;padding:28px 32px;text-align:center;border-radius:8px 8px 0 0">
    ${LOGO_SVG}
    <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:6px;letter-spacing:1px">PORTAL B2B</div>
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
