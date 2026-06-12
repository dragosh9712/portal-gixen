const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

async function ensureTable() {
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='support_tickets')
    CREATE TABLE support_tickets (
      id           VARCHAR(64) PRIMARY KEY,
      customer_id  VARCHAR(64),
      user_id      VARCHAR(64),
      name         NVARCHAR(255),
      email        NVARCHAR(255),
      phone        NVARCHAR(50),
      subject      NVARCHAR(255),
      description  NVARCHAR(MAX),
      photo_url    NVARCHAR(500),
      status       VARCHAR(30) DEFAULT 'in_asteptare',
      admin_reply  NVARCHAR(MAX),
      created_at   DATETIME2 DEFAULT SYSDATETIME(),
      updated_at   DATETIME2 DEFAULT SYSDATETIME()
    )`)
}

const uploadDir = process.env.UPLOAD_DIR || './uploads'
const ticketsDir = path.join(uploadDir, 'tickets')
if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ticketsDir),
    filename:    (req, file, cb) => cb(null, `ticket_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = (file.mimetype || '').startsWith('image/')
    cb(ok ? null : new Error('Doar imagini'), ok)
  },
})

// GET /api/support — admin: toate; client: ale lui
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensureTable()
    const isAdmin = req.user.role === 'admin'
    const result = isAdmin
      ? await query(`
          SELECT t.*, c.company_name
          FROM support_tickets t
          LEFT JOIN customers c ON c.id = t.customer_id
          ORDER BY t.created_at DESC`)
      : await query(
          'SELECT * FROM support_tickets WHERE user_id = @uid ORDER BY created_at DESC',
          { uid: req.user.id })
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/support — creare ticket (cu foto opțional)
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    await ensureTable()
    const id = 'tk_' + Date.now()
    const { name, email, phone, subject, description } = req.body
    const photo_url = req.file ? `/uploads/tickets/${req.file.filename}` : null
    await query(`
      INSERT INTO support_tickets (id, customer_id, user_id, name, email, phone, subject, description, photo_url)
      VALUES (@id, @cid, @uid, @name, @email, @phone, @subject, @desc, @photo)`, {
      id,
      cid:   req.user.customerId || null,
      uid:   req.user.id,
      name:  name || req.user.name || null,
      email: email || req.user.email || null,
      phone: phone || null,
      subject: subject || null,
      desc:  description || null,
      photo: photo_url,
    })
    res.status(201).json({ id, message: 'Tichet trimis' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/support/:id — admin: schimbă status + răspuns
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureTable()
    const { status, admin_reply } = req.body
    await query(`
      UPDATE support_tickets
      SET status = @status, admin_reply = @reply, updated_at = SYSDATETIME()
      WHERE id = @id`, {
      id:     req.params.id,
      status: status || 'in_asteptare',
      reply:  admin_reply || null,
    })
    res.json({ message: 'Tichet actualizat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message })
  next()
})

module.exports = router
