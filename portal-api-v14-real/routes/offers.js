const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /api/offers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM offers ORDER BY created_at DESC')
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/offers
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const o = req.body
    const id = 'of_' + Date.now()

    // Toate variabilele din SQL declarate explicit în params
    await query(`
      INSERT INTO offers (
        id, offer_number, customer_id, created_by_user_id, agent_id,
        offer_type, client_name, status, issue_date, expiration_date,
        validity_days, products_json, prices_per_uom_json, scenarios_json,
        currency, applied_exchange_rate, observations, tva_rate
      ) VALUES (
        @id, @nr, @cid, @uid, @aid,
        @type, @cname, 'emisa', @issue, @exp,
        @days, @products, @prices, @scenarios,
        @currency, @exrate, @obs, 21.00
      )`, {
      id,
      nr:       o.offer_number            || null,
      cid:      o.customer_id             || null,
      uid:      req.user.id,
      aid:      o.agent_id                || null,
      type:     o.offer_type              || 'client',
      cname:    o.client_name             || null,
      issue:    o.issue_date              || null,
      exp:      o.expiration_date         || null,
      days:     o.validity_days           || 15,
      products: JSON.stringify(o.products_selected || o.products_json || []),
      prices:   JSON.stringify(o.prices_per_uom    || {}),
      scenarios:JSON.stringify(o.scenarios         || []),
      currency: o.currency                || 'RON',
      exrate:   o.applied_exchange_rate   || null,
      obs:      o.observations            || '',
    })
    res.status(201).json({ id, message: 'Ofertă salvată' })
  } catch (err) {
    console.error('POST /offers error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/offers/:id
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const o = req.body
    await query(`
      UPDATE offers SET
        offer_number       = COALESCE(@nr, offer_number),
        customer_id        = COALESCE(@cid, customer_id),
        client_name        = COALESCE(@cname, client_name),
        status             = COALESCE(@status, status),
        products_json      = COALESCE(@products, products_json),
        prices_per_uom_json= COALESCE(@prices, prices_per_uom_json),
        scenarios_json     = COALESCE(@scenarios, scenarios_json),
        observations       = COALESCE(@obs, observations),
        expiration_date    = COALESCE(@exp, expiration_date)
      WHERE id = @id`, {
      id:        req.params.id,
      nr:        o.offer_number   || null,
      cid:       o.customer_id    || null,
      cname:     o.client_name    || null,
      status:    o.status         || null,
      products:  o.products_selected ? JSON.stringify(o.products_selected) : null,
      prices:    o.prices_per_uom    ? JSON.stringify(o.prices_per_uom)    : null,
      scenarios: o.scenarios         ? JSON.stringify(o.scenarios)         : null,
      obs:       o.observations   || null,
      exp:       o.expiration_date|| null,
    })
    res.json({ message: 'Ofertă actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
