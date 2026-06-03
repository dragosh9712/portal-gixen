const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

router.get('/', authenticateToken, async (req, res) => {
  try { res.json((await query('SELECT * FROM locations ORDER BY is_default_order DESC, name')).recordset) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const d = req.body
    const id = 'loc_' + Date.now()
    await query(`INSERT INTO locations (id, name, address, city, county, is_active, is_default_order) VALUES (@id,@name,@addr,@city,@county,1,0)`,
      { id, name: d.name, addr: d.address || d.adresa || null, city: d.city || d.localitate || null, county: d.county || d.judet || null })
    res.status(201).json({ id, ...d })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const d = req.body
    await query(`UPDATE locations SET name=COALESCE(@name,name), address=COALESCE(@addr,address), city=COALESCE(@city,city), county=COALESCE(@county,county) WHERE id=@id`,
      { id: req.params.id, name: d.name || null, addr: d.address || d.adresa || null, city: d.city || d.localitate || null, county: d.county || d.judet || null })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id/default', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query(`UPDATE locations SET is_default_order=0`)
    await query(`UPDATE locations SET is_default_order=1 WHERE id=@id`, { id: req.params.id })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
