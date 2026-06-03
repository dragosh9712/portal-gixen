const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const { query } = require('../db')
const { generateToken, authenticateToken, requireAdmin } = require('../middleware/auth')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email și parolă necesare' })

    const result = await query(`
      SELECT u.*,
        c.name                  AS firm_name,
        c.agent_id,
        c.currency,
        c.status                AS firm_status,
        c.survey_completed,
        c.default_transport_type,
        c.customer_group
      FROM users u
      LEFT JOIN customers c ON u.customer_id = c.id
      WHERE u.email = @email AND u.status != 'inactive'`,
      { email }
    )
    const user = result.recordset[0]
    if (!user) return res.status(401).json({ error: 'Email sau parolă incorecte' })

    const validPass = await bcrypt.compare(password, user.password_hash)
    if (!validPass) return res.status(401).json({ error: 'Email sau parolă incorecte' })

    if (user.role === 'client') {
      if (user.firm_status === 'in_aprobare') return res.status(403).json({ error: 'Contul este în curs de aprobare' })
      if (user.firm_status === 'respinsa')    return res.status(403).json({ error: 'Contul a fost respins' })
    }

    const needsSurvey = user.role === 'client' && !user.first_login_done && !user.survey_completed

    // Marchează primul login
    if (!user.first_login_done) {
      await query('UPDATE users SET first_login_done = 1 WHERE id = @id', { id: user.id })
    }

    const token = generateToken(user)
    res.json({
      token,
      user: {
        id:            user.id,
        email:         user.email,
        name:          user.name,
        role:          user.role,
        customerId:    user.customer_id,
        firmName:      user.firm_name,
        agentId:       user.agent_id,
        currency:      user.currency,
        delegateType:  user.delegate_type,
        canPlaceOrders:!!user.can_place_orders,
        needsSurvey,
      }
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Eroare server: ' + err.message })
  }
})

// POST /api/auth/register — înregistrare client nou
router.post('/register', async (req, res) => {
  try {
    const { numeFirma, cui, regCom, adresa, localitate, judet, contactNume, contactPrenume, contactEmail, contactTelefon, password } = req.body
    if (!contactEmail || !password || !numeFirma) {
      return res.status(400).json({ error: 'Câmpuri obligatorii lipsă: numeFirma, contactEmail, password' })
    }

    // Verifică dacă emailul există deja
    const existing = await query('SELECT id FROM users WHERE email = @email', { email: contactEmail })
    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'Există deja un cont cu acest email' })
    }

    const firmId  = 'f_' + Date.now()
    const userId  = 'u_' + Date.now()
    const hash    = await bcrypt.hash(password, 10)
    const name    = [contactNume, contactPrenume].filter(Boolean).join(' ') || contactEmail

    // Creare firmă
    await query(`
      INSERT INTO customers (
        id, name, tax_id, trade_register_no, address, county, locality,
        email, phone, agent_id, customer_group, currency,
        default_transport_type, global_discount, allowed_brands,
        platitor_tva, email_documente, status, survey_completed
      ) VALUES (
        @id, @name, @tax_id, @reg, @addr, @county, @locality,
        @email, @phone, 'ag1', 'standard', 'RON',
        'Van', 0, '["Gixen","Client"]',
        1, @email, 'in_aprobare', 0
      )`, {
      id: firmId, name: numeFirma, tax_id: cui || null, reg: regCom || null,
      addr: adresa || null, county: judet || null, locality: localitate || null,
      email: contactEmail, phone: contactTelefon || null,
    })

    // Credit limit gol
    await query('INSERT INTO credit_limits (customer_id, credit_limit, limit_currency) VALUES (@id, 0, @cur)', { id: firmId, cur: 'RON' })

    // Creare user
    await query(`
      INSERT INTO users (id, email, password_hash, name, role, delegate_type, can_place_orders, status, customer_id, first_login_done)
      VALUES (@id, @email, @hash, @name, 'client', 'primary', 1, 'in_aprobare', @cid, 0)`,
      { id: userId, email: contactEmail, hash, name, cid: firmId }
    )

    res.status(201).json({ message: 'Cont creat cu succes. Așteptați aprobarea.' })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ error: 'Eroare la înregistrare: ' + err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.name, u.role, u.customer_id, u.delegate_type, u.can_place_orders,
             c.name AS firm_name, c.agent_id, c.currency
      FROM users u LEFT JOIN customers c ON u.customer_id = c.id
      WHERE u.id = @id`, { id: req.user.id }
    )
    res.json(result.recordset[0] || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Câmpuri obligatorii lipsă' })
    if (newPassword.length < 6) return res.status(400).json({ error: 'Parola nouă trebuie să aibă minim 6 caractere' })
    const result = await query('SELECT password_hash FROM users WHERE id=@id', { id: req.user.id })
    const user = result.recordset[0]
    if (!user) return res.status(404).json({ error: 'Utilizator inexistent' })
    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Parola actuală este incorectă' })
    const hash = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password_hash=@hash, updated_at=SYSDATETIME() WHERE id=@id', { id: req.user.id, hash })
    res.json({ message: 'Parola a fost schimbată cu succes' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/reset-password/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere' })
    const hash = await bcrypt.hash(newPassword, 10)
    const result = await query('UPDATE users SET password_hash=@hash, updated_at=SYSDATETIME() WHERE id=@id', { id: req.params.userId, hash })
    if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Utilizator inexistent' })
    res.json({ message: 'Parola a fost resetată' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/forgot-password — user requests reset (admin will manually reset)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email obligatoriu' })
    // Verify email exists (don't reveal if it doesn't for security)
    await query('SELECT id FROM users WHERE email=@email', { email })
    // In production this would send an email; for now just log and respond
    console.log(`[RESET REQUEST] Email: ${email} — ${new Date().toISOString()}`)
    res.json({ message: 'Cerere înregistrată. Un administrator va reseta parola.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
