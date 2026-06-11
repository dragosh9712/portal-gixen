const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /api/surveys — lista survey-uri cu întrebări
router.get('/', authenticateToken, async (req, res) => {
  try {
    const surveys = await query('SELECT * FROM surveys ORDER BY created_at DESC')
    for (const s of surveys.recordset) {
      const qs = await query(
        'SELECT * FROM survey_questions WHERE survey_id=@id ORDER BY sort_order',
        { id: s.id }
      )
      s.questions = qs.recordset
    }
    res.json(surveys.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/surveys — creare survey nou
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, trigger_on, questions } = req.body
    const id = await query(
      `INSERT INTO surveys (name, description, is_active, trigger_on)
       OUTPUT INSERTED.id
       VALUES (@name, @desc, 1, @trigger)`,
      { name, desc: description || '', trigger: trigger_on || 'first_login' }
    )
    const surveyId = id.recordset[0].id

    for (let i = 0; i < (questions || []).length; i++) {
      const q = questions[i]
      await query(`
        INSERT INTO survey_questions (survey_id, section, section_label, question_key, question_text, field_type, options_json, is_required, sort_order)
        VALUES (@sid, @sec, @sec_label, @qkey, @qtext, @ftype, @opts, @req, @sort)`, {
        sid:       surveyId,
        sec:       q.section       || null,
        sec_label: q.section_label || null,
        qkey:      q.question_key  || 'q_' + i,
        qtext:     q.question_text,
        ftype:     q.field_type    || 'text',
        opts:      q.options ? JSON.stringify(q.options) : null,
        req:       q.is_required ? 1 : 0,
        sort:      i,
      })
    }
    res.status(201).json({ id: surveyId, message: 'Survey creat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/surveys/:id — editare survey
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, is_active, trigger_on } = req.body
    await query(`UPDATE surveys SET name=@name, description=@desc, is_active=@active, trigger_on=@trigger WHERE id=@id`,
      { id: req.params.id, name, desc: description || '', active: is_active ? 1 : 0, trigger: trigger_on || 'first_login' })
    res.json({ message: 'Survey actualizat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/surveys/:id/questions — adăugare întrebare
router.post('/:id/questions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const q = req.body
    const count = await query('SELECT COUNT(*) AS c FROM survey_questions WHERE survey_id=@id', { id: req.params.id })
    const sort = count.recordset[0].c
    await query(`
      INSERT INTO survey_questions (survey_id, section, section_label, question_key, question_text, field_type, options_json, is_required, sort_order)
      VALUES (@sid, @sec, @sec_label, @qkey, @qtext, @ftype, @opts, @req, @sort)`, {
      sid:       req.params.id,
      sec:       q.section       || null,
      sec_label: q.section_label || null,
      qkey:      q.question_key  || 'q_' + Date.now(),
      qtext:     q.question_text,
      ftype:     q.field_type    || 'text',
      opts:      q.options ? JSON.stringify(q.options) : null,
      req:       q.is_required ? 1 : 0,
      sort,
    })
    res.status(201).json({ message: 'Întrebare adăugată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/surveys/questions/:qid — ștergere întrebare
router.delete('/questions/:qid', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM survey_questions WHERE id=@id', { id: req.params.qid })
    res.json({ message: 'Întrebare ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/surveys/results — rezultate completate
router.get('/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT sr.*, c.name AS customer_name, u.email AS user_email, s.name AS survey_name
      FROM survey_results sr
      JOIN customers c ON sr.customer_id = c.id
      JOIN users u ON sr.user_id = u.id
      JOIN surveys s ON sr.survey_id = s.id
      ORDER BY sr.completed_at DESC`)
    res.json(result.recordset.map(r => ({
      ...r,
      answers: typeof r.answers_json === 'string' ? JSON.parse(r.answers_json) : r.answers_json
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/surveys/:id/submit — client completează survey
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body
    const customerId = req.user.customerId
    if (!customerId) return res.status(400).json({ error: 'User fără firmă asociată' })

    // Upsert
    const existing = await query(
      'SELECT id FROM survey_results WHERE survey_id=@sid AND customer_id=@cid',
      { sid: req.params.id, cid: customerId }
    )
    if (existing.recordset.length > 0) {
      await query(
        'UPDATE survey_results SET answers_json=@ans, completed_at=SYSDATETIME() WHERE survey_id=@sid AND customer_id=@cid',
        { sid: req.params.id, cid: customerId, ans: JSON.stringify(answers) }
      )
    } else {
      await query(`
        INSERT INTO survey_results (survey_id, customer_id, user_id, answers_json)
        VALUES (@sid, @cid, @uid, @ans)`,
        { sid: req.params.id, cid: customerId, uid: req.user.id, ans: JSON.stringify(answers) }
      )
    }
    // Marchează clientul ca survey completat
    await query('UPDATE customers SET survey_completed=1 WHERE id=@id', { id: customerId })
    await query('UPDATE users SET first_login_done=1 WHERE id=@id', { id: req.user.id })

    res.json({ message: 'Survey completat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
