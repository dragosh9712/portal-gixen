require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 80

// Middleware
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

// Static files — uploaded images
const uploadDir = process.env.UPLOAD_DIR || './uploads'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
if (!fs.existsSync(path.join(uploadDir, 'products'))) fs.mkdirSync(path.join(uploadDir, 'products'))
app.use('/uploads', express.static(uploadDir))

// Routes
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/products',    require('./routes/products'))
app.use('/api/customers',   require('./routes/customers'))
app.use('/api/orders',      require('./routes/orders'))
app.use('/api/offers',      require('./routes/offers'))
app.use('/api/agents',      require('./routes/agents'))
app.use('/api/locations',   require('./routes/locations'))
app.use('/api/exchange',    require('./routes/exchange'))
app.use('/api/credit',      require('./routes/credit'))
app.use('/api/promotions',  require('./routes/promotions'))
app.use('/api/upload',      require('./routes/upload'))
app.use('/api/anaf',        require('./routes/anaf'))
app.use('/api/uom',         require('./routes/uom'))
app.use('/api/surveys',     require('./routes/surveys'))
app.use('/api/selectsoft',  require('./routes/selectsoft'))

// Health check — TREBUIE să fie înainte de catch-all
app.get('/api/health', async (req, res) => {
  const db = require('./db')
  try {
    const pool = await db.getPool()
    await pool.request().query('SELECT 1 AS ok')
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message })
  }
})

// Frontend SPA — static + catch-all (ultimele, după toate rutele API)
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})



// Auto-refresh curs valutar zilnic la 00:05 ora României
async function refreshExchangeRate() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    let xml
    try {
      const resp = await fetch('https://www.bnr.ro/nbrfxrates.xml', { signal: controller.signal })
      if (!resp.ok) { console.error('BNR exchange refresh: HTTP', resp.status); return }
      xml = await resp.text()
    } finally { clearTimeout(timer) }
    const match = xml.match(/<Rate currency="EUR"[^>]*>([^<]+)</)
    if (!match) { console.error('BNR exchange refresh: EUR not found'); return }
    const bnrRate = parseFloat(match[1].trim())
    if (isNaN(bnrRate) || bnrRate <= 0) return
    const margin  = parseFloat(process.env.BNR_MARGIN_PCT) || 0.5
    const applied = Math.round(bnrRate * (1 + margin / 100) * 10000) / 10000
    const db = require('./db')
    const pool = await db.getPool()
    const { sql } = db
    const r = pool.request()
    r.input('bnr',     sql.Decimal(10, 4), bnrRate)
    r.input('margin',  sql.Decimal(10, 4), margin)
    r.input('applied', sql.Decimal(10, 4), applied)
    await r.query(`
      IF EXISTS (SELECT 1 FROM exchange_rates WHERE currency='EUR')
        UPDATE exchange_rates SET bnr_rate=@bnr, margin_percent=@margin, applied_rate=@applied, updated_at=SYSDATETIME() WHERE currency='EUR'
      ELSE
        INSERT INTO exchange_rates (currency, bnr_rate, margin_percent, applied_rate) VALUES ('EUR', @bnr, @margin, @applied)`)
    console.log(`[exchange] refreshed EUR = ${applied} (BNR: ${bnrRate})`)
  } catch (err) { console.error('BNR exchange refresh error:', err.message) }
}

function scheduleMidnightRefresh() {
  // Calculează ms până la 00:05 ora României
  const now = new Date()
  const roNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }))
  const target = new Date(roNow)
  target.setHours(0, 5, 0, 0)
  if (target <= roNow) target.setDate(target.getDate() + 1)
  const delay = target - roNow
  console.log(`[exchange] next auto-refresh in ${Math.round(delay / 60000)} min (00:05 Romania)`)
  setTimeout(() => {
    refreshExchangeRate()
    setInterval(refreshExchangeRate, 24 * 60 * 60 * 1000)
  }, delay)
}

app.listen(PORT, () => {
  console.log(`\n Gixen Portal API running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}\n`)
  scheduleMidnightRefresh()

  // Monitor plăți proforme Selectsoft — la fiecare 15 minute
  const { monitorPendingPayments } = require('./routes/orders')
  setTimeout(() => {
    monitorPendingPayments()
    setInterval(monitorPendingPayments, 15 * 60 * 1000)
  }, 60 * 1000)
})