const router = require('express').Router()
const { query, sql } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const emailSvc = require('../emailService')

const TVA = 0.21

// Coloane pentru fluxul de proformă / plată (o singură dată per proces)
let payColsEnsured = false
async function ensurePaymentColumns() {
  if (payColsEnsured) return
  try {
    await query(`IF COL_LENGTH('orders','proforma_nr_intern') IS NULL ALTER TABLE orders ADD proforma_nr_intern VARCHAR(64) NULL`)
    await query(`IF COL_LENGTH('orders','payment_status') IS NULL ALTER TABLE orders ADD payment_status VARCHAR(32) NULL`)
    await query(`IF COL_LENGTH('orders','payment_confirmed_at') IS NULL ALTER TABLE orders ADD payment_confirmed_at DATETIME2 NULL`)
    await query(`IF COL_LENGTH('orders','ss_nr_intern') IS NULL ALTER TABLE orders ADD ss_nr_intern VARCHAR(64) NULL`)
    payColsEnsured = true
  } catch (e) { console.error('ensurePaymentColumns:', e.message) }
}

// ── Push comandă/proformă în Selectsoft ──────────────────────────────────────
// Liniile sunt trimise cu prețurile NETE finale (după discounturi pe linie +
// discount global distribuit proporțional), cu TVA inclus per cerința SS.
async function buildSsPayload(orderId, { proforma = false } = {}) {
  const ordRes = await query('SELECT * FROM orders WHERE id = @id', { id: orderId })
  const o = ordRes.recordset[0]
  if (!o) throw new Error('Comandă inexistentă')
  const custRes = await query('SELECT * FROM customers WHERE id = @id', { id: o.customer_id })
  const cust = custRes.recordset[0]
  if (!cust) throw new Error('Client inexistent')

  const linesRes = await query(`
    SELECT ol.*, p.name AS product_name, p.selectsoft_cod, p.code
    FROM order_lines ol JOIN products p ON ol.product_id = p.id
    WHERE ol.order_id = @id ORDER BY ol.line_number`, { id: orderId })
  const lines = linesRes.recordset

  // Discount global distribuit proporțional pe linii
  const netBrut = lines.reduce((s, l) => s + (parseFloat(l.line_total) || 0), 0)
  const totalDiscount = parseFloat(o.total_discount) || 0
  const discountFactor = netBrut > 0 ? Math.max(0, (netBrut - totalDiscount) / netBrut) : 1

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const ssLines = lines.map(l => {
    // Preț per unitatea de bază (rolă) — SS lucrează pe unitatea produsului
    const qtyRolls = parseFloat(l.quantity_in_rolls) || parseFloat(l.quantity) || 0
    const lineNet = (parseFloat(l.line_total) || 0) * discountFactor
    const prixUnitNet = qtyRolls > 0 ? lineNet / qtyRolls : 0
    return {
      cod_intern: l.selectsoft_cod || l.code || l.product_id,
      denumire: l.product_name || l.product_id,
      cantitate: String(qtyRolls),
      pret_vanzare: String(Math.round(prixUnitNet * (1 + TVA) * 100) / 100),
      k_tva: '21',
    }
  })

  const netFinal = Math.round(netBrut * discountFactor * 100) / 100
  const tvaFinal = Math.round(netFinal * TVA * 100) / 100

  return {
    comanda: {
      nr_comanda: o.order_number,
      data_comanda: today,
      tip_plata: o.payment_type === 'OP' ? 'OP' : 'CRD',
      sursa: 'PORTAL_GIXEN',
      valoare_comanda: Math.round((netFinal + tvaFinal) * 100) / 100,
      val_tva: tvaFinal,
      observatii: proforma
        ? `PROFORMA portal B2B #${o.order_number} — comandă blocată de limita de credit, în așteptarea plății`
        : `Comandă portal B2B #${o.order_number}`,
      preturiCuTva: true,
      produse: ssLines,
    },
    client: {
      date_firma: {
        denumire: cust.name,
        cod_fiscal: cust.tax_id || '',
        nr_reg_com: cust.trade_register_no || '',
        platitor_tva: cust.platitor_tva ? 'true' : 'false',
        tara: 'RO',
        judet: cust.county || '',
        localitate: cust.locality || '',
        adresa: cust.address || '',
        email: cust.email || '',
        telefon: cust.phone || '',
      },
      date_contact: { nume: cust.name, email: cust.email || '', telefon: cust.phone || '' },
      // Obligatorie pentru persoană juridică (doc API v1.7)
      adresa_livrare: {
        nume_persoana: cust.contact_name || cust.name,
        tara: 'RO',
        judet: cust.county || '',
        localitate: cust.locality || '',
        adresa: o.delivery_address || cust.address || '',
        telefon: cust.phone || '',
      },
    },
  }
}

async function pushOrderToSelectsoft(orderId, { proforma = false } = {}) {
  const ss = require('../selectsoftService')
  if (!ss.isConfigured()) return null
  const payload = await buildSsPayload(orderId, { proforma })
  const result = await ss.insertComanda(payload)
  const nrIntern = result?.nr_intern || result?.result?.nr_intern || null
  if (nrIntern) {
    await ensurePaymentColumns()
    const col = proforma ? 'proforma_nr_intern' : 'ss_nr_intern'
    await query(`UPDATE orders SET ${col} = @nr WHERE id = @id`, { id: orderId, nr: String(nrIntern) })
  }
  return nrIntern
}

// ── Verificare plată proformă în Selectsoft ──────────────────────────────────
// /restdoc returnează documente cu suma_cu_tva și suma_incasari.
// Plătit = documentul nu mai apare în listă SAU suma_incasari >= suma_cu_tva.
async function checkProformaPayment(orderId) {
  const ss = require('../selectsoftService')
  if (!ss.isConfigured()) return { checked: false, reason: 'Selectsoft neconfigurat' }
  await ensurePaymentColumns()

  const ordRes = await query('SELECT * FROM orders WHERE id = @id', { id: orderId })
  const o = ordRes.recordset[0]
  if (!o) return { checked: false, reason: 'Comandă inexistentă' }
  if (!o.proforma_nr_intern) return { checked: false, reason: 'Comanda nu are proformă generată' }
  if (o.payment_status === 'platit') return { checked: true, paid: true }

  const rest = await ss.getRestante({ lst_nr_intern: String(o.proforma_nr_intern) })
  const restDocs = rest?.documente || []
  const doc = Array.isArray(restDocs)
    ? restDocs.find(d => String(d.nr_intern) === String(o.proforma_nr_intern))
    : null
  const paid = doc == null || parseFloat(doc.suma_incasari || 0) >= parseFloat(doc.suma_cu_tva || 0)

  if (paid) {
    await query(`
      UPDATE orders SET payment_status='platit', payment_confirmed_at=SYSDATETIME(),
        status = CASE WHEN status='asteptare_plata' THEN 'in_aprobare' ELSE status END
      WHERE id = @id`, { id: orderId })
    // Notifică clientul + trimite comanda reală în SS acum că e plătită
    pushOrderToSelectsoft(orderId).catch(e => console.error('[SS push after payment]', e.message))
    const userRes = await query(
      `SELECT u.email FROM users u WHERE u.customer_id=@cid AND u.delegate_type='primary' AND u.status != 'inactive'`,
      { cid: o.customer_id })
    if (userRes.recordset[0]?.email) {
      emailSvc.sendOrderStatusChanged(userRes.recordset[0].email,
        { nr: o.order_number, id: orderId }, 'in_aprobare').catch(() => {})
    }
    return { checked: true, paid: true, justConfirmed: true }
  }
  const restant = Math.max(0, parseFloat(doc.suma_cu_tva || 0) - parseFloat(doc.suma_incasari || 0))
  return { checked: true, paid: false, suma_cu_tva: doc.suma_cu_tva, suma_incasari: doc.suma_incasari, restant }
}

// Monitor periodic — verifică toate comenzile în așteptarea plății
async function monitorPendingPayments() {
  try {
    await ensurePaymentColumns()
    const res = await query(`
      SELECT id FROM orders
      WHERE payment_status = 'asteptare_plata' AND proforma_nr_intern IS NOT NULL`)
    for (const row of res.recordset) {
      try {
        const r = await checkProformaPayment(row.id)
        if (r.justConfirmed) console.log(`[payments] Comanda ${row.id}: plată confirmată în SS`)
      } catch (e) { console.error(`[payments] check ${row.id}:`, e.message) }
    }
  } catch (e) { console.error('[payments] monitor:', e.message) }
}

function normalizeOrder(o) {
  const lines = o.lines_json ? JSON.parse(o.lines_json) : []
  const noteInterne = o.internal_notes_json ? JSON.parse(o.internal_notes_json) : []
  const discountLinii = o.discount_lines_json ? JSON.parse(o.discount_lines_json) : []
  return {
    id:             o.id,
    nr:             o.order_number,
    firmId:         o.customer_id,
    firmName:       o.firm_name,
    userId:         o.user_id,
    agentId:        o.agent_id,
    agentName:      o.agent_name,
    locationId:     o.location_id,
    locationName:   o.location_name,
    status:         o.status,
    dataComanda:    o.order_date || o.created_at,
    dataLivrare:    o.delivery_date || null,
    deliveryDateConfirmed: o.delivery_date_confirmed || null,
    nrFactura:      o.invoice_number || null,
    nrAviz:         o.delivery_note_number || null,
    observatii:     o.observations || '',
    adresaLivrare:  o.delivery_address || '',
    currency:       o.currency || 'RON',
    exchangeRate:   o.applied_exchange_rate || null,
    total:          o.gross_total || 0,
    netTotal:       o.net_total || 0,
    tvaTotal:       o.tva_total || 0,
    paymentType:    o.payment_type || 'OP',
    transportType:  o.transport_type || 'Van',
    paymentStatus:  o.payment_status || null,
    proformaNr:     o.proforma_nr_intern || null,
    ssNrIntern:     o.ss_nr_intern || null,
    paymentConfirmedAt: o.payment_confirmed_at || null,
    lines:          lines.map(l => ({
      ...l,
      productId:    l.product_id,
      productName:  l.product_name,
      productCode:  l.product_code,
      uomCode:      l.uom_code,
      cantitate:    l.quantity,
      pretUnitar:   l.unit_price,
      total:        l.line_total,
    })),
    noteInterne,
    discountLinii,
    activityLog:    [],
    transport:      {},
    documente:      { nrFactura: o.invoice_number || null, nrAviz: o.delivery_note_number || null },
    created_at:     o.created_at,
  }
}

// GET /api/orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensurePaymentColumns()
    const isAdmin = req.user.role === 'admin'
    let where = isAdmin ? 'WHERE 1=1' : 'WHERE o.customer_id = @cid'
    const params = isAdmin ? {} : { cid: req.user.customerId }

    const result = await query(`
      SELECT o.*,
        c.name AS firm_name,
        a.name AS agent_name,
        l.name AS location_name,
        (SELECT ol.id, ol.product_id, ol.uom_code, ol.quantity, ol.quantity_in_rolls,
                ol.unit_price, ol.unit_price_with_tva, ol.line_total, ol.line_tva,
                ol.line_total_with_tva, p.name AS product_name, p.code AS product_code
         FROM order_lines ol
         JOIN products p ON ol.product_id = p.id
         WHERE ol.order_id = o.id
         FOR JSON PATH) AS lines_json
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN agents a ON o.agent_id = a.id
      LEFT JOIN locations l ON o.location_id = l.id
      ${where}
      ORDER BY o.created_at DESC`, params)

    const orders = result.recordset.map(normalizeOrder)
    res.json(orders)
  } catch (err) {
    console.error('GET /orders error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orders
router.post('/', authenticateToken, async (req, res) => {
  try {
    await ensurePaymentColumns()
    const o = req.body
    const id = 'o_' + Date.now()
    const nr = 'GX-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000)
    const requiresProforma = !!o.requires_proforma
    const initialStatus = requiresProforma ? 'asteptare_plata' : 'plasata'

    await query(`
      INSERT INTO orders (id, order_number, customer_id, user_id, agent_id, location_id,
        delivery_location_id, status, order_date, payment_type, transport_type,
        observations, currency, applied_exchange_rate, tva_rate,
        net_total, tva_total, gross_total, total_discount, delivery_address, payment_status, delivery_date)
      VALUES (@id, @nr, @cid, @uid, @aid, @lid, @dlid,
        '${initialStatus}', CAST(SYSDATETIME() AS DATE), @pay, @transport,
        @obs, @currency, @exrate, 21.00, 0, 0, 0, 0, @addr, ${requiresProforma ? "'asteptare_plata'" : 'NULL'}, @ddate)`, {
      id, nr,
      cid:      o.customer_id,
      uid:      req.user.id,
      aid:      o.agent_id       || null,
      lid:      o.location_id    || null,
      dlid:     o.delivery_location_id || null,
      pay:      o.payment_type   || 'OP',
      transport:o.transport_type || 'Van',
      obs:      o.observations   || '',
      currency: o.currency       || 'RON',
      exrate:   o.applied_exchange_rate || null,
      addr:     o.delivery_address || '',
      ddate:    o.delivery_date || null,
    })

    // Insert linii
    let netTotal = 0
    const lines = o.lines || []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      // Frontend trimite productId sau product_id
      const productId = l.product_id || l.productId
      const qty       = l.cantitate  || l.quantity  || 0
      const uomCode   = l.unitateSel || l.uom_code  || 'ROLA'
      const unitPrice = l.pretUnitar || l.unit_price || 0
      const lineTotal = Math.round(qty * unitPrice * 100) / 100
      const lineTva   = Math.round(lineTotal * TVA * 100) / 100
      netTotal += lineTotal

      await query(`
        INSERT INTO order_lines (order_id, product_id, uom_code, line_number,
          quantity, quantity_in_rolls, unit_price, unit_price_with_tva,
          line_total, line_tva, line_total_with_tva)
        VALUES (@oid, @pid, @ucode, @ln, @qty, @qr, @up, @upvat, @lt, @ltva, @ltvat)`, {
        oid:   id,
        pid:   productId,
        ucode: uomCode,
        ln:    i + 1,
        qty:   qty,
        qr:    l.quantity_in_rolls || l.cantitateRole || null,
        up:    unitPrice,
        upvat: Math.round(unitPrice * (1 + TVA) * 100) / 100,
        lt:    lineTotal,
        ltva:  lineTva,
        ltvat: Math.round((lineTotal + lineTva) * 100) / 100,
      })
    }

    // Discounturi pe linii (din promoEngine) — salvate ca JSON + total
    // discountLinii.valoare e negativ (ex: -500), totalDiscount = sumă negativă → abs = reducere
    const discountLines = o.discount_lines || o.discountLinii || []
    const totalDiscountSigned = Math.round(discountLines.reduce((s, d) => s + (parseFloat(d.valoare) || 0), 0) * 100) / 100
    const totalDiscount = Math.abs(totalDiscountSigned) // stocat pozitiv în DB (ca reducere)
    const netFinal = Math.max(0, Math.round((netTotal - totalDiscount) * 100) / 100)
    const tvaTotal   = Math.round(netFinal * TVA * 100) / 100
    const grossTotal = Math.round((netFinal + tvaTotal) * 100) / 100
    await query(`UPDATE orders SET net_total=@net, tva_total=@tva, gross_total=@gross,
        total_discount=@disc, discount_lines_json=@dlj WHERE id=@id`,
      { id, net: netFinal, tva: tvaTotal, gross: grossTotal,
        disc: totalDiscount, dlj: JSON.stringify(discountLines) })

    // Selectsoft: proformă (limită credit depășită) — trimisă imediat
    // Comenzi normale: push la APROBARE (PUT /status → aprobata), nu la plasare
    if (requiresProforma) {
      pushOrderToSelectsoft(id, { proforma: true })
        .then(nrIntern => nrIntern && console.log(`[SS] Proformă generată pentru ${nr}: nr_intern=${nrIntern}`))
        .catch(e => console.error('[SELECTSOFT proforma]', e.message))
    }

    // Send confirmation email to customer
    const custResult = await query(
      'SELECT u.email FROM users u WHERE u.customer_id = @cid AND u.delegate_type = \'primary\' AND u.status != \'inactive\'',
      { cid: o.customer_id }
    )
    if (custResult.recordset[0]?.email) {
      emailSvc.sendOrderPlaced(custResult.recordset[0].email, {
        nr, id,
        totalDisplay: `${grossTotal.toFixed(2)} RON`,
      }).catch(() => {})
    }

    res.status(201).json({ id, nr, net_total: Math.round(netTotal * 100) / 100, tva_total: tvaTotal, gross_total: grossTotal })
  } catch (err) {
    console.error('POST /orders error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/orders/:id/status
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, location_id } = req.body
    let q = `UPDATE orders SET status=@status`
    const params = { id: req.params.id, status }
    if (location_id) { q += `, location_id=@lid`; params.lid = location_id }
    q += ` WHERE id=@id`
    await query(q, params)

    // Push în SS la aprobare (o singură dată — guard synced_at IS NULL)
    if (status === 'aprobata' && process.env.SELECTSOFT_PUSH_ORDERS === 'true') {
      const check = await query('SELECT synced_at FROM orders WHERE id=@id', { id: req.params.id })
      if (!check.recordset[0]?.synced_at) {
        pushOrderToSelectsoft(req.params.id).catch(e => console.error('[SS push at aprobare]', e.message))
      }
    }

    // Email notificare client
    const orderResult = await query(
      `SELECT o.order_number, u.email
       FROM orders o
       JOIN users u ON u.customer_id = o.customer_id AND u.delegate_type = 'primary' AND u.status != 'inactive'
       WHERE o.id = @id`, { id: req.params.id }
    )
    const row = orderResult.recordset[0]
    if (row?.email) {
      emailSvc.sendOrderStatusChanged(row.email, { nr: row.order_number, id: req.params.id }, status).catch(() => {})
    }

    res.json({ message: `Status actualizat: ${status}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Helper: încarcă o comandă normalizată după id (refolosit la edit response)
async function fetchOrderNormalized(orderId) {
  const result = await query(`
    SELECT o.*,
      c.name AS firm_name,
      a.name AS agent_name,
      l.name AS location_name,
      (SELECT ol.id, ol.product_id, ol.uom_code, ol.quantity, ol.quantity_in_rolls,
              ol.unit_price, ol.unit_price_with_tva, ol.line_total, ol.line_tva,
              ol.line_total_with_tva, p.name AS product_name, p.code AS product_code
       FROM order_lines ol
       JOIN products p ON ol.product_id = p.id
       WHERE ol.order_id = o.id
       FOR JSON PATH) AS lines_json
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN agents a ON o.agent_id = a.id
    LEFT JOIN locations l ON o.location_id = l.id
    WHERE o.id = @id`, { id: orderId })
  return result.recordset[0] ? normalizeOrder(result.recordset[0]) : null
}

// PUT /api/orders/:id/lines — editare linii comandă (admin, DOAR status plasata, pre-SS)
router.put('/:id/lines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ordRes = await query('SELECT status, synced_at, transport_type FROM orders WHERE id=@id', { id: req.params.id })
    const ord = ordRes.recordset[0]
    if (!ord) return res.status(404).json({ error: 'Comanda nu există' })
    if (ord.synced_at) return res.status(409).json({ error: 'Comanda a fost deja trimisă în SelectSoft și nu mai poate fi modificată.' })
    if (ord.status !== 'plasata') return res.status(409).json({ error: `Comanda poate fi editată doar în status 'Plasată' (status curent: '${ord.status}').` })

    const { lines, discount_lines, observations, reason, transport_type } = req.body
    if (!lines?.length) return res.status(400).json({ error: 'Liniile nu pot fi goale' })

    // Șterge liniile vechi și reinsertează
    await query('DELETE FROM order_lines WHERE order_id=@id', { id: req.params.id })
    let netTotal = 0
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const productId = l.product_id || l.productId
      const qty       = l.quantity || l.cantitate || 0
      const uomCode   = l.uom_code || l.unitateSel || 'ROLA'
      const unitPrice = l.unit_price || l.pretUnitar || 0
      const qtyRolls  = l.quantity_in_rolls != null ? l.quantity_in_rolls : null
      const lineTotal = l.total != null ? Math.round(l.total * 100) / 100 : Math.round(qty * unitPrice * 100) / 100
      const lineTva   = Math.round(lineTotal * TVA * 100) / 100
      netTotal += lineTotal
      await query(`
        INSERT INTO order_lines (order_id, product_id, uom_code, line_number,
          quantity, quantity_in_rolls, unit_price, unit_price_with_tva,
          line_total, line_tva, line_total_with_tva)
        VALUES (@oid, @pid, @ucode, @ln, @qty, @qr, @up, @upvat, @lt, @ltva, @ltvat)`, {
        oid: req.params.id, pid: productId, ucode: uomCode, ln: i + 1,
        qty, qr: qtyRolls, up: unitPrice,
        upvat: Math.round(unitPrice * (1 + TVA) * 100) / 100,
        lt: lineTotal, ltva: lineTva, ltvat: Math.round((lineTotal + lineTva) * 100) / 100,
      })
    }

    const discountLines = discount_lines || []
    const totalDiscountSigned = Math.round(discountLines.reduce((s, d) => s + (parseFloat(d.valoare) || 0), 0) * 100) / 100
    const totalDiscount = Math.abs(totalDiscountSigned) // pozitiv în DB
    const netFinal   = Math.max(0, Math.round((netTotal - totalDiscount) * 100) / 100)
    const tvaTotal   = Math.round(netFinal * TVA * 100) / 100
    const grossTotal = Math.round((netFinal + tvaTotal) * 100) / 100
    const tt = transport_type || ord.transport_type || 'Van'

    await query(`UPDATE orders SET net_total=@net, tva_total=@tva, gross_total=@gross,
      total_discount=@disc, discount_lines_json=@dlj, transport_type=@tt${observations != null ? ', observations=@obs' : ''}
      WHERE id=@id`, {
      id: req.params.id, net: netFinal, tva: tvaTotal, gross: grossTotal,
      disc: totalDiscount, dlj: JSON.stringify(discountLines), tt,
      ...(observations != null ? { obs: observations } : {}),
    })

    const updatedOrder = await fetchOrderNormalized(req.params.id)

    // Notificare email client cu noua formă a comenzii + motiv
    const emailRow = await query(
      `SELECT u.email FROM users u
       WHERE u.customer_id = (SELECT customer_id FROM orders WHERE id=@id)
         AND u.delegate_type = 'primary' AND u.status != 'inactive'`, { id: req.params.id })
    const clientEmail = emailRow.recordset[0]?.email
    if (clientEmail && updatedOrder) {
      emailSvc.sendOrderEdited(
        clientEmail,
        { nr: updatedOrder.nr, id: req.params.id, lines: updatedOrder.lines, total: updatedOrder.total },
        req.user.name || req.user.email,
        reason
      ).catch(() => {})
    }

    res.json({ message: 'Comanda a fost actualizată', order: updatedOrder })
  } catch (err) {
    console.error('PUT /orders/:id/lines error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orders/:id/notes
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Textul notei este obligatoriu' })

    // Ia notele existente
    const result = await query(`SELECT internal_notes_json FROM orders WHERE id=@id`, { id: req.params.id })
    const order = result.recordset[0]
    if (!order) return res.status(404).json({ error: 'Comanda nu există' })

    let notes = []
    try { notes = order.internal_notes_json ? JSON.parse(order.internal_notes_json) : [] }
    catch { notes = [] }

    notes.push({ text, timestamp: new Date().toISOString(), by: req.user.name || req.user.email })

    await query(`UPDATE orders SET internal_notes_json=@notes WHERE id=@id`,
      { id: req.params.id, notes: JSON.stringify(notes) })

    res.json({ message: 'Notă adăugată', notes })
  } catch (err) {
    console.error('POST /orders/:id/notes error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orders/:id/check-payment — verifică în SS dacă proforma a fost achitată
router.post('/:id/check-payment', authenticateToken, async (req, res) => {
  try {
    const result = await checkProformaPayment(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ checked: false, error: err.message })
  }
})

// PUT /api/orders/:id/proforma-nr — admin setează manual nr_intern SS al proformei
router.put('/:id/proforma-nr', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { proforma_nr_intern } = req.body
    if (!proforma_nr_intern?.toString().trim()) return res.status(400).json({ error: 'Nr. intern lipsă' })
    await ensurePaymentColumns()
    const ordRes = await query('SELECT payment_status FROM orders WHERE id=@id', { id: req.params.id })
    if (!ordRes.recordset[0]) return res.status(404).json({ error: 'Comanda nu există' })
    await query('UPDATE orders SET proforma_nr_intern=@nr WHERE id=@id',
      { id: req.params.id, nr: proforma_nr_intern.toString().trim() })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/orders/:id/delivery-date — admin setează data livrare confirmată
router.put('/:id/delivery-date', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { delivery_date_confirmed } = req.body
    await query('UPDATE orders SET delivery_date_confirmed=@d WHERE id=@id',
      { id: req.params.id, d: delivery_date_confirmed || null })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:id/proforma — detalii proformă (incl. liniile din SS dacă există)
router.get('/:id/proforma', authenticateToken, async (req, res) => {
  try {
    await ensurePaymentColumns()
    const ordRes = await query('SELECT id, order_number, proforma_nr_intern, payment_status, payment_confirmed_at, gross_total FROM orders WHERE id = @id', { id: req.params.id })
    const o = ordRes.recordset[0]
    if (!o) return res.status(404).json({ error: 'Comandă inexistentă' })
    const out = {
      order_id: o.id,
      order_number: o.order_number,
      proforma_nr_intern: o.proforma_nr_intern,
      payment_status: o.payment_status,
      payment_confirmed_at: o.payment_confirmed_at,
      gross_total: o.gross_total,
      lines: [],
    }
    if (o.proforma_nr_intern) {
      try {
        const ss = require('../selectsoftService')
        if (ss.isConfigured()) {
          const poz = await ss.getPozitiiDocument(o.proforma_nr_intern)
          out.lines = poz?.result || poz?.pozitii || []
        }
      } catch (e) { out.ss_error = e.message }
    }
    res.json(out)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/orders/:id/push-selectsoft — retrimite manual comanda în SS (admin)
router.post('/:id/push-selectsoft', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const nrIntern = await pushOrderToSelectsoft(req.params.id, { proforma: !!req.body.proforma })
    if (!nrIntern) return res.json({ ok: false, message: 'Selectsoft neconfigurat sau nu a returnat nr_intern' })
    res.json({ ok: true, nr_intern: nrIntern })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

// PUT /api/orders/:id/factura
router.put('/:id/factura', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { invoice_number, delivery_note_number } = req.body
    await query(`UPDATE orders SET invoice_number=@inv, delivery_note_number=@dn WHERE id=@id`,
      { id: req.params.id, inv: invoice_number || null, dn: delivery_note_number || null })
    res.json({ message: 'Factură actualizată' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.monitorPendingPayments = monitorPendingPayments
