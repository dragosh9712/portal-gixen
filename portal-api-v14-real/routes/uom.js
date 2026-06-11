const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

router.get('/', authenticateToken, async (req, res) => {
  try {
    let rows
    try {
      rows = (await query('SELECT id, code, name FROM uom_catalog ORDER BY code')).recordset
    } catch {
      rows = (await query('SELECT DISTINCT uom_code AS code, uom_name AS name FROM product_uom ORDER BY uom_code')).recordset
        .map(r => ({ id: r.code, code: r.code, name: r.name || r.code }))
    }
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, name } = req.body
    if (!code || !name) return res.status(400).json({ error: 'code și name sunt obligatorii' })
    const pool = await require('../db').getPool()
    const { sql } = require('../db')
    const r = pool.request()
    r.input('code', sql.NVarChar(20), code.toUpperCase())
    r.input('name', sql.NVarChar(100), name)
    const result = await r.query(`
      INSERT INTO uom_catalog (code, name) OUTPUT INSERTED.id, INSERTED.code, INSERTED.name
      VALUES (@code, @name)
    `)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    console.error('POST /uom error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body
    const pool = await require('../db').getPool()
    const { sql } = require('../db')
    const r = pool.request()
    r.input('id',   sql.Int, parseInt(req.params.id))
    r.input('name', sql.NVarChar(100), name)
    await r.query(`UPDATE uom_catalog SET name=@name WHERE id=@id`)
    res.json({ message: 'UoM actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
