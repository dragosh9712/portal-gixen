import { lei, fmtDate } from '../utils'

export default function ExportCSV({ orders, firms, products, filename = 'comenzi' }) {
  function handleExport() {
    const rows = []
    rows.push([
      'Nr. Comandă', 'Client', 'CUI', 'Data Comandă', 'Status',
      'Data Livrare Confirmată', 'Șofer', 'Nr. Mașină', 'Adresă Livrare',
      'Nr. Aviz', 'Nr. Factură', 'Total (lei)', 'Produse', 'Cantități'
    ].join(','))

    orders.forEach(o => {
      const firm = firms.find(f => f.id === o.firmId)
      const t = o.transport || {}
      const d = o.documente || {}
      const produse = o.lines.map(l => products.find(p => p.id === l.productId)?.name || l.productId).join(' | ')
      const cantitati = o.lines.map(l => `${l.cantitate} ${products.find(p => p.id === l.productId)?.unitate || ''}`).join(' | ')

      rows.push([
        o.nr,
        `"${firm?.name || ''}"`,
        firm?.cui || '',
        o.dataComanda || '',
        o.status,
        t.dataLivrareConfirmata || '',
        `"${t.sofer || ''}"`,
        t.nrMasina || '',
        `"${o.adresaLivrare || firm?.adresa || ''}"`,
        d.nrAviz || '',
        d.nrFactura || o.nrFactura || '',
        o.total.toFixed(2),
        `"${produse}"`,
        `"${cantitati}"`
      ].join(','))
    })

    const csv = '\uFEFF' + rows.join('\n') // BOM for Excel Romanian chars
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Export CSV">
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v10M6 9l4 4 4-4M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Export CSV
    </button>
  )
}
