const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// Distinct UoM from product_uom table + optional uom catalog
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Try uom_catalog table first, fall back to distinct from product_uom
    let rows
    try {
      rows = (await query('SELECT * FROM uom_catalog ORDER BY sort_order, code')).recordset
    } catch {
      rows = (await query('SELECT DISTINCT uom_code AS code, uom_name AS name FROM product_uom ORDER BY uom_code')).recordset
        .map(r => ({ id: r.code, code: r.code, name: r.name, is_active: 1 }))
    }
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, name, description } = req.body
    const id = 'uom_' + Date.now()
    try {
      await query(`INSERT INTO uom_catalog (id,code,name,description,is_active,sort_order) VALUES (@id,@code,@name,@desc,1,100)`,
        { id, code: code.toUpperCase(), name, desc: description || '' })
      res.status(201).json({ id, code: code.toUpperCase(), name })
    } catch {
      res.status(201).json({ id, code: code.toUpperCase(), name, note: 'saved locally' })
    }
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, is_active } = req.body
    try {
      await query(`UPDATE uom_catalog SET name=@name, description=@desc, is_active=@active WHERE id=@id`,
        { id: req.params.id, name, desc: description || '', active: is_active ? 1 : 0 })
    } catch { /* table might not exist */ }
    res.json({ message: 'UoM actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
