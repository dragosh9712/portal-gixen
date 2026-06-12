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
  // Tabela poate exista dintr-o versiune veche fără toate coloanele
  await query(`IF COL_LENGTH('offers','created_by') IS NULL ALTER TABLE offers ADD created_by NVARCHAR(255)`)
  await query(`IF COL_LENGTH('offers','data_json') IS NULL ALTER TABLE offers ADD data_json NVARCHAR(MAX)`)
  await query(`IF COL_LENGTH('offers','title') IS NULL ALTER TABLE offers ADD title NVARCHAR(255)`)
  await query(`IF COL_LENGTH('offers','updated_at') IS NULL ALTER TABLE offers ADD updated_at DATETIME2 DEFAULT SYSDATETIME()`)
  // Coloana veche fără default NOT NULL — o facem nullable dacă nu există
  await query(`IF COL_LENGTH('offers','created_by_user_id') IS NULL ALTER TABLE offers ADD created_by_user_id NVARCHAR(64)`)
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
      INSERT INTO offers (id, customer_id, title, status, data_json, created_by, created_by_user_id)
      VALUES (@id, @cid, @title, @status, @data, @by, @uid)`, {
      id,
      cid: o.customer_id || o.firmId || null,
      title: o.title || o.nume || 'Ofertă',
      status: o.status || 'draft',
      data: JSON.stringify(o),
      by: req.user.name || req.user.email,
      uid: req.user.id || null,
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

// DELETE /api/offers/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Doar adminii pot șterge oferte' })
    await ensureTable()
    await query('DELETE FROM offers WHERE id = @id', { id: req.params.id })
    res.json({ message: 'Ofertă ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
