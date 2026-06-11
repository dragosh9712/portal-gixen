const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token necesar' })
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Token invalid sau expirat' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acces interzis — doar admin' })
  next()
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, customerId: user.customer_id },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  )
}

module.exports = { authenticateToken, requireAdmin, generateToken }
