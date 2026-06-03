const router = require('express').Router()
const { query, sql } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query("SELECT * FROM exchange_rates WHERE currency='EUR'")
    const row = result.recordset[0]
    res.json(row ? { currency: row.currency, rate: row.applied_rate, bnr_rate: row.bnr_rate, updated_at: row.updated_at } : { currency: 'EUR', rate: 5 })
  }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rate = parseFloat(req.body.rate)
    if (!rate || isNaN(rate) || rate <= 0) return res.status(400).json({ error: 'Curs invalid' })
    const pool = await require('../db').getPool()
    const r = pool.request()
    const { sql } = require('../db')
    r.input('rate', sql.Decimal(10, 4), rate)
    await r.query(`
      IF EXISTS (SELECT 1 FROM exchange_rates WHERE currency='EUR')
        UPDATE exchange_rates SET applied_rate=@rate, updated_at=SYSDATETIME() WHERE currency='EUR'
      ELSE
        INSERT INTO exchange_rates (currency, bnr_rate, margin_percent, applied_rate) VALUES ('EUR', @rate, 0, @rate)
    `)
    res.json({ ok: true, rate })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
router.post('/refresh', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const fetch = require('node-fetch')
    const xml = await (await fetch('https://www.bnr.ro/nbrfxrates.xml', { timeout: 10000 })).text()
    const match = xml.match(/<Rate currency="EUR"[^>]*>([^<]+)</)
    if (!match) return res.status(500).json({ error: 'Nu s-a putut citi cursul BNR din XML' })
    const bnrRate = parseFloat(match[1].trim())
    if (isNaN(bnrRate) || bnrRate <= 0) return res.status(500).json({ error: `Curs BNR invalid: "${match[1]}"` })
    const margin = parseFloat(process.env.BNR_MARGIN_PCT) || 0.5
    const applied = Math.round(bnrRate * (1 + margin / 100) * 10000) / 10000

    // Tipuri explicite pentru a evita "nvarchar to numeric"
    const pool = await require('../db').getPool()
    const r = pool.request()
    const { sql } = require('../db')
    r.input('bnr',     sql.Decimal(10, 4), bnrRate)
    r.input('margin',  sql.Decimal(10, 4), margin)
    r.input('applied', sql.Decimal(10, 4), applied)
    await r.query(`
      IF EXISTS (SELECT 1 FROM exchange_rates WHERE currency = 'EUR')
        UPDATE exchange_rates SET bnr_rate = @bnr, margin_percent = @margin, applied_rate = @applied, updated_at = SYSDATETIME() WHERE currency = 'EUR'
      ELSE
        INSERT INTO exchange_rates (currency, bnr_rate, margin_percent, applied_rate) VALUES ('EUR', @bnr, @margin, @applied)
    `)
    res.json({ bnr_rate: bnrRate, applied_rate: applied, source: 'BNR' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
module.exports = router
