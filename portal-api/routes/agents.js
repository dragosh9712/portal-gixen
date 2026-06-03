const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /api/agents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM agents ORDER BY name ASC`)
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/agents
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const a = req.body
    const id = 'ag_' + Date.now()
    await query(`
      INSERT INTO agents (id, name, email, phone, is_active, created_at)
      VALUES (@id, @name, @email, @phone, 1, GETDATE())
    `, { id, name: a.name, email: a.email || '', phone: a.phone || '' })
    res.status(201).json({ id, message: 'Agent creat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/agents/:id
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const a = req.body
    await query(`
      UPDATE agents SET name = @name, email = @email, phone = @phone WHERE id = @id
    `, { id: req.params.id, name: a.name, email: a.email || '', phone: a.phone || '' })
    res.json({ message: 'Agent actualizat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/agents/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query(`DELETE FROM agents WHERE id = @id`, { id: req.params.id })
    res.json({ message: 'Agent șters' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/agents/commission-rules
router.get('/commission-rules', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM commission_rules ORDER BY priority DESC`)
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/agents/commission-rules
router.post('/commission-rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const r = req.body
    const id = 'cr_' + Date.now()
    await query(`INSERT INTO commission_rules (id, agent_id, product_id, customer_id, rate, priority, notes, is_active) VALUES (@id, @agent, @prod, @cust, @rate, @pri, @notes, 1)`,
      { id, agent: r.agent_id, prod: r.product_id || null, cust: r.customer_id || null, rate: r.rate || 1.5, pri: r.priority || 10, notes: r.notes || '' })
    res.status(201).json({ id, message: 'Regulă adăugată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/agents/commission-rules/:id
router.put('/commission-rules/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const r = req.body
    await query(`UPDATE commission_rules SET agent_id=@agent, product_id=@prod, customer_id=@cust, rate=@rate, priority=@pri, notes=@notes, is_active=@active WHERE id=@id`,
      { id: req.params.id, agent: r.agent_id, prod: r.product_id || null, cust: r.customer_id || null, rate: r.rate, pri: r.priority, notes: r.notes || '', active: r.is_active !== false ? 1 : 0 })
    res.json({ message: 'Regulă actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/agents/commission-rules/:id
router.delete('/commission-rules/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query(`DELETE FROM commission_rules WHERE id=@id`, { id: req.params.id })
    res.json({ message: 'Regulă ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
