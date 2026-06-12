const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

const TODAY = () => new Date().toISOString().slice(0, 10)

// GET /api/banners/active — bannere active azi (clienți logați)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const today = TODAY()
    const result = await query(`
      SELECT id, title, description, image_url, active_from, active_until, show_to_groups
      FROM promo_banners
      WHERE is_active = 1
        AND (active_from IS NULL OR active_from <= @today)
        AND (active_until IS NULL OR active_until >= @today)
      ORDER BY created_at DESC`, { today })

    // Filtrare după grupul clientului (admin vede tot)
    let banners = result.recordset
    if (req.user.role === 'client' && req.user.customerId) {
      try {
        const c = await query('SELECT customer_group FROM customers WHERE id = @id', { id: req.user.customerId })
        const group = (c.recordset[0]?.customer_group || '').toLowerCase()
        banners = banners.filter(b => {
          const g = (b.show_to_groups || 'all').toLowerCase()
          if (g === 'all') return true
          return g.split(',').map(s => s.trim()).includes(group)
        })
      } catch { /* fail-open: arată toate */ }
    }
    res.json(banners)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/banners — toate (admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM promo_banners ORDER BY created_at DESC`)
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/banners — creare (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body
    const id = 'banner_' + Date.now()
    await query(`
      INSERT INTO promo_banners (id, title, description, image_url, active_from, active_until, show_to_groups, is_active)
      VALUES (@id, @title, @desc, @img, @from, @until, @groups, @active)`, {
      id, title: b.title || '', desc: b.description || '', img: b.image_url || null,
      from: b.active_from || null, until: b.active_until || null,
      groups: b.show_to_groups || 'all', active: b.is_active !== false ? 1 : 0
    })
    res.json({ ok: true, id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/banners/:id — editare (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body
    await query(`
      UPDATE promo_banners SET
        title = @title, description = @desc, image_url = @img,
        active_from = @from, active_until = @until,
        show_to_groups = @groups, is_active = @active
      WHERE id = @id`, {
      id: req.params.id, title: b.title || '', desc: b.description || '',
      img: b.image_url || null, from: b.active_from || null, until: b.active_until || null,
      groups: b.show_to_groups || 'all', active: b.is_active !== false ? 1 : 0
    })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/banners/:id (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query(`DELETE FROM promo_banners WHERE id = @id`, { id: req.params.id })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
