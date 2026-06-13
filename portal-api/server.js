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

// Audit log — loghează în SQL orice acțiune care modifică date (montat înaintea rutelor)
const { auditMiddleware, logSystem } = require('./auditLog')
app.use(auditMiddleware)

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
app.use('/api/banners',    require('./routes/banners'))
app.use('/api/support',    require('./routes/support'))

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
    logSystem('exchange.refresh_bnr', { bnr_rate: bnrRate, applied_rate: applied, margin_pct: margin })
  } catch (err) {
    console.error('BNR exchange refresh error:', err.message)
    logSystem('exchange.refresh_bnr', { error: err.message })
  }
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

async function runMigrations() {
  const { query } = require('./db')
  try {
    await query(`IF COL_LENGTH('customers','newsletter_opt_in') IS NULL ALTER TABLE customers ADD newsletter_opt_in BIT DEFAULT 0`)
    await query(`IF COL_LENGTH('customers','adresa_livrare') IS NULL ALTER TABLE customers ADD adresa_livrare NVARCHAR(500)`)
    await query(`IF COL_LENGTH('customers','program_livrare') IS NULL ALTER TABLE customers ADD program_livrare NVARCHAR(150)`)
    await query(`IF COL_LENGTH('customers','email_documente') IS NULL ALTER TABLE customers ADD email_documente NVARCHAR(255)`)
    await query(`IF COL_LENGTH('customers','iban') IS NULL ALTER TABLE customers ADD iban NVARCHAR(50)`)
    await query(`IF COL_LENGTH('customers','banca') IS NULL ALTER TABLE customers ADD banca NVARCHAR(150)`)
    await query(`IF COL_LENGTH('customers','site_web') IS NULL ALTER TABLE customers ADD site_web NVARCHAR(255)`)
    await query(`IF COL_LENGTH('products','specs_json') IS NULL ALTER TABLE products ADD specs_json NVARCHAR(MAX)`)
    await query(`IF COL_LENGTH('products','datasheet_url') IS NULL ALTER TABLE products ADD datasheet_url NVARCHAR(500)`)
    await query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='customer_locations')
      CREATE TABLE customer_locations (
        id VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        name NVARCHAR(255),
        address NVARCHAR(500),
        locality NVARCHAR(150),
        county NVARCHAR(100),
        contact_phone NVARCHAR(50),
        program NVARCHAR(150),
        is_default BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSDATETIME()
      )`)
    await query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='promo_banners')
      CREATE TABLE promo_banners (
        id VARCHAR(64) PRIMARY KEY,
        title NVARCHAR(255),
        description NVARCHAR(2000),
        image_url NVARCHAR(500),
        active_from DATE,
        active_until DATE,
        show_to_groups NVARCHAR(255) DEFAULT 'all',
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT SYSDATETIME()
      )`)
    // 2FA columns
    await query(`IF COL_LENGTH('users','two_fa_enabled') IS NULL ALTER TABLE users ADD two_fa_enabled BIT DEFAULT 1`)
    await query(`IF COL_LENGTH('users','otp_code')       IS NULL ALTER TABLE users ADD otp_code       NVARCHAR(64)`)
    await query(`IF COL_LENGTH('users','otp_expires_at') IS NULL ALTER TABLE users ADD otp_expires_at DATETIME2`)
    console.log('[migrations] OK')
  } catch (e) { console.error('[migrations] Error:', e.message) }
}

// ── HTTPS opțional ──
// Setează în .env: SSL_KEY_PATH + SSL_CERT_PATH (PEM). Dacă lipsesc → HTTP simplu.
// HTTPS_PORT (default 443). Când HTTPS e activ, portul HTTP redirecționează către HTTPS.
function startServer(onReady) {
  const keyPath  = process.env.SSL_KEY_PATH
  const certPath = process.env.SSL_CERT_PATH
  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const https = require('https')
    const httpsPort = parseInt(process.env.HTTPS_PORT) || 443
    const options = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    https.createServer(options, app).listen(httpsPort, () => {
      console.log(`\n Gixen Portal API running on HTTPS port ${httpsPort}`)
      onReady()
    })
    // HTTP → HTTPS redirect pe portul vechi
    const http = require('http')
    http.createServer((req, res) => {
      const host = (req.headers.host || '').replace(/:\d+$/, '')
      res.writeHead(301, { Location: `https://${host}${httpsPort !== 443 ? ':' + httpsPort : ''}${req.url}` })
      res.end()
    }).listen(PORT, () => console.log(`   HTTP :${PORT} → redirect HTTPS :${httpsPort}`))
  } else {
    app.listen(PORT, () => {
      console.log(`\n Gixen Portal API running on HTTP port ${PORT}`)
      if (keyPath || certPath) console.warn('   ⚠ SSL_KEY_PATH/SSL_CERT_PATH setate dar fișierele nu există — rulează pe HTTP')
      onReady()
    })
  }
}

startServer(() => {
  runMigrations()
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}\n`)
  logSystem('server.start', { port: PORT, env: process.env.NODE_ENV || 'development' })
  scheduleMidnightRefresh()

  // Monitor plăți proforme Selectsoft — la fiecare 15 minute
  const { monitorPendingPayments } = require('./routes/orders')
  const runPaymentMonitor = async () => {
    try {
      const result = await monitorPendingPayments()
      logSystem('selectsoft.monitor_payments', result || { ok: true })
    } catch (err) {
      logSystem('selectsoft.monitor_payments', { error: err.message })
    }
  }
  setTimeout(() => {
    runPaymentMonitor()
    setInterval(runPaymentMonitor, 15 * 60 * 1000)
  }, 60 * 1000)
})