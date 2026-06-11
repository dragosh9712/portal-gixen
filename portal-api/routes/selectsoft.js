const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const ss = require('../selectsoftService')

// GET /api/selectsoft/test — verifică conexiunea și tokenul
router.get('/test', authenticateToken, requireAdmin, async (req, res) => {
  if (!ss.isConfigured()) {
    return res.json({ ok: false, error: 'SELECTSOFT_URL / SELECTSOFT_TOKEN lipsesc din .env' })
  }
  try {
    const data = await ss.getParteneri({ limit: 1 })
    res.json({ ok: true, message: 'Conexiune Selectsoft OK', totalParteneri: data.totalRezultate ?? null, url: process.env.SELECTSOFT_URL })
  } catch (err) {
    res.json({ ok: false, error: err.message, url: process.env.SELECTSOFT_URL })
  }
})

// POST /api/selectsoft/sync-products — trage produsele + stocul din Selectsoft
// Match după products.selectsoft_cod (sau code). Produsele noi din SS se creează inactive,
// pentru a fi revizuite de admin (UoM, imagini, prețuri de listă).
router.post('/sync-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let offset = 0
    const limit = 200
    let updated = 0, created = 0, skipped = 0
    const errors = []

    while (true) {
      const data = await ss.getProduse({ limit, offset })
      const produse = data.produse || []
      if (produse.length === 0) break

      for (const p of produse) {
        try {
          if (p.fsinc) { skipped++; continue }  // exclus de la sincronizare în SS

          const existing = await query(
            'SELECT id, fsinc_pret FROM products WHERE selectsoft_cod = @cod OR code = @cod',
            { cod: String(p.cod) }
          )

          if (existing.recordset[0]) {
            const prod = existing.recordset[0]
            await query(
              `UPDATE products SET selectsoft_cod = @cod, updated_at = SYSDATETIME() WHERE id = @id`,
              { id: prod.id, cod: String(p.cod) }
            )
            // Actualizează prețul de bază doar dacă produsul nu are sincronizarea de preț oprită
            const pret = parseFloat(p.pret_van)
            if (!prod.fsinc_pret && pret > 0) {
              await query(
                `UPDATE product_prices SET base_price = @price WHERE product_id = @id AND is_active = 1`,
                { id: prod.id, price: pret }
              )
            }
            updated++
          } else {
            const id = 'p_ss_' + p.cod
            await query(`
              INSERT INTO products (id, code, name, barcode, marca, brand, um, selectsoft_cod, is_active)
              VALUES (@id, @code, @name, @barcode, 'Gixen', NULL, @um, @cod, 0)`, {
              id, code: String(p.cod), name: p.denumire || ('Produs SS ' + p.cod),
              barcode: p.cod_produs || null, um: p.um || 'BUC', cod: String(p.cod),
            })
            const pret = parseFloat(p.pret_van)
            if (pret > 0) {
              await query(
                'INSERT INTO product_prices (product_id, base_price, is_active) VALUES (@id, @price, 1)',
                { id, price: pret }
              )
            }
            created++
          }
        } catch (e) { errors.push(`${p.cod}: ${e.message}`) }
      }

      if (produse.length < limit) break
      offset += limit
    }

    res.json({
      ok: true,
      message: `Sincronizare produse: ${updated} actualizate, ${created} create (inactive, de revizuit), ${skipped} excluse (fsinc)`,
      updated, created, skipped,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/selectsoft/sync-customers — leagă clienții portal de partenerii Selectsoft
// Match după CUI (tax_id ↔ cod_fiscal, ignorând prefixul RO).
router.post('/sync-customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let offset = 0
    const limit = 100
    let matched = 0, unmatched = 0
    const errors = []
    const normalize = cf => String(cf || '').replace(/\s/g, '').replace(/^RO/i, '')

    const customersResult = await query('SELECT id, tax_id FROM customers WHERE tax_id IS NOT NULL')
    const byCui = new Map()
    for (const c of customersResult.recordset) {
      const k = normalize(c.tax_id)
      if (k) byCui.set(k, c.id)
    }

    while (true) {
      const data = await ss.getParteneri({ limit, offset })
      const parteneri = data.parteneri || []
      if (parteneri.length === 0) break

      for (const p of parteneri) {
        try {
          const cui = normalize(p.cod_fiscal)
          const customerId = cui && byCui.get(cui)
          if (customerId) {
            await query(
              'UPDATE customers SET selectsoft_cod_parten = @cod WHERE id = @id',
              { id: customerId, cod: String(p.cod_parten) }
            )
            matched++
          } else {
            unmatched++
          }
        } catch (e) { errors.push(`${p.cod_parten}: ${e.message}`) }
      }

      if (parteneri.length < limit) break
      offset += limit
    }

    res.json({
      ok: true,
      message: `Sincronizare clienți: ${matched} legați de Selectsoft, ${unmatched} parteneri SS fără cont în portal`,
      matched, unmatched,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
