const router = require('express').Router()

// POST /api/anaf/validate — proxy ANAF tva check (avoids CORS from browser)
router.post('/validate', async (req, res) => {
  try {
    const { cui } = req.body
    if (!cui) return res.status(400).json({ error: 'CUI obligatoriu' })

    // Curăță CUI (elimină RO și spații)
    const cuiNum = String(cui).replace(/\s/g, '').replace(/^RO/i, '').trim()
    if (!/^\d{2,10}$/.test(cuiNum)) return res.status(400).json({ error: 'Format CUI invalid' })

    const today = new Date().toISOString().split('T')[0]
    const body = JSON.stringify([{ cui: parseInt(cuiNum), data: today }])

    let fetchFn
    try { fetchFn = require('node-fetch') } catch { fetchFn = global.fetch }

    const anafRes = await fetchFn('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!anafRes.ok) return res.status(502).json({ error: 'Serviciul ANAF nu este disponibil' })

    const data = await anafRes.json()
    const found = data?.found?.[0]

    if (!found) return res.json({ valid: false, error: 'CUI negăsit în baza ANAF' })

    res.json({
      valid: true,
      denumire: found.denumire || '',
      adresa: found.adresa || '',
      cui: found.cui,
      platitorTva: !!found.scpTVA,
      stare: found.stare || '',
      data_inregistrare: found.data_inregistrare || '',
    })
  } catch (err) {
    res.status(500).json({ error: 'Eroare la verificarea ANAF: ' + err.message })
  }
})

module.exports = router
