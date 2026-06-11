const router = require('express').Router()
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

const uploadDir = process.env.UPLOAD_DIR || './uploads'
const productsDir = path.join(uploadDir, 'products')

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    cb(null, allowed.includes(file.mimetype))
  }
})

// POST /api/upload/product-image/:productId
router.post('/product-image/:productId', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nicio imagine încărcată' })

    const productId = req.params.productId
    const filename = `${productId}_${Date.now()}.webp`
    const filepath = path.join(productsDir, filename)

    // Redimensionăm și convertim la WebP
    await sharp(req.file.buffer)
      .resize(600, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 85 })
      .toFile(filepath)

    // Thumbnail
    const thumbName = `${productId}_${Date.now()}_thumb.webp`
    await sharp(req.file.buffer)
      .resize(150, 150, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 75 })
      .toFile(path.join(productsDir, thumbName))

    const imageUrl = `/uploads/products/${filename}`

    // Update produs cu URL-ul imaginii
    await query(`UPDATE products SET image_url = @url, updated_at = SYSDATETIME() WHERE id = @id`,
      { url: imageUrl, id: productId })

    res.json({
      url: imageUrl,
      thumbnail: `/uploads/products/${thumbName}`,
      message: 'Imagine încărcată cu succes'
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/upload/product-image/:productId
router.delete('/product-image/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`SELECT image_url FROM products WHERE id = @id`, { id: req.params.productId })
    const product = result.recordset[0]
    if (product?.image_url) {
      const filepath = path.join(uploadDir, product.image_url.replace('/uploads/', ''))
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    }
    await query(`UPDATE products SET image_url = NULL, updated_at = SYSDATETIME() WHERE id = @id`, { id: req.params.productId })
    res.json({ message: 'Imagine ștearsă' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
