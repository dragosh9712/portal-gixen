// Selectsoft API client — config din .env:
//   SELECTSOFT_URL=http://localhost:6081
//   SELECTSOFT_TOKEN=<token>
// API-ul Selectsoft folosește POST pe toate endpoint-urile, cu token în header.

function isConfigured() {
  return !!(process.env.SELECTSOFT_URL && process.env.SELECTSOFT_TOKEN)
}

async function ssCall(endpoint, body = {}) {
  if (!isConfigured()) throw new Error('Selectsoft neconfigurat — setați SELECTSOFT_URL și SELECTSOFT_TOKEN în .env')
  const url = process.env.SELECTSOFT_URL.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': process.env.SELECTSOFT_TOKEN,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Selectsoft HTTP ${res.status}: ${data.message || ''}`)
    if (data.success === false) throw new Error(data.message || 'Selectsoft a returnat success=false')
    return data
  } finally {
    clearTimeout(timer)
  }
}

// ── Wrappers per endpoint ─────────────────────────────────────────────────────

// Produse — paginat, câmpuri selectate
const getProduse = (opts = {}) => ssCall('produse', {
  limit: opts.limit ?? 200,
  offset: opts.offset ?? 0,
  campuri: opts.campuri ?? 'cod,denumire,pret_van,k_tva,cod_produs,um,fsinc,fsinc_stoc,fsinc_pret,grupa,subgrupa',
  ...(opts.cod ? { cod: opts.cod } : {}),
})

// Stoc — doar produse cu stoc > 0
const getStoc = (opts = {}) => ssCall('stoc', {
  doarStoc: opts.doarStoc ?? true,
  limit: opts.limit ?? 200,
  offset: opts.offset ?? 0,
  campuri: opts.campuri ?? 'cod,cod_produs,stoc,pu_ref,fsinc,fsinc_stoc,fsinc_pret',
  ...(opts.cod ? { cod: opts.cod } : {}),
  ...(opts.stocPeGestiuni ? { stocPeGestiuni: true } : {}),
})

// Parteneri — paginat sau după cod fiscal
const getParteneri = (opts = {}) => ssCall('parteneri', {
  limit: opts.limit ?? 100,
  offset: opts.offset ?? 0,
  ...(opts.cod_fiscal ? { cod_fiscal: opts.cod_fiscal } : {}),
})

// Insert partener nou (persoană juridică / client B2B)
const insertPartener = ({ partener, adresa, persoana_contact }) =>
  ssCall('insertPartener', { partener, adresa, persoana_contact })

// Insert comandă (PJ / PF)
const insertComanda = ({ comanda, client }) => ssCall('insertcom', { comanda, client })

// Documente — istoric facturi/comenzi (filtru pe cod_fiscal, interval date)
const getDocumente = (opts = {}) => ssCall('documente', {
  limit: opts.limit ?? 50,
  offset: opts.offset ?? 0,
  ...(opts.cod_fiscal ? { cod_fiscal: opts.cod_fiscal } : {}),
  ...(opts.din_data ? { din_data: opts.din_data } : {}),
  ...(opts.la_data ? { la_data: opts.la_data } : {}),
  ...(opts.de_vanzare ? { de_vanzare: true, doar_iesiri: true } : {}),
  ...(opts.campuri ? { campuri: opts.campuri } : {}),
})

// Poziții document (liniile)
const getPozitiiDocument = nr_intern => ssCall('pozitiiDocument', { nr_intern })

// Restanțe (documente neachitate sau achitate parțial)
// Filtre conform doc API v1.7: lst_nr_intern, lst_nr_comanda, campuri
const getRestante = (opts = {}) => ssCall('restdoc', {
  ...(opts.lst_nr_intern  ? { lst_nr_intern:  opts.lst_nr_intern }  : {}),
  ...(opts.lst_nr_comanda ? { lst_nr_comanda: opts.lst_nr_comanda } : {}),
  ...(opts.campuri        ? { campuri:        opts.campuri }        : {}),
})

// Înregistrare încasare pe un document (stinge proforma/factura)
const insertIncasari = incasari => ssCall('insertincas', { incasari })

// Gestiuni & subunități
const getGestiuni   = () => ssCall('gestiuni', {})
const getSubunitati = () => ssCall('subunitati', {})

// Update document (sursa + externalData — folosit pentru a marca comenzile din portal)
const updateDocument = ({ nr_intern, sursa, externalData }) =>
  ssCall('updateDocument', { nr_intern, sursa, externalData })

module.exports = {
  isConfigured,
  ssCall,
  getProduse,
  getStoc,
  getParteneri,
  insertPartener,
  insertComanda,
  getDocumente,
  getPozitiiDocument,
  getRestante,
  insertIncasari,
  getGestiuni,
  getSubunitati,
  updateDocument,
}
