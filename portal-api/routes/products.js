const router = require('express').Router()
const { query, sql } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

let pbfColEnsured = false
async function ensurePrivateBrandColumn() {
  if (pbfColEnsured) return
  try {
    await query(`
      IF COL_LENGTH('products', 'private_brand_firm_id') IS NULL
        ALTER TABLE products ADD private_brand_firm_id VARCHAR(64) NULL;
    `)
    // Normalizare valori corupte ('public,public', 'privat,privat' etc.)
    await query(`UPDATE products SET vizibilitate = 'public' WHERE vizibilitate LIKE 'public%' AND vizibilitate <> 'public'`)
    await query(`UPDATE products SET vizibilitate = 'privat' WHERE vizibilitate LIKE 'privat%' AND vizibilitate <> 'privat'`)
    pbfColEnsured = true
  } catch (e) { console.error('ensurePrivateBrandColumn:', e.message) }
}

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensurePrivateBrandColumn()
    const { marca, categorie, active_only, search } = req.query
    let where = 'WHERE 1=1'
    // Clients never see inactive products; admins control via active_only param
    if (req.user.role === 'client' || active_only !== 'false') where += ' AND p.is_active = 1'
    if (marca)    where += ' AND p.marca = @marca'
    if (categorie) where += ' AND p.categorie = @categorie'
    if (search)   where += ' AND (p.name LIKE @search OR p.code LIKE @search OR p.brand LIKE @search)'

    const params = {}
    if (marca)    params.marca    = marca
    if (categorie) params.categorie = categorie
    if (search)   params.search  = `%${search}%`
    if (req.user.role === 'client' && req.user.customerId) {
      try {
        const clientResult = await query(
          'SELECT vizibilitate_produse FROM customers WHERE id = @cid',
          { cid: req.user.customerId }
        )
        const client = clientResult.recordset[0]
        const viz = (client?.vizibilitate_produse || 'gixen_si_proprii').trim()
        params.clientFirmId = req.user.customerId
        if (viz === 'doar_proprii') {
          // Doar produsele proprii ale firmei (many-to-many sau single-owner)
          where += ` AND (
            p.private_brand_firm_id = @clientFirmId
            OR p.id IN (SELECT product_id FROM product_client_access WHERE customer_id = @clientFirmId AND is_active = 1)
          )`
        } else {
          // gixen_si_proprii: produse publice Gixen (fără proprietar) + produse asociate clientului
          where += ` AND (
            (
              (p.vizibilitate IS NULL OR p.vizibilitate LIKE 'public%')
              AND (p.private_brand_firm_id IS NULL OR p.private_brand_firm_id = '')
              AND p.id NOT IN (SELECT product_id FROM product_client_access WHERE is_active = 1)
            )
            OR p.private_brand_firm_id = @clientFirmId
            OR p.id IN (SELECT product_id FROM product_client_access WHERE customer_id = @clientFirmId AND is_active = 1)
          )`
        }
      } catch (e) {
        console.error('Product filter error:', e.message)
        // Fail-closed: dacă filtrul nu poate fi aplicat, clientul nu vede produse private
        where += " AND (p.vizibilitate IS NULL OR p.vizibilitate LIKE 'public%')"
      }
    }

    const result = await query(`
      SELECT p.*,
        (SELECT TOP 1 pp.base_price FROM product_prices pp
         WHERE pp.product_id = p.id AND pp.is_active = 1) AS active_base_price,
        (SELECT uom_code, uom_name, coeficient, is_orderable, is_offer_display, sort_order
         FROM product_uom WHERE product_id = p.id
         FOR JSON PATH) AS uom_json,
        (SELECT id, base_price, valid_from, valid_until, is_active, created_at
         FROM product_prices WHERE product_id = p.id ORDER BY created_at DESC
         FOR JSON PATH) AS prices_json
      FROM products p ${where}
      ORDER BY p.marca, p.brand, p.name
    `, params)

    const products = result.recordset.map(p => ({
      ...p,
      activ:          p.is_active ? 1 : 0,
      cod:            p.code || '',
      pretBaza:       parseFloat(p.active_base_price) || 0,
      stoc:           p.stoc != null ? Number(p.stoc) : 0,
      imagine:        p.image_url || null,
      tierPricing:    [],
      product_uom:    p.uom_json    ? JSON.parse(p.uom_json)    : [],
      product_prices: p.prices_json ? JSON.parse(p.prices_json) : [],
      uom_json: undefined, prices_json: undefined,
    }))
    res.json(products)
  } catch (err) {
    console.error('GET /products error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE id = @id', { id: req.params.id })
    if (!result.recordset[0]) return res.status(404).json({ error: 'Produs inexistent' })
    const uom    = await query('SELECT * FROM product_uom    WHERE product_id = @id ORDER BY sort_order', { id: req.params.id })
    const prices = await query('SELECT * FROM product_prices WHERE product_id = @id ORDER BY created_at DESC', { id: req.params.id })
    res.json({ ...result.recordset[0], product_uom: uom.recordset, product_prices: prices.recordset })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products — creare produs nou
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const p  = req.body
    const id = 'p_' + Date.now()

    await query(`
      INSERT INTO products (
        id, code, barcode, name, categorie, product_type, white_color_type,
        marca, brand, label_brand, private_brand_firm_id,
        weight, height, diameter,
        default_uom_id, rolls_per_pack, packs_per_pallet_van, packs_per_pallet_truck,
        location_id, selectsoft_cod, um, image_url, is_active
      ) VALUES (
        @id, @code, @barcode, @name, @categorie, @product_type, @white_color_type,
        @marca, @brand, @label_brand, @private_brand_firm_id,
        @weight, @height, @diameter,
        @default_uom_id, @rolls_per_pack, @packs_per_pallet_van, @packs_per_pallet_truck,
        @location_id, @selectsoft_cod, @um, @image_url, 1
      )`, {
      id,
      code:                 p.code        || p.cod        || null,
      barcode:              p.barcode                     || null,
      name:                 p.name,
      categorie:            p.categorie                   || null,
      product_type:         p.product_type                || 'P2',
      white_color_type:     p.white_color_type            || 'A',
      marca:                p.marca                       || 'Gixen',
      brand:                p.brand       || p.label_brand|| null,
      label_brand:          p.label_brand || p.brand      || null,
      private_brand_firm_id:p.private_brand_firm_id       || null,
      weight:               p.specs?.weight || p.weight   || null,
      height:               p.specs?.height || p.height   || null,
      diameter:             p.specs?.diameter|| p.diameter|| null,
      default_uom_id:       p.default_uom_id              || 2,
      rolls_per_pack:       p.rolls_per_pack              || 6,
      packs_per_pallet_van: p.packs_per_pallet_van        || 44,
      packs_per_pallet_truck:p.packs_per_pallet_truck     || 56,
      location_id:          p.location_id                 || null,
      selectsoft_cod:       p.selectsoft_cod|| p.cod      || null,
      um:                   p.um                          || 'BUC',
      image_url:            p.image_url || p.imagine      || null,
    })

    // UoM auto-generate
    const rpb = p.rolls_per_pack       || 6
    const ppv = p.packs_per_pallet_van  || 44
    const ppt = p.packs_per_pallet_truck|| 56
    const uoms = [
      { uom_id: 1, code: 'ROLA',         name: 'Rolă',           coef: 1           },
      { uom_id: 2, code: 'BAX',           name: 'Bax',            coef: rpb         },
      { uom_id: 3, code: 'PALET_DUBA',   name: 'Palet (Duba)',   coef: rpb * ppv   },
      { uom_id: 4, code: 'PALET_CAMION', name: 'Palet (Camion)', coef: rpb * ppt   },
    ]
    for (let i = 0; i < uoms.length; i++) {
      const u = uoms[i]
      await query(`
        INSERT INTO product_uom (product_id, uom_id, uom_code, uom_name, coeficient, sort_order, is_orderable, is_offer_display)
        VALUES (@pid, @uid, @code, @name, @coef, @sort, 1, 1)`,
        { pid: id, uid: u.uom_id, code: u.code, name: u.name, coef: u.coef, sort: i + 1 })
    }

    // Preț de bază
    const basePrice = parseFloat(p.base_price || p.pretBaza || 0)
    if (basePrice > 0) {
      await query(
        'INSERT INTO product_prices (product_id, base_price, is_active) VALUES (@pid, @price, 1)',
        { pid: id, price: basePrice }
      )
    }

    res.status(201).json({ id, message: 'Produs creat cu succes' })
  } catch (err) {
    console.error('POST /products error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/products/:id — actualizare produs
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const p = req.body
    await query(`
      UPDATE products SET
        code                  = @code,
        barcode               = @barcode,
        name                  = @name,
        categorie             = @categorie,
        product_type          = @product_type,
        marca                 = @marca,
        brand                 = @brand,
        label_brand           = @label_brand,
        private_brand_firm_id = @pbfid,
        vizibilitate          = COALESCE(@vizibilitate, vizibilitate),
        rolls_per_pack        = @rpb,
        packs_per_pallet_van  = @ppv,
        packs_per_pallet_truck= @ppt,
        location_id           = @location_id,
        selectsoft_cod        = @ss_cod,
        fsinc                 = @fsinc,
        fsinc_stoc            = @fsinc_stoc,
        fsinc_pret            = @fsinc_pret,
        image_url             = COALESCE(@image_url, image_url),
        specs_json            = @specs_json,
        datasheet_url         = @datasheet_url,
        is_active             = @active,
        updated_at            = SYSDATETIME()
      WHERE id = @id`, {
      id:          req.params.id,
      code:        p.code        || p.cod  || null,
      barcode:     p.barcode                || null,
      name:        p.name,
      categorie:   p.categorie              || null,
      product_type:p.product_type           || 'P2',
      marca:       p.marca                  || 'Gixen',
      brand:       p.brand                  || null,
      label_brand: p.label_brand            || null,
      pbfid:       p.private_brand_firm_id  || null,
      vizibilitate: p.vizibilitate === 'privat' ? 'privat' : (p.vizibilitate ? 'public' : null),
      rpb:         p.rolls_per_pack         || 6,
      ppv:         p.packs_per_pallet_van   || 44,
      ppt:         p.packs_per_pallet_truck || 56,
      location_id: p.location_id            || null,
      ss_cod:      p.selectsoft_cod         || null,
      fsinc:       p.fsinc      ? 1 : 0,
      fsinc_stoc:  p.fsinc_stoc ? 1 : 0,
      fsinc_pret:  p.fsinc_pret ? 1 : 0,
      image_url:    p.image_url || p.imagine || null,
      specs_json:   p.specs_json ? (typeof p.specs_json === 'string' ? p.specs_json : JSON.stringify(p.specs_json)) : null,
      datasheet_url: p.datasheet_url || null,
      active:       p.activ !== false ? 1 : 0,
    })
    res.json({ message: 'Produs actualizat' })
  } catch (err) {
    console.error('PUT /products error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products/:id/selectsoft
router.post('/:id/selectsoft', authenticateToken, requireAdmin, async (req, res) => {
  res.json({ success: false, message: 'Disponibil după integrarea API SelectSoft' })
})

// ── Asocieri produse ↔ clienți (product_client_access) ──

// GET /api/products/:id/clients — listează clienții asociați
router.get('/:id/clients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT pca.id, pca.customer_id, pca.is_active, c.name AS customer_name
      FROM product_client_access pca
      JOIN customers c ON c.id = pca.customer_id
      WHERE pca.product_id = @pid`, { pid: req.params.id })
    res.json(result.recordset)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/products/:id/clients — adaugă un client asociat
router.post('/:id/clients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { customer_id } = req.body
    if (!customer_id) return res.status(400).json({ error: 'customer_id obligatoriu' })
    const exists = await query(
      'SELECT id FROM product_client_access WHERE product_id=@pid AND customer_id=@cid',
      { pid: req.params.id, cid: customer_id })
    if (exists.recordset[0]) {
      await query('UPDATE product_client_access SET is_active=1 WHERE product_id=@pid AND customer_id=@cid',
        { pid: req.params.id, cid: customer_id })
    } else {
      await query(`INSERT INTO product_client_access (customer_id, product_id, access_type, is_active)
        VALUES (@cid, @pid, 'full', 1)`, { pid: req.params.id, cid: customer_id })
    }
    // Marchează produsul ca privat
    await query(`UPDATE products SET vizibilitate='privat' WHERE id=@pid`, { pid: req.params.id })
    res.status(201).json({ message: 'Client asociat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/products/:id/clients/:customerId — elimină asocierea
router.delete('/:id/clients/:customerId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await query('UPDATE product_client_access SET is_active=0 WHERE product_id=@pid AND customer_id=@cid',
      { pid: req.params.id, cid: req.params.customerId })
    // Dacă nu mai are clienți asociați, marchează produsul ca public
    const remaining = await query(
      'SELECT id FROM product_client_access WHERE product_id=@pid AND is_active=1', { pid: req.params.id })
    if (remaining.recordset.length === 0) {
      await query(`UPDATE products SET vizibilitate='public', private_brand_firm_id=NULL WHERE id=@pid`, { pid: req.params.id })
    }
    res.json({ message: 'Asociere eliminată' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
