const router = require('express').Router()
const { query, sql } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const emailSvc = require('../emailService')

const TVA = 0.21

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
    const o = req.body
    const id = 'o_' + Date.now()
    const nr = 'GX-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000)

    await query(`
      INSERT INTO orders (id, order_number, customer_id, user_id, agent_id, location_id,
        delivery_location_id, status, order_date, payment_type, transport_type,
        observations, currency, applied_exchange_rate, tva_rate,
        net_total, tva_total, gross_total, total_discount, delivery_address)
      VALUES (@id, @nr, @cid, @uid, @aid, @lid, @dlid,
        'plasata', CAST(SYSDATETIME() AS DATE), @pay, @transport,
        @obs, @currency, @exrate, 21.00, 0, 0, 0, 0, @addr)`, {
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

    // Update totals
    const tvaTotal   = Math.round(netTotal * TVA * 100) / 100
    const grossTotal = Math.round((netTotal + tvaTotal) * 100) / 100
    await query(`UPDATE orders SET net_total=@net, tva_total=@tva, gross_total=@gross WHERE id=@id`,
      { id, net: Math.round(netTotal * 100) / 100, tva: tvaTotal, gross: grossTotal })

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

    // Send status change email to customer
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
