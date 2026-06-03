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

const distPath = path.join(__dirname, 'dist')

app.use(express.static(distPath))

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Health check
app.get('/api/health', async (req, res) => {
  const db = require('./db')
  try {
    const pool = await db.getPool()
    const result = await pool.request().query('SELECT 1 AS ok')
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message })
  }
})



app.listen(PORT, () => {
  console.log(`\n Gixen Portal API running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}\n`)
})