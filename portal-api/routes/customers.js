const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const emailSvc = require('../emailService')

// Asigură coloanele de vizibilitate produse (o singură dată per proces)
let visColsEnsured = false
async function ensureVisibilityColumns() {
  if (visColsEnsured) return
  try {
    // vede_gixen and brand_propriu may already exist from earlier migration
    await query(`IF COL_LENGTH('customers','vede_gixen') IS NULL ALTER TABLE customers ADD vede_gixen BIT NOT NULL DEFAULT 1`)
    await query(`IF COL_LENGTH('customers','brand_propriu') IS NULL ALTER TABLE customers ADD brand_propriu NVARCHAR(100) NULL`)
    visColsEnsured = true
  } catch (e) { console.error('ensureVisibilityColumns:', e.message) }
}

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensureVisibilityColumns()
    const result = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM users u WHERE u.customer_id = c.id AND u.status != 'inactive') AS user_count
      FROM customers c
      ORDER BY c.created_at DESC
    `)
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM customers WHERE id = @id`, { id: req.params.id })
    if (!result.recordset[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.recordset[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const c = req.body
    const id = 'cust_' + Date.now()
    await query(`
      INSERT INTO customers (id, name, tax_id, trade_register_no, address, phone, email, contact_name, contact_email, status, created_at)
      VALUES (@id, @name, @cui, @regCom, @adresa, @telefon, @email, @contactName, @contactEmail, 'in_aprobare', GETDATE())
    `, { id, name: c.name, cui: c.cui || '', regCom: c.regCom || '', adresa: c.adresa || '', telefon: c.telefon || '', email: c.email || '', contactName: c.contact_name || '', contactEmail: c.contact_email || '' })

    if (c.password && c.contact_email) {
      const hash = await bcrypt.hash(c.password, 10)
      const userId = 'usr_' + Date.now()
      await query(`
        INSERT INTO users (id, email, password_hash, role, customer_id, status, created_at)
        VALUES (@id, @email, @hash, 'client', @custId, 'activ', GETDATE())
      `, { id: userId, email: c.contact_email, hash, custId: id })
    }

    res.status(201).json({ id, message: 'Client creat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/customers/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const c = req.body
    const fields = []
    const params = { id: req.params.id }

    if (c.name !== undefined)       { fields.push('name = @name');                   params.name = c.name }
    if (c.status !== undefined)     { fields.push('status = @status');               params.status = c.status }
    if (c.currency !== undefined)   { fields.push('currency = @currency');           params.currency = c.currency }
    if (c.customer_group !== undefined) { fields.push('customer_group = @cg');       params.cg = c.customer_group }
    if (c.agent_id !== undefined)   { fields.push('agent_id = @agentId');            params.agentId = c.agent_id }

    const taxId = c.tax_id ?? c.cui
    if (taxId !== undefined)        { fields.push('tax_id = @taxId');                params.taxId = taxId }

    const regCom = c.trade_register_no ?? c.regCom ?? c.reg_com
    if (regCom !== undefined)       { fields.push('trade_register_no = @regCom');   params.regCom = regCom }

    const phone = c.phone ?? c.telefon
    if (phone !== undefined)        { fields.push('phone = @phone');                 params.phone = phone }

    const address = c.address ?? c.adresa
    if (address !== undefined)      { fields.push('address = @address');             params.address = address }

    if (c.email !== undefined)      { fields.push('email = @email');                 params.email = c.email }
    if (c.locality !== undefined)   { fields.push('locality = @locality');           params.locality = c.locality }
    if (c.county !== undefined)     { fields.push('county = @county');               params.county = c.county }

    if (c.global_discount !== undefined) { fields.push('global_discount = @gd');    params.gd = parseFloat(c.global_discount) || 0 }
    if (c.platitor_tva !== undefined)    { fields.push('platitor_tva = @ptva');      params.ptva = c.platitor_tva ? 1 : 0 }
    if (c.default_transport_type !== undefined) { fields.push('default_transport_type = @dtt'); params.dtt = c.default_transport_type }

    const marci = c.marciPermise ?? c.marci_permise_json ?? c.allowed_brands
    if (marci !== undefined) {
      const marciStr = Array.isArray(marci) ? JSON.stringify(marci) : marci
      fields.push('allowed_brands = @marci')
      params.marci = marciStr
    }

    if (c.vede_gixen !== undefined)    { fields.push('vede_gixen = @vg');       params.vg = c.vede_gixen ? 1 : 0 }
    if (c.brand_propriu !== undefined) { fields.push('brand_propriu = @bp');    params.bp = c.brand_propriu || null }

    if (fields.length > 0) {
      await query(`UPDATE customers SET ${fields.join(', ')} WHERE id = @id`, params)
    }

    // Keep users.email in sync when customer email changes
    if (c.email !== undefined) {
      await query('UPDATE users SET email = @email WHERE customer_id = @id AND delegate_type = \'primary\'', { email: c.email, id: req.params.id })
    }

    if (c.status) {
      await query(
        `UPDATE users SET status = @status WHERE customer_id = @id`,
        { id: req.params.id, status: c.status }
      )
      // Send onboarding emails on status change
      const custResult = await query('SELECT name, email FROM customers WHERE id=@id', { id: req.params.id })
      const cust = custResult.recordset[0]
      if (cust) {
        if (c.status === 'activ') {
          emailSvc.sendOnboardingApproved(cust.email, cust.name).catch(() => {})
        } else if (c.status === 'respinsa') {
          emailSvc.sendOnboardingRejected(cust.email, cust.name, c.rejection_reason || '').catch(() => {})
        }
      }
    }

    res.json({ message: 'Actualizat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/customers/:id/selectsoft — creează partenerul în Selectsoft
router.post('/:id/selectsoft', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ss = require('../selectsoftService')
    if (!ss.isConfigured()) return res.json({ ok: false, message: 'Selectsoft neconfigurat (.env)' })

    const result = await query('SELECT * FROM customers WHERE id = @id', { id: req.params.id })
    const c = result.recordset[0]
    if (!c) return res.status(404).json({ error: 'Client inexistent' })
    if (c.selectsoft_cod_parten) return res.json({ ok: true, message: 'Clientul există deja în Selectsoft', cod_parten: c.selectsoft_cod_parten })

    const data = await ss.insertPartener({
      partener: {
        denumire: c.name,
        cod_fiscal: c.tax_id || '',
        numar_registru_comert: c.trade_register_no || '',
        telefon: c.phone || '',
        client: true, furnizor: false, persoana_fizica: false,
        platitor_tva: !!c.platitor_tva, tva_la_incasare: false,
        numar_zile_scadenta: 30,
      },
      adresa: {
        strada: c.address || '',
        localitate: c.locality || '',
        cod_judet: c.county || '',
        id_tara: 'RO',
      },
      persoana_contact: {
        denumire: c.name,
        telefon: c.phone || '',
        email: c.email || '',
      },
    })

    const codParten = data.result?.cod_parten
    if (codParten) {
      await query('UPDATE customers SET selectsoft_cod_parten = @cod WHERE id = @id',
        { id: req.params.id, cod: String(codParten) })
    }
    res.json({ ok: true, message: 'Client creat în Selectsoft', cod_parten: codParten })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

// POST /api/customers/:id/delegate
router.post('/:id/delegate', authenticateToken, async (req, res) => {
  try {
    const d = req.body
    const userId = 'usr_' + Date.now()
    let hash = null
    if (d.password) hash = await bcrypt.hash(d.password, 10)
    await query(`
      INSERT INTO users (id, email, password_hash, role, customer_id, status, created_at, first_name, last_name, phone)
      VALUES (@id, @email, @hash, 'client', @custId, 'activ', GETDATE(), @firstName, @lastName, @phone)
    `, {
      id: userId,
      email: d.email,
      hash: hash || '',
      custId: req.params.id,
      firstName: d.first_name || d.firstName || '',
      lastName: d.last_name || d.lastName || '',
      phone: d.phone || '',
    })
    res.status(201).json({ id: userId, message: 'Delegat adăugat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Notițe client (preofertări, observații interne) ──────────────────────────
async function ensureNotesTable() {
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='customer_notes')
    CREATE TABLE customer_notes (
      id          VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64) NOT NULL,
      text        NVARCHAR(MAX) NOT NULL,
      created_by  NVARCHAR(255),
      created_at  DATETIME2 DEFAULT SYSDATETIME()
    )`)
}

// GET /api/customers/:id/notes
router.get('/:id/notes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureNotesTable()
    const result = await query(
      'SELECT * FROM customer_notes WHERE customer_id = @id ORDER BY created_at DESC',
      { id: req.params.id }
    )
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/customers/:id/notes
router.post('/:id/notes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Textul notiței este obligatoriu' })
    await ensureNotesTable()
    const id = 'note_' + Date.now()
    await query(
      'INSERT INTO customer_notes (id, customer_id, text, created_by) VALUES (@id, @cid, @text, @by)',
      { id, cid: req.params.id, text: text.trim(), by: req.user.name || req.user.email }
    )
    res.status(201).json({ id, message: 'Notiță adăugată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/customers/:id/notes/:noteId
router.delete('/:id/notes/:noteId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureNotesTable()
    await query('DELETE FROM customer_notes WHERE id = @nid AND customer_id = @cid',
      { nid: req.params.noteId, cid: req.params.id })
    res.json({ message: 'Notiță ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/customers/:id/delegates
router.get('/:id/delegates', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, first_name, last_name, phone, status, created_at
      FROM users
      WHERE customer_id = @id AND role = 'client'
      ORDER BY created_at DESC
    `, { id: req.params.id })
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
