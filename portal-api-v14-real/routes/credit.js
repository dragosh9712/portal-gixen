const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /api/credit/:customerId
router.get('/:customerId', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM credit_limits WHERE customer_id=@id`,
      { id: req.params.customerId }
    )
    res.json(result.recordset[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/credit/:customerId
router.put('/:customerId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const c = req.body
    const limit  = parseFloat(c.credit_limit) || 0
    const used   = parseFloat(c.used_credit)  || 0
    const avail  = Math.max(0, limit - used)

    // Upsert
    const exists = await query(
      `SELECT id FROM credit_limits WHERE customer_id=@id`,
      { id: req.params.customerId }
    )

    if (exists.recordset.length > 0) {
      await query(`
        UPDATE credit_limits SET
          credit_limit               = @limit,
          limit_currency             = @currency,
          used_credit                = @used,
          available_credit           = @avail,
          notification_threshold_pct = @pct,
          block_on_exceed            = @block
        WHERE customer_id=@id`, {
        id:       req.params.customerId,
        limit,
        currency: c.limit_currency || 'RON',
        used,
        avail,
        pct:      c.notification_threshold_pct || 80,
        block:    c.block_on_exceed ? 1 : 0,
      })
    } else {
      await query(`
        INSERT INTO credit_limits (customer_id, credit_limit, limit_currency, used_credit, available_credit, notification_threshold_pct, block_on_exceed)
        VALUES (@id, @limit, @currency, @used, @avail, @pct, @block)`, {
        id:       req.params.customerId,
        limit,
        currency: c.limit_currency || 'RON',
        used,
        avail,
        pct:      c.notification_threshold_pct || 80,
        block:    c.block_on_exceed ? 1 : 0,
      })
    }

    res.json({ message: 'Limită credit actualizată', credit_limit: limit, available_credit: avail })
  } catch (err) {
    console.error('PUT /credit error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
