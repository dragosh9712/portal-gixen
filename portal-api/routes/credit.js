const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /api/credit/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        cl.customer_id,
        cl.credit_limit,
        cl.limit_currency,
        ISNULL(cl.notification_threshold_pct, 80) AS notification_threshold_pct,
        ISNULL(cl.block_on_exceed, 0)             AS block_on_exceed,
        ISNULL(
          (SELECT SUM(o.total) FROM orders o
           WHERE o.customer_id = cl.customer_id
             AND o.status NOT IN ('anulata','anulat','respinsa')), 0
        ) AS used_credit
      FROM credit_limits cl
      WHERE cl.customer_id = @id
    `, { id: req.params.id })

    const row = result.recordset[0]
    if (!row) {
      return res.json({
        customer_id: req.params.id,
        credit_limit: 0, limit_currency: 'RON',
        notification_threshold_pct: 80, block_on_exceed: false,
        used_credit: 0, available_credit: 0,
      })
    }
    res.json({
      ...row,
      block_on_exceed: !!row.block_on_exceed,
      available_credit: Math.max(0, (row.credit_limit || 0) - (row.used_credit || 0)),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/credit/:id
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { credit_limit, limit_currency, notification_threshold_pct, block_on_exceed } = req.body
    const params = {
      id: req.params.id,
      limit: parseFloat(credit_limit) || 0,
      cur: limit_currency || 'RON',
      pct: parseInt(notification_threshold_pct) || 80,
      block: block_on_exceed ? 1 : 0,
    }

    // Ensure row exists first
    const exists = await query('SELECT 1 FROM credit_limits WHERE customer_id = @id', { id: req.params.id })
    if (exists.recordset.length === 0) {
      await query(
        'INSERT INTO credit_limits (customer_id, credit_limit, limit_currency, notification_threshold_pct, block_on_exceed) VALUES (@id, @limit, @cur, @pct, @block)',
        params
      )
    } else {
      await query(
        'UPDATE credit_limits SET credit_limit=@limit, limit_currency=@cur, notification_threshold_pct=@pct, block_on_exceed=@block WHERE customer_id=@id',
        params
      )
    }
    res.json({ message: 'Limită credit actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
