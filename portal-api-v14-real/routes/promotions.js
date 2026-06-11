const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM promotion_rules ORDER BY priority')
    res.json(result.recordset.map(r => ({
      ...r,
      conditions:   r.conditions_json    ? JSON.parse(r.conditions_json)    : [],
      actions:      r.actions_json       ? JSON.parse(r.actions_json)       : [],
      customer_ids: r.customer_ids_json  ? JSON.parse(r.customer_ids_json)  : [],
      conditions_json: undefined, actions_json: undefined, customer_ids_json: undefined,
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const r = req.body
    const id = 'pr_' + Date.now()
    await query(`
      INSERT INTO promotion_rules (
        id, name, description, rule_type, priority, is_active,
        valid_from, valid_until, customer_group,
        conditions_json, actions_json, cumulative, customer_ids_json
      ) VALUES (
        @id, @name, @desc, @type, @pri, @active,
        @from, @until, @cgroup,
        @cond, @act, @cumul, @cids
      )`, {
      id, name: r.name || 'Regulă nouă', desc: r.description || '',
      type:   r.rule_type    ,
      pri:    r.priority     || 10,
      active: r.activa !== false ? 1 : 0,
      from:   r.valid_from   || null,
      until:  r.valid_until  || null,
      cgroup: r.customer_group || null,
      cond:   JSON.stringify(r.conditions || []),
      act:    JSON.stringify(r.actions    || []),
      cumul:  r.cumulative   ? 1 : 0,
      cids:   r.customer_ids?.length ? JSON.stringify(r.customer_ids) : null,
    })
    res.status(201).json({ id, message: 'Promoție creată' })
  } catch (err) {
    console.error('POST /promotions error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const r = req.body
    await query(`
      UPDATE promotion_rules SET
        name          = COALESCE(@name, name),
        description   = COALESCE(@desc, description),
        rule_type     = COALESCE(@type, rule_type),
        priority      = COALESCE(@pri, priority),
        is_active     = @active,
        valid_from    = @from,
        valid_until   = @until,
        customer_group= @cgroup,
        conditions_json = COALESCE(@cond, conditions_json),
        actions_json    = COALESCE(@act,  actions_json),
        cumulative      = @cumul,
        customer_ids_json = @cids
      WHERE id = @id`, {
      id: req.params.id,
      name:   r.name          || null,
      desc:   r.description   || null,
      type:   r.rule_type     || null,
      pri:    r.priority      || null,
      active: r.activa !== false ? 1 : 0,
      from:   r.valid_from    || null,
      until:  r.valid_until   || null,
      cgroup: r.customer_group|| null,
      cond:   r.conditions    ? JSON.stringify(r.conditions) : null,
      act:    r.actions       ? JSON.stringify(r.actions)    : null,
      cumul:  r.cumulative    ? 1 : 0,
      cids:   r.customer_ids?.length ? JSON.stringify(r.customer_ids) : null,
    })
    res.json({ message: 'Promoție actualizată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM promotion_rules WHERE id=@id', { id: req.params.id })
    res.json({ message: 'Promoție ștearsă' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
