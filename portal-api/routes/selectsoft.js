const router = require('express').Router()
const { query } = require('../db')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const ss = require('../selectsoftService')

// GET /api/selectsoft/test — verifică conexiunea și tokenul
router.get('/test', authenticateToken, requireAdmin, async (req, res) => {
  if (!ss.isConfigured()) {
    return res.json({ ok: false, error: 'SELECTSOFT_URL / SELECTSOFT_TOKEN lipsesc din .env' })
  }
  try {
    const data = await ss.getParteneri({ limit: 1 })
    res.json({ ok: true, message: 'Conexiune Selectsoft OK', totalParteneri: data.totalRezultate ?? null, url: process.env.SELECTSOFT_URL })
  } catch (err) {
    res.json({ ok: false, error: err.message, url: process.env.SELECTSOFT_URL })
  }
})

// POST /api/selectsoft/sync-products — trage produsele + stocul din Selectsoft
// Match după products.selectsoft_cod (sau code). Produsele noi din SS se creează inactive,
// pentru a fi revizuite de admin (UoM, imagini, prețuri de listă).
router.post('/sync-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let offset = 0
    const limit = 200
    let updated = 0, created = 0, skipped = 0
    const updatedList = [], createdList = []
    const errors = []

    while (true) {
      const data = await ss.getProduse({ limit, offset })
      const produse = data.produse || []
      if (produse.length === 0) break

      // Filtre configurabile via env — exclude materii prime, deșeuri etc.
      const excludePrefixes = (process.env.SELECTSOFT_EXCLUDE_NAME_PREFIXES || 'MP ').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      const excludeKeywords = (process.env.SELECTSOFT_EXCLUDE_KEYWORDS || 'deseu,deșeu,deseuri,deșeuri,rebut').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      const includeGroups   = (process.env.SELECTSOFT_INCLUDE_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean)

      function isExcluded(p) {
        const name = (p.denumire || '').toLowerCase()
        if (excludePrefixes.some(pr => name.startsWith(pr))) return true
        if (excludeKeywords.some(kw => name.includes(kw))) return true
        if (includeGroups.length > 0 && !includeGroups.includes(p.grupa)) return true
        return false
      }

      // Grupează după cod — ia MAX(pret_van) per produs (dacă SS returnează variante)
      const byCode = new Map()
      let skippedFilter = 0
      for (const p of produse) {
        if (p.fsinc) { skipped++; continue }
        if (isExcluded(p)) { skippedFilter++; skipped++; continue }
        const cod = String(p.cod)
        if (!byCode.has(cod)) { byCode.set(cod, p) }
        else {
          const prev = byCode.get(cod)
          if (parseFloat(p.pret_van) > parseFloat(prev.pret_van)) byCode.set(cod, p)
        }
      }

      for (const p of byCode.values()) {
        try {
          const existing = await query(
            'SELECT id, fsinc_pret FROM products WHERE selectsoft_cod = @cod OR code = @cod',
            { cod: String(p.cod) }
          )

          if (existing.recordset[0]) {
            const prod = existing.recordset[0]
            await query(
              `UPDATE products SET selectsoft_cod = @cod, updated_at = SYSDATETIME() WHERE id = @id`,
              { id: prod.id, cod: String(p.cod) }
            )
            const pret = parseFloat(p.pret_van)
            if (!prod.fsinc_pret && pret > 0) {
              await query(
                `UPDATE product_prices SET base_price = @price WHERE product_id = @id AND is_active = 1`,
                { id: prod.id, price: pret }
              )
            }
            updated++
            updatedList.push(`${p.cod} — ${p.denumire || ''}`)
          } else {
            const id = 'p_ss_' + p.cod
            await query(`
              INSERT INTO products (id, code, name, barcode, marca, brand, um, selectsoft_cod, is_active)
              VALUES (@id, @code, @name, @barcode, 'Gixen', NULL, @um, @cod, 0)`, {
              id, code: String(p.cod), name: p.denumire || ('Produs SS ' + p.cod),
              barcode: p.cod_produs || null, um: p.um || 'BUC', cod: String(p.cod),
            })
            const pret = parseFloat(p.pret_van)
            if (pret > 0) {
              await query(
                'INSERT INTO product_prices (product_id, base_price, is_active) VALUES (@id, @price, 1)',
                { id, price: pret }
              )
            }
            created++
            createdList.push(`${p.cod} — ${p.denumire || ''}`)
          }
        } catch (e) { errors.push(`${p.cod}: ${e.message}`) }
      }

      if (produse.length < limit) break
      offset += limit
    }

    res.json({
      ok: true,
      message: `Sincronizare produse: ${updated} actualizate, ${created} create (inactive, de revizuit), ${skipped} excluse (${skippedFilter} filtrate MP/deșeuri)`,
      updated, created, skipped, skippedFilter,
      updatedList, createdList,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/selectsoft/sync-customers — leagă clienții portal de partenerii Selectsoft
// Match după CUI (tax_id ↔ cod_fiscal, ignorând prefixul RO).
router.post('/sync-customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let offset = 0
    const limit = 100
    let matched = 0, unmatched = 0
    const matchedList = [], unmatchedList = []
    const errors = []
    const normalize = cf => String(cf || '').replace(/\s/g, '').replace(/^RO/i, '')

    const customersResult = await query('SELECT id, name, tax_id FROM customers WHERE tax_id IS NOT NULL')
    const byCui = new Map()
    for (const c of customersResult.recordset) {
      const k = normalize(c.tax_id)
      if (k) byCui.set(k, c)
    }

    while (true) {
      const data = await ss.getParteneri({ limit, offset })
      const parteneri = data.parteneri || []
      if (parteneri.length === 0) break

      for (const p of parteneri) {
        try {
          const cui = normalize(p.cod_fiscal)
          const cust = cui && byCui.get(cui)
          if (cust) {
            await query(
              'UPDATE customers SET selectsoft_cod_parten = @cod WHERE id = @id',
              { id: cust.id, cod: String(p.cod_parten) }
            )
            matched++
            matchedList.push(`${cust.name} (CUI ${p.cod_fiscal}) ↔ SS #${p.cod_parten}`)
          } else {
            unmatched++
            if (unmatchedList.length < 100) unmatchedList.push(`${p.denumire || '?'} (CUI ${p.cod_fiscal || '—'}) SS #${p.cod_parten}`)
          }
        } catch (e) { errors.push(`${p.cod_parten}: ${e.message}`) }
      }

      if (parteneri.length < limit) break
      offset += limit
    }

    res.json({
      ok: true,
      message: `Sincronizare clienți: ${matched} legați de Selectsoft, ${unmatched} parteneri SS fără cont în portal`,
      matched, unmatched,
      matchedList, unmatchedList,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/selectsoft/import-history — import istoric complet din Selectsoft
// Trage toate documentele de vânzare (facturi) cu liniile lor și le salvează ca
// orders + order_lines în portal. Idempotent: documentele deja importate
// (id = 'o_ss_<nr_intern>') sunt sărite, deci poate fi rulat de mai multe ori.
//
// Body (toate opționale):
//   din_data: 'YYYYMMDD'  — implicit ultimii 2 ani
//   la_data:  'YYYYMMDD'  — implicit azi
//   createMissingCustomers: true — creează în portal partenerii SS care nu există
//                                  (status 'inactiv', fără cont de utilizator)
router.post('/import-history', authenticateToken, requireAdmin, async (req, res) => {
  // Importul poate dura minute — răspundem la final, dar logăm progresul în consolă
  req.setTimeout(30 * 60 * 1000)
  try {
    const opts = req.body || {}
    const today = new Date()
    const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())
    const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '')
    const din_data = opts.din_data || fmt(twoYearsAgo)
    const la_data  = opts.la_data  || fmt(today)
    const normalize = cf => String(cf || '').replace(/\s/g, '').replace(/^RO/i, '')

    const stats = {
      documentsImported: 0, documentsSkipped: 0, documentsNoCustomer: 0,
      linesImported: 0, linesNoProduct: 0,
      customersCreated: 0,
      errors: [],
    }

    // ── 1. Hărți de potrivire: CUI → customer, cod_parten → customer, selectsoft_cod → product ──
    const custRes = await query('SELECT id, tax_id, selectsoft_cod_parten FROM customers')
    const custByCui = new Map()
    const custByCodParten = new Map()
    for (const c of custRes.recordset) {
      const k = normalize(c.tax_id)
      if (k) custByCui.set(k, c.id)
      if (c.selectsoft_cod_parten) custByCodParten.set(String(c.selectsoft_cod_parten), c.id)
    }

    const prodRes = await query('SELECT id, code, selectsoft_cod, um FROM products')
    const prodByCod = new Map()
    for (const p of prodRes.recordset) {
      if (p.selectsoft_cod) prodByCod.set(String(p.selectsoft_cod), p)
      if (p.code) prodByCod.set(String(p.code), p)
    }

    // ── 2. Opțional: creează clienții lipsă din parteneri SS ──
    if (opts.createMissingCustomers) {
      let offset = 0
      const limit = 100
      while (true) {
        const data = await ss.getParteneri({ limit, offset })
        const parteneri = data.parteneri || []
        if (parteneri.length === 0) break
        for (const p of parteneri) {
          try {
            const cui = normalize(p.cod_fiscal)
            const codParten = String(p.cod_parten)
            if ((cui && custByCui.has(cui)) || custByCodParten.has(codParten)) continue
            if (!p.denumire) continue
            const id = 'cust_ss_' + codParten
            await query(`
              IF NOT EXISTS (SELECT 1 FROM customers WHERE id = @id)
              INSERT INTO customers (id, name, tax_id, trade_register_no, phone, email,
                address, locality, county, status, selectsoft_cod_parten, created_at)
              VALUES (@id, @name, @cui, @regCom, @phone, @email,
                @address, @locality, @county, 'inactiv', @codParten, GETDATE())`, {
              id, name: p.denumire, cui: p.cod_fiscal || '',
              regCom: p.numar_registru_comert || '', phone: p.telefon || '', email: p.email || '',
              address: p.adresa || p.strada || '', locality: p.localitate || '', county: p.judet || p.cod_judet || '',
              codParten,
            })
            if (cui) custByCui.set(cui, id)
            custByCodParten.set(codParten, id)
            stats.customersCreated++
          } catch (e) { stats.errors.push(`partener ${p.cod_parten}: ${e.message}`) }
        }
        if (parteneri.length < limit) break
        offset += limit
      }
      console.log(`[SS import] Parteneri: ${stats.customersCreated} clienți creați`)
    }

    // ── 3. Documente de vânzare, paginat ──
    // data SS poate veni 'YYYYMMDD' sau 'YYYY-MM-DD' — normalizăm la 'YYYY-MM-DD'
    const toDate = s => {
      const str = String(s || '').replace(/-/g, '')
      if (str.length < 8) return null
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
    }

    let offset = 0
    const limit = 50
    while (true) {
      const data = await ss.getDocumente({ limit, offset, din_data, la_data, de_vanzare: true })
      const documente = data.documente || data.rezultate || []
      if (documente.length === 0) break

      for (const doc of documente) {
        try {
          const nrIntern = doc.nr_intern ?? doc.nrIntern
          if (!nrIntern) { stats.documentsSkipped++; continue }
          const orderId = 'o_ss_' + nrIntern

          // Idempotent — sare documentele deja importate
          const exists = await query('SELECT id FROM orders WHERE id = @id', { id: orderId })
          if (exists.recordset[0]) { stats.documentsSkipped++; continue }

          // Identifică clientul: cod_parten apoi CUI
          const codParten = doc.cod_parten != null ? String(doc.cod_parten) : null
          const cui = normalize(doc.cod_fiscal)
          const customerId = (codParten && custByCodParten.get(codParten)) || (cui && custByCui.get(cui)) || null
          if (!customerId) { stats.documentsNoCustomer++; continue }

          // Liniile documentului
          let pozitii = []
          try {
            const pozData = await ss.getPozitiiDocument(nrIntern)
            pozitii = pozData.pozitii || pozData.rezultate || []
          } catch (e) {
            stats.errors.push(`pozitii doc ${nrIntern}: ${e.message}`)
          }

          // Totaluri: din document dacă există, altfel din linii
          let netTotal = parseFloat(doc.valoare ?? doc.val_fara_tva ?? 0) || 0
          let tvaTotal = parseFloat(doc.val_tva ?? doc.tva ?? 0) || 0
          if (!netTotal && pozitii.length) {
            netTotal = pozitii.reduce((s, l) => s + (parseFloat(l.valoare ?? 0) || (parseFloat(l.cantitate ?? 0) * parseFloat(l.pret ?? l.pret_vanzare ?? 0))), 0)
            tvaTotal = Math.round(netTotal * 0.21 * 100) / 100
          }
          const grossTotal = Math.round((netTotal + tvaTotal) * 100) / 100

          const nrDoc = doc.nr_doc ?? doc.numar ?? String(nrIntern)
          const dataDoc = toDate(doc.data ?? doc.data_doc) || new Date().toISOString().slice(0, 10)

          await query(`
            INSERT INTO orders (id, order_number, customer_id, user_id, status, order_date,
              payment_type, transport_type, observations, currency, tva_rate,
              net_total, tva_total, gross_total, total_discount, delivery_address, invoice_number)
            VALUES (@id, @nr, @cid, NULL, 'livrata', @date,
              'OP', 'Van', @obs, 'RON', 21.00,
              @net, @tva, @gross, 0, '', @inv)`, {
            id: orderId,
            nr: 'SS-' + nrDoc,
            cid: customerId,
            date: dataDoc,
            obs: `Import istoric Selectsoft — ${doc.tip_doc || 'document'} ${nrDoc} [SS:${nrIntern}]`,
            net: Math.round(netTotal * 100) / 100,
            tva: Math.round(tvaTotal * 100) / 100,
            gross: grossTotal,
            inv: String(nrDoc),
          })

          let lineNo = 0
          for (const l of pozitii) {
            lineNo++
            const cod = String(l.cod ?? l.cod_intern ?? '')
            const prod = prodByCod.get(cod)
            if (!prod) { stats.linesNoProduct++; continue }
            const qty = parseFloat(l.cantitate ?? 0) || 0
            const price = parseFloat(l.pret ?? l.pret_vanzare ?? l.pu ?? 0) || 0
            const lineTotal = parseFloat(l.valoare ?? 0) || Math.round(qty * price * 100) / 100
            const lineTva = parseFloat(l.val_tva ?? 0) || Math.round(lineTotal * 0.21 * 100) / 100
            await query(`
              INSERT INTO order_lines (order_id, product_id, uom_code, line_number,
                quantity, unit_price, unit_price_with_tva, line_total, line_tva, line_total_with_tva)
              VALUES (@oid, @pid, @ucode, @ln, @qty, @up, @upvat, @lt, @ltva, @ltvat)`, {
              oid: orderId, pid: prod.id, ucode: l.um || prod.um || 'BUC', ln: lineNo,
              qty, up: price,
              upvat: Math.round(price * 1.21 * 100) / 100,
              lt: lineTotal, ltva: lineTva,
              ltvat: Math.round((lineTotal + lineTva) * 100) / 100,
            })
            stats.linesImported++
          }

          stats.documentsImported++
          if (stats.documentsImported % 50 === 0) {
            console.log(`[SS import] ${stats.documentsImported} documente importate...`)
          }
        } catch (e) {
          stats.errors.push(`doc ${doc.nr_intern}: ${e.message}`)
        }
      }

      if (documente.length < limit) break
      offset += limit
    }

    console.log(`[SS import] Finalizat:`, JSON.stringify(stats))
    res.json({
      ok: true,
      message: `Import istoric: ${stats.documentsImported} documente importate, ` +
        `${stats.documentsSkipped} sărite (deja importate), ` +
        `${stats.documentsNoCustomer} fără client în portal, ` +
        `${stats.linesImported} linii (${stats.linesNoProduct} linii fără produs în portal)` +
        (stats.customersCreated ? `, ${stats.customersCreated} clienți creați` : ''),
      din_data, la_data,
      ...stats,
      errors: stats.errors.slice(0, 30),
    })
  } catch (err) {
    console.error('[SS import] Eroare:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// GET /api/selectsoft/product-groups — listează grupele/subgrupele distincte din SS (calibrare filtre)
router.get('/product-groups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const groups = new Map()
    let offset = 0
    while (true) {
      const data = await ss.getProduse({ limit: 200, offset })
      const produse = data.produse || []
      if (produse.length === 0) break
      for (const p of produse) {
        const key = `${p.grupa || '(fără grupă)'}|||${p.subgrupa || ''}`
        groups.set(key, (groups.get(key) || 0) + 1)
      }
      if (produse.length < 200) break
      offset += 200
    }
    const result = [...groups.entries()]
      .map(([k, count]) => { const [grupa, subgrupa] = k.split('|||'); return { grupa, subgrupa, count } })
      .sort((a, b) => b.count - a.count)
    res.json({ ok: true, total: result.reduce((s, r) => s + r.count, 0), groups: result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
