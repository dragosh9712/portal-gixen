const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken } = require('../middleware/auth')

async function ensureTable() {
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='offers')
    CREATE TABLE offers (
      id          VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64),
      title       NVARCHAR(255),
      status      VARCHAR(50) DEFAULT 'draft',
      data_json   NVARCHAR(MAX),
      created_by  NVARCHAR(255),
      created_at  DATETIME2 DEFAULT SYSDATETIME(),
      updated_at  DATETIME2 DEFAULT SYSDATETIME()
    )`)
}

// GET /api/offers
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensureTable()
    const isAdmin = req.user.role === 'admin'
    const result = isAdmin
      ? await query('SELECT * FROM offers ORDER BY created_at DESC')
      : await query('SELECT * FROM offers WHERE customer_id = @cid ORDER BY created_at DESC', { cid: req.user.customerId })
    res.json(result.recordset.map(o => ({ ...o, ...(o.data_json ? JSON.parse(o.data_json) : {}) })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/offers
router.post('/', authenticateToken, async (req, res) => {
  try {
    await ensureTable()
    const o = req.body
    const id = o.id || ('of_' + Date.now())
    await query(`
      INSERT INTO offers (id, customer_id, title, status, data_json, created_by)
      VALUES (@id, @cid, @title, @status, @data, @by)`, {
      id,
      cid: o.customer_id || o.firmId || null,
      title: o.title || o.nume || 'Ofertă',
      status: o.status || 'draft',
      data: JSON.stringify(o),
      by: req.user.name || req.user.email,
    })
    res.status(201).json({ id, message: 'Ofertă salvată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/offers/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    await ensureTable()
    const o = req.body
    await query(`
      UPDATE offers SET title = @title, status = @status, data_json = @data, updated_at = SYSDATETIME()
      WHERE id = @id`, {
      id: req.params.id,
      title: o.title || o.nume || 'Ofertă',
      status: o.status || 'draft',
      data: JSON.stringify(o),
    })
    res.json({ message: 'Ofertă actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
