/**
 * Portal Gixen — Email Service
 * Nodemailer cu SMTP propriu. Configurare prin variabile de mediu.
 */
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',   // true = port 465, false = STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },           // util pe servere cu cert self-signed
})

const FROM     = process.env.SMTP_FROM  || 'portal@gixen.ro'
const BASE_URL = process.env.APP_URL    || 'http://localhost'

// ── Template de bază ──────────────────────────────────────────────────────────
function baseTemplate(title, body) {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a6bbf;padding:28px 40px;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">GIXEN</span>
            <span style="color:#a8ccf0;font-size:13px;margin-left:12px;">Portal B2B</span>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:36px 40px 28px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:18px 40px;border-top:1px solid #e8edf3;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              Acest email a fost generat automat de <strong>Portal Gixen</strong>.<br/>
              Dacă nu ai solicitat acest email, poți ignora acest mesaj.<br/>
              <a href="${BASE_URL}" style="color:#1a6bbf;text-decoration:none;">${BASE_URL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function h1(text) {
  return `<h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:700;">${text}</h1>`
}
function p(text) {
  return `<p style="margin:0 0 14px;font-size:14px;color:#444;line-height:1.65;">${text}</p>`
}
function badge(text, color = '#1a6bbf') {
  return `<span style="display:inline-block;background:${color};color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;">${text}</span>`
}
function btn(text, href) {
  return `<div style="margin:24px 0 8px;">
    <a href="${href}" style="display:inline-block;background:#1a6bbf;color:#ffffff;padding:13px 28px;border-radius:7px;font-size:14px;font-weight:600;text-decoration:none;">${text}</a>
  </div>`
}
function infoBox(rows, title = '') {
  const rowsHtml = rows.map(([label, value]) =>
    `<tr>
      <td style="padding:7px 14px;font-size:13px;color:#666;white-space:nowrap;width:160px;">${label}</td>
      <td style="padding:7px 14px;font-size:13px;color:#1a1a2e;font-weight:600;">${value}</td>
    </tr>`
  ).join('')
  return `${title ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:1px;margin:20px 0 6px;">${title}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;border-radius:8px;margin-bottom:20px;">${rowsHtml}</table>`
}
function linesTable(lines) {
  const rows = lines.map(l =>
    `<tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:8px 12px;font-size:13px;color:#333;">${l.productName || l.product_name || l.productId || ''}</td>
      <td style="padding:8px 12px;font-size:13px;color:#666;text-align:center;">${l.uomCode || l.uom_code || ''}</td>
      <td style="padding:8px 12px;font-size:13px;color:#666;text-align:center;">${l.cantitate || l.quantity || 0}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1a1a2e;text-align:right;font-weight:600;">${ron(l.total || l.line_total || 0)} RON</td>
    </tr>`
  ).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
    <thead>
      <tr style="background:#f4f7fb;">
        <th style="padding:8px 12px;font-size:11px;text-align:left;color:#888;font-weight:700;">PRODUS</th>
        <th style="padding:8px 12px;font-size:11px;text-align:center;color:#888;font-weight:700;">UOM</th>
        <th style="padding:8px 12px;font-size:11px;text-align:center;color:#888;font-weight:700;">CANT.</th>
        <th style="padding:8px 12px;font-size:11px;text-align:right;color:#888;font-weight:700;">TOTAL</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}
function totalRow(net, tva, gross) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr><td style="padding:4px 12px;font-size:13px;color:#666;">Net fără TVA</td><td style="padding:4px 12px;font-size:13px;text-align:right;">${ron(net)} RON</td></tr>
    <tr><td style="padding:4px 12px;font-size:13px;color:#666;">TVA 21%</td><td style="padding:4px 12px;font-size:13px;text-align:right;">${ron(tva)} RON</td></tr>
    <tr style="border-top:2px solid #e0e8f4;">
      <td style="padding:8px 12px;font-size:15px;font-weight:700;color:#1a1a2e;">TOTAL CU TVA</td>
      <td style="padding:8px 12px;font-size:15px;font-weight:700;color:#1a6bbf;text-align:right;">${ron(gross)} RON</td>
    </tr>
  </table>`
}
function ron(val) {
  return Number(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Trimitere cu fallback ─────────────────────────────────────────────────────
async function send(to, subject, html) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[EMAIL SKIP] SMTP neconfigurat. To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    console.log(`[EMAIL OK] To: ${to} | ${subject}`)
  } catch (err) {
    console.error(`[EMAIL ERR] To: ${to} | ${subject} |`, err.message)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL-URI
// ═════════════════════════════════════════════════════════════════════════════

// 1. Onboarding — cont în așteptare (trimis clientului imediat după înregistrare)
async function sendOnboardingPending({ email, name, firmName }) {
  const html = baseTemplate('Cerere înregistrare primită', `
    ${h1('Bun venit la Gixen Portal!')}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p(`Am primit cererea de înregistrare pentru firma <strong>${firmName}</strong> și o vom analiza în cel mai scurt timp.`)}
    ${infoBox([
      ['Firmă', firmName],
      ['Email', email],
      ['Status', 'În curs de aprobare'],
    ], 'Detalii cont')}
    ${p('Veți primi un email de confirmare când contul dumneavoastră este aprobat și puteți începe plasarea comenzilor.')}
    ${p('Dacă aveți întrebări, ne puteți contacta răspunzând la acest email.')}
  `)
  await send(email, 'Cerere de înregistrare primită — Gixen Portal', html)
}

// 2. Onboarding — cont aprobat
async function sendOnboardingApproved({ email, name, firmName }) {
  const html = baseTemplate('Cont aprobat!', `
    ${h1('Contul dumneavoastră a fost aprobat!')}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p(`Suntem bucuroși să vă informăm că firma <strong>${firmName}</strong> a fost aprobată în sistemul nostru.`)}
    ${p('Puteți să vă autentificați și să începeți plasarea comenzilor:')}
    ${btn('Accesați portalul', `${BASE_URL}/login`)}
    ${p('Dacă aveți întrebări sau aveți nevoie de asistență, echipa noastră vă stă la dispoziție.')}
  `)
  await send(email, 'Cont aprobat — puteți plasa comenzi pe Gixen Portal', html)
}

// 3. Onboarding — cont respins (cu motiv)
async function sendOnboardingRejected({ email, name, firmName, motiv }) {
  const html = baseTemplate('Cerere respinsă', `
    ${h1('Cerere de înregistrare')}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p(`Îngrijorați că firma <strong>${firmName}</strong> nu îndeplinește criteriile necesare pentru înregistrarea în portalul nostru.`)}
    ${motiv ? infoBox([['Motiv', motiv]], 'Motivul respingerii') : ''}
    ${p('Dacă considerați că este o eroare sau doriți să clarificați situația, vă rugăm să ne contactați răspunzând la acest email.')}
  `)
  await send(email, 'Cerere înregistrare — răspuns Gixen Portal', html)
}

// 4. Comandă plasată (trimis clientului)
async function sendOrderPlaced({ email, name, firmName, order }) {
  const net   = order.netTotal  || order.net_total   || 0
  const tva   = order.tvaTotal  || order.tva_total   || 0
  const gross = order.grossTotal || order.gross_total || 0
  const lines = order.lines || []

  const html = baseTemplate(`Comandă ${order.nr} confirmată`, `
    ${h1(`Comandă ${order.nr} plasată cu succes`)}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p(`Comanda dumneavoastră pentru <strong>${firmName}</strong> a fost înregistrată și urmează să fie procesată.`)}
    ${infoBox([
      ['Nr. comandă',  order.nr],
      ['Data',         new Date().toLocaleDateString('ro-RO')],
      ['Plată',        order.paymentType || order.payment_type || 'OP'],
      ['Transport',    order.transportType || order.transport_type || ''],
      ['Status',       'Plasată'],
    ], 'Detalii comandă')}
    ${lines.length ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:1px;margin:20px 0 6px;">Produse comandate</div>${linesTable(lines)}` : ''}
    ${totalRow(net, tva, gross)}
    ${btn('Vezi comanda', `${BASE_URL}/comenzile-mele`)}
  `)
  await send(email, `Comandă ${order.nr} plasată — Gixen Portal`, html)
}

// 5. Schimbare status comandă (trimis clientului)
const STATUS_LABELS = {
  in_aprobare:  'În aprobare',
  aprobata:     'Aprobată',
  in_procesare: 'În procesare',
  livrata:      'Livrată',
  anulata:      'Anulată',
  plasata:      'Plasată',
}
const STATUS_COLORS = {
  in_aprobare:  '#f59e0b',
  aprobata:     '#2563eb',
  in_procesare: '#7c3aed',
  livrata:      '#16a34a',
  anulata:      '#dc2626',
  plasata:      '#64748b',
}
async function sendOrderStatusChanged({ email, name, firmName, order, newStatus }) {
  const label = STATUS_LABELS[newStatus] || newStatus
  const color = STATUS_COLORS[newStatus] || '#1a6bbf'
  const gross = order.grossTotal || order.gross_total || 0

  const extraInfo = []
  if (newStatus === 'livrata' && order.nrAviz)    extraInfo.push(['Nr. aviz',    order.nrAviz])
  if (order.nrFactura)                             extraInfo.push(['Nr. factură', order.nrFactura])
  if (order.dataLivrare || order.delivery_date)    extraInfo.push(['Data livrare', new Date(order.dataLivrare || order.delivery_date).toLocaleDateString('ro-RO')])

  const html = baseTemplate(`Comandă ${order.nr} — ${label}`, `
    ${h1(`Comandă ${order.nr}`)}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p(`Statusul comenzii dumneavoastră a fost actualizat:`)}
    <div style="margin:20px 0;">${badge(label, color)}</div>
    ${infoBox([
      ['Nr. comandă', order.nr],
      ['Firmă',       firmName],
      ['Total cu TVA', `${ron(gross)} RON`],
      ...extraInfo,
    ])}
    ${newStatus === 'livrata'
      ? p('Comanda a fost livrată. Vă mulțumim că ați ales Gixen!')
      : newStatus === 'anulata'
        ? p('Comanda a fost anulată. Pentru clarificări, vă rugăm să ne contactați.')
        : p('Urmăriți evoluția comenzii în portal.')
    }
    ${btn('Vezi comanda', `${BASE_URL}/comenzile-mele`)}
  `)
  await send(email, `Comandă ${order.nr} — ${label}`, html)
}

// 6. Alertă limită credit
async function sendCreditLimitWarning({ email, name, firmName, limit, used, remaining, percent }) {
  const isExceeded = remaining < 0
  const color = isExceeded ? '#dc2626' : '#f59e0b'
  const title = isExceeded ? '⚠️ Limită credit depășită' : '⚠️ Limită credit apropiată'

  const html = baseTemplate(title, `
    ${h1(isExceeded ? 'Limita de credit a fost depășită' : 'Limita de credit se apropie')}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p(isExceeded
      ? `Firma <strong>${firmName}</strong> a depășit limita de credit alocată. Comenzile noi vor necesita aprobare specială.`
      : `Firma <strong>${firmName}</strong> a utilizat <strong>${percent}%</strong> din limita de credit alocată.`
    )}
    ${infoBox([
      ['Limită totală',  `${ron(limit)} RON`],
      ['Credit utilizat', `${ron(used)} RON`],
      ['Disponibil',      `${ron(Math.max(remaining, 0))} RON`],
      ['Utilizat',        `${percent}%`],
    ], 'Situație credit')}
    ${p('Pentru mărirea limitei de credit sau clarificări, contactați echipa comercială Gixen.')}
  `)
  await send(email, title + ' — Gixen Portal', html)
}

// 7. Resetare parolă (link cu token)
async function sendPasswordReset({ email, name, token }) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`
  const html = baseTemplate('Resetare parolă', `
    ${h1('Resetare parolă')}
    ${p(`Bună ziua, <strong>${name || email}</strong>,`)}
    ${p('Am primit o solicitare de resetare a parolei pentru contul dumneavoastră.')}
    ${p('Apăsați butonul de mai jos pentru a seta o parolă nouă. Link-ul este valabil <strong>2 ore</strong>.')}
    ${btn('Resetează parola', resetUrl)}
    ${p('Dacă nu ați solicitat resetarea parolei, ignorați acest email — parola rămâne nemodificată.')}
    <p style="font-size:12px;color:#999;margin-top:20px;">Sau copiați link-ul: <a href="${resetUrl}" style="color:#1a6bbf;">${resetUrl}</a></p>
  `)
  await send(email, 'Resetare parolă — Gixen Portal', html)
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
