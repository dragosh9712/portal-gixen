const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

const uploadDir = process.env.UPLOAD_DIR || './uploads'
const productsDir = path.join(uploadDir, 'products')
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${req.params.productId}_${Date.now()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new Error('Doar imagini (jpg, png, webp, svg)'), ok)
  },
})

// ── Fișe tehnice PDF ──
const datasheetsDir = path.join(uploadDir, 'datasheets')
if (!fs.existsSync(datasheetsDir)) fs.mkdirSync(datasheetsDir, { recursive: true })

const datasheetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, datasheetsDir),
    filename: (req, file, cb) => cb(null, `${req.params.productId}_${Date.now()}.pdf`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = path.extname(file.originalname).toLowerCase() === '.pdf'
    cb(ok ? null : new Error('Doar fișiere PDF'), ok)
  },
})

// POST /api/upload/product-datasheet/:productId — upload fișă tehnică PDF
router.post('/product-datasheet/:productId', authenticateToken, requireAdmin, datasheetUpload.single('datasheet'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Lipsește fișierul PDF' })
    // Șterge PDF-ul vechi dacă există
    const old = await query('SELECT datasheet_url FROM products WHERE id = @id', { id: req.params.productId })
    const oldUrl = old.recordset[0]?.datasheet_url
    if (oldUrl && oldUrl.startsWith('/uploads/')) {
      const oldPath = path.join(uploadDir, oldUrl.replace('/uploads/', ''))
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }
    const url = `/uploads/datasheets/${req.file.filename}`
    await query('UPDATE products SET datasheet_url = @url WHERE id = @id',
      { id: req.params.productId, url })
    res.json({ datasheet_url: url, message: 'Fișă tehnică încărcată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/upload/product-datasheet/:productId
router.delete('/product-datasheet/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT datasheet_url FROM products WHERE id = @id', { id: req.params.productId })
    const url = result.recordset[0]?.datasheet_url
    if (url && url.startsWith('/uploads/')) {
      const filePath = path.join(uploadDir, url.replace('/uploads/', ''))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await query('UPDATE products SET datasheet_url = NULL WHERE id = @id', { id: req.params.productId })
    res.json({ message: 'Fișă tehnică ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Imagini bannere promo ──
const bannersDir = path.join(uploadDir, 'banners')
if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true })

const bannerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, bannersDir),
    filename: (req, file, cb) => cb(null, `banner_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new Error('Doar imagini (jpg, png, webp, gif)'), ok)
  },
})

// POST /api/upload/banner-image — returnează URL-ul imaginii
router.post('/banner-image', authenticateToken, requireAdmin, bannerUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Lipsește fișierul' })
  res.json({ image_url: `/uploads/banners/${req.file.filename}`, message: 'Imagine încărcată' })
})

// POST /api/upload/product-image/:productId
router.post('/product-image/:productId', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Lipsește fișierul' })
    const imageUrl = `/uploads/products/${req.file.filename}`
    await query('UPDATE products SET image_url = @url WHERE id = @id',
      { id: req.params.productId, url: imageUrl })
    res.json({ image_url: imageUrl, message: 'Imagine încărcată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/upload/product-image/:productId
router.delete('/product-image/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT image_url FROM products WHERE id = @id', { id: req.params.productId })
    const url = result.recordset[0]?.image_url
    if (url && url.startsWith('/uploads/')) {
      const filePath = path.join(uploadDir, url.replace('/uploads/', ''))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await query('UPDATE products SET image_url = NULL WHERE id = @id', { id: req.params.productId })
    res.json({ message: 'Imagine ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
