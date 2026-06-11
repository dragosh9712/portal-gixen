const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const email  = require('../emailService')

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      // Client vede DOAR firma lui
      if (!req.user.customerId) return res.json([])
      const result = await query(`SELECT * FROM customers WHERE id = @id`, { id: req.user.customerId })
      const c = result.recordset[0]
      if (!c) return res.json([])
      return res.json([{ ...c, marciPermise: c.marci_permise_json ? JSON.parse(c.marci_permise_json) : [] }])
    }
    const result = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM users u WHERE u.customer_id = c.id AND u.status != 'inactive') AS user_count
      FROM customers c
      ORDER BY c.created_at DESC
    `)
    res.json(result.recordset.map(c => ({ ...c, marciPermise: c.marci_permise_json ? JSON.parse(c.marci_permise_json) : [] })))
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
      INSERT INTO customers (id, name, cui, reg_com, address, phone, email, contact_name, contact_email, status, created_at)
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

    if (c.name !== undefined)     { fields.push('name = @name');           params.name = c.name }
    if (c.cui !== undefined)      { fields.push('cui = @cui');              params.cui = c.cui }
    if (c.status !== undefined)   { fields.push('status = @status');       params.status = c.status }
    if (c.currency !== undefined) { fields.push('currency = @currency');   params.currency = c.currency }
    if (c.customer_group !== undefined) { fields.push('customer_group = @cg'); params.cg = c.customer_group }
    if (c.agent_id !== undefined) { fields.push('agent_id = @agentId');    params.agentId = c.agent_id }
    if (c.address !== undefined)  { fields.push('address = @address');     params.address = c.address }
    if (c.phone !== undefined)    { fields.push('phone = @phone');         params.phone = c.phone }
    if (c.email !== undefined)    { fields.push('email = @email');         params.email = c.email }
    if (c.marciPermise !== undefined) {
      fields.push('marci_permise_json = @marci_json')
      params.marci_json = JSON.stringify(c.marciPermise || [])
    }
    if (c.paletizare_preferata !== undefined) {
      fields.push('paletizare_preferata = @palet')
      params.palet = c.paletizare_preferata || null
    }
    if (c.vizibilitate_produse !== undefined) {
      fields.push('vizibilitate_produse = @viz_prod')
      params.viz_prod = c.vizibilitate_produse || 'gixen_si_proprii'
    }

    if (fields.length > 0) {
      await query(`UPDATE customers SET ${fields.join(', ')} WHERE id = @id`, params)
    }

    if (c.status) {
      await query(
        `UPDATE users SET status = @status WHERE customer_id = @id`,
        { id: req.params.id, status: c.status }
      )

      // Trimite email la aprobare / respingere
      if (c.status === 'activ' || c.status === 'respinsa') {
        const uRes = await query(
          `SELECT u.email, u.name, cu.name AS firm_name
           FROM users u JOIN customers cu ON u.customer_id = cu.id
           WHERE u.customer_id = @id AND u.role = 'client'
           ORDER BY u.created_at ASC`, { id: req.params.id }
        )
        const u = uRes.recordset[0]
        if (u) {
          if (c.status === 'activ') {
            email.sendOnboardingApproved({ email: u.email, name: u.name, firmName: u.firm_name }).catch(() => {})
          } else {
            email.sendOnboardingRejected({ email: u.email, name: u.name, firmName: u.firm_name, motiv: c.rejection_reason || '' }).catch(() => {})
          }
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
    if (!ss.isConfigured()) return res.json({ ok: false, message: 'Selectsoft neconfigurat (.env: SELECTSOFT_URL, SELECTSOFT_TOKEN)' })

    await query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('customers') AND name='selectsoft_cod_parten')
      ALTER TABLE customers ADD selectsoft_cod_parten VARCHAR(64) NULL`)

    const result = await query('SELECT * FROM customers WHERE id = @id', { id: req.params.id })
    const c = result.recordset[0]
    if (!c) return res.status(404).json({ error: 'Client inexistent' })
    if (c.selectsoft_cod_parten) return res.json({ ok: true, message: 'Clientul există deja în Selectsoft', cod_parten: c.selectsoft_cod_parten })

    const data = await ss.insertPartener({
      partener: {
        denumire: c.name,
        cod_fiscal: c.cui || '',
        numar_registru_comert: c.reg_com || '',
        telefon: c.phone || '',
        client: true, furnizor: false, persoana_fizica: false,
        platitor_tva: true, tva_la_incasare: false,
        numar_zile_scadenta: 30,
      },
      adresa: { strada: c.address || '', localitate: '', cod_judet: '', id_tara: 'RO' },
      persoana_contact: { denumire: c.contact_name || c.name, telefon: c.phone || '', email: c.email || '' },
    })

    const codParten = data.result?.cod_parten || data.cod_parten
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

router.get('/:id/notes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureNotesTable()
    const result = await query('SELECT * FROM customer_notes WHERE customer_id = @id ORDER BY created_at DESC', { id: req.params.id })
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/notes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Textul notiței este obligatoriu' })
    await ensureNotesTable()
    const id = 'note_' + Date.now()
    await query('INSERT INTO customer_notes (id, customer_id, text, created_by) VALUES (@id, @cid, @text, @by)',
      { id, cid: req.params.id, text: text.trim(), by: req.user.name || req.user.email })
    res.status(201).json({ id, message: 'Notiță adăugată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id/notes/:noteId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureNotesTable()
    await query('DELETE FROM customer_notes WHERE id = @nid AND customer_id = @cid',
      { nid: req.params.noteId, cid: req.params.id })
    res.json({ message: 'Notiță ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
