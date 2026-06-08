const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const emailSvc = require('../emailService')

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM users u WHERE u.customer_id = c.id AND u.status != 'inactive') AS user_count
      FROM customers c
      ORDER BY c.created_at DESC
    `)
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM customers WHERE id = @id`, { id: req.params.id })
    if (!result.recordset[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.recordset[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const c = req.body
    const id = 'cust_' + Date.now()
    await query(`
      INSERT INTO customers (id, name, cui, reg_com, address, phone, email, contact_name, contact_email, status, created_at)
      VALUES (@id, @name, @cui, @regCom, @adresa, @telefon, @email, @contactName, @contactEmail, 'in_aprobare', GETDATE())
    `, { id, name: c.name, cui: c.cui || '', regCom: c.regCom || '', adresa: c.adresa || '', telefon: c.telefon || '', email: c.email || '', contactName: c.contact_name || '', contactEmail: c.contact_email || '' })

    if (c.password && c.contact_email) {
      const hash = await bcrypt.hash(c.password, 10)
      const userId = 'usr_' + Date.now()
      await query(`
        INSERT INTO users (id, email, password_hash, role, customer_id, status, created_at)
        VALUES (@id, @email, @hash, 'client', @custId, 'activ', GETDATE())
      `, { id: userId, email: c.contact_email, hash, custId: id })
    }

    res.status(201).json({ id, message: 'Client creat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/customers/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const c = req.body
    const fields = []
    const params = { id: req.params.id }

    if (c.name !== undefined)     { fields.push('name = @name');           params.name = c.name }
    if (c.cui !== undefined)      { fields.push('cui = @cui');              params.cui = c.cui }
    if (c.status !== undefined)   { fields.push('status = @status');       params.status = c.status }
    if (c.currency !== undefined) { fields.push('currency = @currency');   params.currency = c.currency }
    if (c.customer_group !== undefined) { fields.push('customer_group = @cg'); params.cg = c.customer_group }
    if (c.agent_id !== undefined) { fields.push('agent_id = @agentId');    params.agentId = c.agent_id }
    if (c.address !== undefined)  { fields.push('address = @address');     params.address = c.address }
    if (c.phone !== undefined)    { fields.push('phone = @phone');         params.phone = c.phone }
    if (c.email !== undefined)    { fields.push('email = @email');         params.email = c.email }

    if (fields.length > 0) {
      await query(`UPDATE customers SET ${fields.join(', ')} WHERE id = @id`, params)
    }

    if (c.status) {
      await query(
        `UPDATE users SET status = @status WHERE customer_id = @id`,
        { id: req.params.id, status: c.status }
      )
      // Send onboarding emails on status change
      const custResult = await query('SELECT name, email FROM customers WHERE id=@id', { id: req.params.id })
      const cust = custResult.recordset[0]
      if (cust) {
        if (c.status === 'activ') {
          emailSvc.sendOnboardingApproved(cust.email, cust.name).catch(() => {})
        } else if (c.status === 'respinsa') {
          emailSvc.sendOnboardingRejected(cust.email, cust.name, c.rejection_reason || '').catch(() => {})
        }
      }
    }

    res.json({ message: 'Actualizat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/customers/:id/selectsoft
router.post('/:id/selectsoft', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json({ message: 'Sync SS pornit' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/customers/:id/delegate
router.post('/:id/delegate', authenticateToken, async (req, res) => {
  try {
    const d = req.body
    const userId = 'usr_' + Date.now()
    let hash = null
    if (d.password) hash = await bcrypt.hash(d.password, 10)
    await query(`
      INSERT INTO users (id, email, password_hash, role, customer_id, status, created_at, first_name, last_name, phone)
      VALUES (@id, @email, @hash, 'client', @custId, 'activ', GETDATE(), @firstName, @lastName, @phone)
    `, {
      id: userId,
      email: d.email,
      hash: hash || '',
      custId: req.params.id,
      firstName: d.first_name || d.firstName || '',
      lastName: d.last_name || d.lastName || '',
      phone: d.phone || '',
    })
    res.status(201).json({ id: userId, message: 'Delegat adăugat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/customers/:id/delegates
router.get('/:id/delegates', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, first_name, last_name, phone, status, created_at
      FROM users
      WHERE customer_id = @id AND role = 'client'
      ORDER BY created_at DESC
    `, { id: req.params.id })
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
