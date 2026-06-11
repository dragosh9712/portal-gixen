const router = require('express').Router()
const { query, sql } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { marca, categorie, active_only, search } = req.query
    let where = 'WHERE 1=1'
    if (active_only !== 'false') where += ' AND p.is_active = 1'
    if (marca)    where += ' AND p.marca = @marca'
    if (categorie) where += ' AND p.categorie = @categorie'
    if (search)   where += ' AND (p.name LIKE @search OR p.code LIKE @search OR p.brand LIKE @search)'

    const params = {}
    if (marca)    params.marca    = marca
    if (categorie) params.categorie = categorie
    if (search)   params.search  = `%${search}%`
    if (req.user.role === 'client' && req.user.customerId) {
      // Model nou de vizibilitate: produse Gixen (fără private_brand_firm_id) + produse proprii.
      // Niciodată produsele private ale altui client.
      let vizMode = 'gixen_si_proprii'
      try {
        const cr = await query('SELECT vizibilitate_produse FROM customers WHERE id = @cid', { cid: req.user.customerId })
        if (cr.recordset[0]?.vizibilitate_produse) vizMode = cr.recordset[0].vizibilitate_produse
      } catch { /* coloana poate lipsi → default */ }

      params.cid = req.user.customerId
      if (vizMode === 'doar_proprii') {
        where += ` AND p.private_brand_firm_id = @cid`
      } else if (vizMode === 'gixen_only') {
        where += ` AND p.private_brand_firm_id IS NULL`
      } else {
        // gixen_si_proprii
        where += ` AND (p.private_brand_firm_id IS NULL OR p.private_brand_firm_id = @cid)`
      }
    }

    let result
    try {
      result = await query(`
        SELECT p.*,
          ISNULL(p.vizibilitate, 'public') AS vizibilitate,
          (SELECT TOP 1 pp.base_price FROM product_prices pp
           WHERE pp.product_id = p.id AND pp.is_active = 1) AS active_base_price,
          (SELECT uom_code, uom_name, coeficient, is_orderable, is_offer_display, sort_order
           FROM product_uom WHERE product_id = p.id
           FOR JSON PATH) AS uom_json,
          (SELECT id, base_price, base_price_tva, cost_productie, adaos_percent, valid_from, valid_until, is_active, created_at
           FROM product_prices WHERE product_id = p.id ORDER BY created_at DESC
           FOR JSON PATH) AS prices_json
        FROM products p ${where}
        ORDER BY p.marca, p.brand, p.name
      `, params)
    } catch (_extendedCols) {
      // Fallback: columns cost_productie/adaos_percent may not exist yet
      result = await query(`
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
    }

    const products = result.recordset.map(p => ({
      ...p,
      activ:          p.is_active ? 1 : 0,
      imagine:        p.image_url || null,
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
        marca, brand, label_brand, private_brand_firm_id, vizibilitate,
        weight, height, diameter,
        default_uom_id, rolls_per_pack, packs_per_pallet_van, packs_per_pallet_truck,
        location_id, selectsoft_cod, um, image_url, is_active
      ) VALUES (
        @id, @code, @barcode, @name, @categorie, @product_type, @white_color_type,
        @marca, @brand, @label_brand, @private_brand_firm_id, @viz,
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
      viz:                  p.vizibilitate                || 'public',
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
      try {
        await query(
          'INSERT INTO product_prices (product_id, base_price, cost_productie, adaos_percent, is_active) VALUES (@pid, @price, @cost, @adaos, 1)',
          { pid: id, price: basePrice, cost: parseFloat(p.cost_productie) || null, adaos: parseFloat(p.adaos_percent) || null }
        )
      } catch (_extCols) {
        // Fallback if cost_productie/adaos_percent columns don't exist yet
        await query(
          'INSERT INTO product_prices (product_id, base_price, is_active) VALUES (@pid, @price, 1)',
          { pid: id, price: basePrice }
        )
      }
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
    const str = v => (v == null ? null : String(v))
    const putParams = {
      id:          str(req.params.id),
      code:        str(p.code || p.cod) || null,
      barcode:     str(p.barcode) || null,
      name:        str(p.name || p.denumire || ''),
      categorie:   str(p.categorie) || null,
      product_type:str(p.product_type) || 'P2',
      marca:       str(p.marca) || 'Gixen',
      brand:       str(p.brand) || null,
      label_brand: str(p.label_brand) || null,
      viz:         str(p.vizibilitate) || 'public',
      pbfid:       str(p.private_brand_firm_id) || null,
      rpb:         parseInt(p.rolls_per_pack) || 6,
      ppv:         parseInt(p.packs_per_pallet_van) || 44,
      ppt:         parseInt(p.packs_per_pallet_truck) || 56,
      location_id: str(p.location_id) || null,
      ss_cod:      str(p.selectsoft_cod) || null,
      image_url:   str(p.image_url || p.imagine) || null,
      // Ștergere explicită imagine: frontend trimite image_clear=true sau image_url='' / null explicit
      image_clear: (p.image_clear === true || p.image_url === '' || p.image_url === null || p.imagine === '' || p.imagine === null) ? 1 : 0,
      active:      p.activ !== false ? 1 : 0,
    }
    try {
      // Try full update including optional columns that may not exist yet
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
          vizibilitate          = @viz,
          private_brand_firm_id = @pbfid,
          rolls_per_pack        = @rpb,
          packs_per_pallet_van  = @ppv,
          packs_per_pallet_truck= @ppt,
          location_id           = @location_id,
          selectsoft_cod        = @ss_cod,
          fsinc                 = @fsinc,
          fsinc_stoc            = @fsinc_stoc,
          fsinc_pret            = @fsinc_pret,
          image_url             = CASE WHEN @image_clear = 1 THEN NULL ELSE COALESCE(@image_url, image_url) END,
          is_active             = @active,
          updated_at            = SYSDATETIME()
        WHERE id = @id`, {
        ...putParams,
        fsinc:      p.fsinc      ? 1 : 0,
        fsinc_stoc: p.fsinc_stoc ? 1 : 0,
        fsinc_pret: p.fsinc_pret ? 1 : 0,
      })
    } catch (_fullUpdate) {
      // Fallback: skip columns that may not exist (fsinc*, updated_at, vizibilitate, private_brand_firm_id)
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
          rolls_per_pack        = @rpb,
          packs_per_pallet_van  = @ppv,
          packs_per_pallet_truck= @ppt,
          location_id           = @location_id,
          selectsoft_cod        = @ss_cod,
          image_url             = CASE WHEN @image_clear = 1 THEN NULL ELSE COALESCE(@image_url, image_url) END,
          is_active             = @active
        WHERE id = @id`, putParams)
    }
    res.json({ message: 'Produs actualizat' })
  } catch (err) {
    console.error('PUT /products error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products/:id/prices — adaugă preț nou
router.post('/:id/prices', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const p = req.body
    const basePrice = parseFloat(p.base_price) || 0
    if (!basePrice) return res.status(400).json({ error: 'Prețul de vânzare este obligatoriu' })
    const cost  = p.cost_productie  != null ? parseFloat(p.cost_productie)  : null
    const adaos = p.adaos_percent   != null ? parseFloat(p.adaos_percent)   : null
    const tva   = Math.round(basePrice * 0.21 * 10000) / 10000
    // Dezactivează prețul activ anterior
    await query(`UPDATE product_prices SET is_active = 0 WHERE product_id = @pid AND is_active = 1`, { pid: req.params.id })
    const pool = await require('../db').getPool()
    const { sql } = require('../db')
    const r = pool.request()
    r.input('pid',    sql.NVarChar, req.params.id)
    r.input('price',  sql.Decimal(10,4), basePrice)
    r.input('tva',    sql.Decimal(10,4), tva)
    r.input('cost',   sql.Decimal(10,4), cost)
    r.input('adaos',  sql.Decimal(10,4), adaos)
    r.input('from',   sql.NVarChar, p.valid_from  || null)
    r.input('until',  sql.NVarChar, p.valid_until || null)
    let result
    try {
      result = await r.query(`
        INSERT INTO product_prices (product_id, base_price, base_price_tva, cost_productie, adaos_percent, valid_from, valid_until, is_active)
        OUTPUT INSERTED.id
        VALUES (@pid, @price, @tva, @cost, @adaos, @from, @until, 1)
      `)
    } catch (_) {
      // fallback dacă base_price_tva, cost_productie, adaos_percent nu există
      const r2 = pool.request()
      r2.input('pid',   sql.NVarChar, req.params.id)
      r2.input('price', sql.Decimal(10,4), basePrice)
      r2.input('from',  sql.NVarChar, p.valid_from  || null)
      r2.input('until', sql.NVarChar, p.valid_until || null)
      result = await r2.query(`
        INSERT INTO product_prices (product_id, base_price, valid_from, valid_until, is_active)
        OUTPUT INSERTED.id
        VALUES (@pid, @price, @from, @until, 1)
      `)
    }
    const newId = result.recordset[0]?.id
    res.status(201).json({ id: newId, base_price: basePrice, base_price_tva: tva, cost_productie: cost, adaos_percent: adaos, is_active: true, message: 'Preț adăugat' })
  } catch (err) {
    console.error('POST /products/:id/prices error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/products/:id/price/:priceId — actualizare preț existent
router.put('/:id/price/:priceId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const p = req.body
    const basePrice = parseFloat(p.base_price) || 0
    const cost  = p.cost_productie != null ? parseFloat(p.cost_productie)  : null
    const adaos = p.adaos_percent  != null ? parseFloat(p.adaos_percent)   : null
    const tva   = Math.round(basePrice * 0.21 * 10000) / 10000
    const pool = await require('../db').getPool()
    const { sql } = require('../db')
    const r = pool.request()
    r.input('id',     sql.Int,         parseInt(req.params.priceId))
    r.input('pid',    sql.NVarChar,    req.params.id)
    r.input('price',  sql.Decimal(10,4), basePrice)
    r.input('tva',    sql.Decimal(10,4), tva)
    r.input('cost',   sql.Decimal(10,4), cost)
    r.input('adaos',  sql.Decimal(10,4), adaos)
    r.input('active', sql.Bit,         p.is_active ? 1 : 0)
    r.input('from',   sql.NVarChar,    p.valid_from  || null)
    r.input('until',  sql.NVarChar,    p.valid_until || null)
    try {
      await r.query(`UPDATE product_prices SET base_price=@price, base_price_tva=@tva, cost_productie=@cost, adaos_percent=@adaos, is_active=@active, valid_from=@from, valid_until=@until WHERE id=@id AND product_id=@pid`)
    } catch (_) {
      await r.query(`UPDATE product_prices SET base_price=@price, is_active=@active, valid_from=@from, valid_until=@until WHERE id=@id AND product_id=@pid`)
    }
    res.json({ message: 'Preț actualizat' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/products/:id/selectsoft
router.post('/:id/selectsoft', authenticateToken, requireAdmin, async (req, res) => {
  res.json({ success: false, message: 'Disponibil după integrarea API SelectSoft' })
})

module.exports = router
