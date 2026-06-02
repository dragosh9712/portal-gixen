import { useState, useRef, useEffect } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { calculeazaCos } from '../promoEngine.js'
import { lei, calcLinePrice } from '../utils'

const TVA = 0.21

const GIXEN_INFO = {
  name: 'Gixen SRL', cui: 'RO46291658', regCom: 'J40/12345/2020',
  adresa: 'Str. Exemplu nr. 1, București', email: 'contact@gixen.ro',
  telefon: '+40 700 000 000', iban: 'RO49BTRL1234567890', banca: 'Banca Transilvania',
}


const GIXEN_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 83.56 49.28" style="max-width:52mm;height:auto;display:block;margin:0 auto 3px"><path fill="#21376c" d="M59.89,34.59h.07c.24-.34.54-.68.91-1.01.37-.33.78-.62,1.25-.87.47-.25.99-.46,1.55-.61.57-.16,1.17-.23,1.8-.23s1.19.07,1.76.2c.56.14,1.08.35,1.55.64.47.29.88.67,1.24,1.13.36.47.64,1.02.85,1.65.12.36.19.74.23,1.16.04.41.06.9.06,1.45v10.76h-4.06v-10.14c0-.44-.02-.82-.05-1.14-.04-.32-.09-.6-.19-.84-.2-.53-.51-.9-.93-1.13-.42-.23-.92-.34-1.51-.34-.79,0-1.54.19-2.27.56-.72.37-1.36.91-1.92,1.62v11.42h-4.06v-16.57h3.36l.37,2.3ZM48.21,35.02c-.51,0-.97.09-1.37.28-.4.19-.74.44-1.03.77-.29.33-.52.71-.69,1.14-.18.43-.29.89-.34,1.38h6.52c0-.49-.06-.95-.2-1.38-.13-.43-.32-.81-.58-1.14-.26-.33-.58-.58-.96-.77-.39-.19-.83-.28-1.34-.28ZM49.84,46.02c.79,0,1.61-.08,2.46-.23.86-.16,1.72-.39,2.6-.68v3.22c-.52.23-1.33.44-2.41.65-1.08.2-2.21.3-3.37.3s-2.29-.15-3.35-.46c-1.05-.3-1.97-.79-2.77-1.46-.79-.67-1.41-1.55-1.88-2.62-.46-1.07-.7-2.37-.7-3.9s.22-2.82.65-3.95c.43-1.13,1.02-2.06,1.75-2.8.73-.74,1.56-1.3,2.51-1.67.94-.37,1.92-.55,2.92-.55s2.02.16,2.91.48c.88.32,1.65.82,2.3,1.5.65.68,1.15,1.56,1.51,2.63.36,1.08.54,2.35.54,3.82-.01.57-.03,1.05-.05,1.45h-10.87c.06.77.23,1.42.51,1.97.29.54.65.99,1.12,1.33.46.34,1,.59,1.61.74.62.16,1.28.23,2,.23ZM33.49,43.1l-4.28,5.76h-4.65l6.55-8.45-6.15-8.12h4.77l3.87,5.47,3.94-5.47h4.79l-6.33,8.11,6.51,8.47h-4.74l-4.26-5.76ZM21.07,32.29h4.06v16.57h-4.06v-16.57ZM72.28,45.23c.2-3.55.23-6.62.92-10.03,2.64-13.1,10.35-13.09,10.36-22.3,0-7.81-7.18-14.47-15.62-12.57-3.99.9-6.64,3.29-8.29,6.04-.89,1.49-1.58,3.42-1.73,5.47-.12,1.68.2,4.97,1.03,6.06l.88-1.5,1.95.69-.24,1.46c0,.7-.07.19.12.42.39.36.98-.52,1.84-.7.22.48.9,1.09,1.19,1.53-.28.76-1.89,1.65-.52,1.82h1.4s.31,2.09.31,2.09l-1.15.44c.14.17.04.08.28.22,2.55,1.47,6.15,1.73,8.96.78.58-.2.61-.6.92-1.11,1.03-1.7,3.45-3.79,5.3-4.77-.26.31-.82.77-1.14,1.07-5.66,5.2-7.21,13.49-7,21,.03,1.18.27,2.9.24,3.89ZM69.79,8.21c3.03-.76,5.46,1.48,5.97,3.81.66,2.99-1.42,5.48-3.85,5.99-4.61.96-7.73-4.17-5.15-7.81.72-1.02,1.59-1.63,3.02-1.99ZM49.19,26.57h.44l.84,2.12h.02l.86-2.12h.44l-1.67,4.02h-.44l.58-1.37-1.06-2.64ZM49.06,26.93h-.03c-.1,0-.21,0-.31.03-.1.02-.2.05-.28.09-.09.04-.17.09-.24.14-.07.06-.13.12-.18.2v1.88h-.44v-2.7h.34l.09.43h0c.04-.07.1-.13.16-.19.06-.06.13-.11.21-.16.08-.05.17-.08.26-.11.1-.03.19-.04.3-.04.02,0,.04,0,.06,0,.02,0,.04,0,.05,0v.42ZM46.89,27.92c0,.21-.03.41-.09.58-.06.17-.15.32-.26.45-.11.12-.25.22-.4.29-.16.07-.33.1-.53.1s-.38-.03-.54-.1c-.16-.07-.29-.16-.4-.29-.11-.12-.19-.27-.25-.45-.06-.17-.09-.37-.09-.58s.03-.41.09-.58c.06-.17.15-.32.26-.45.11-.13.25-.22.4-.29.16-.07.34-.1.53-.1s.38.03.54.1c.16.07.29.16.4.29.11.13.19.27.25.45.06.17.09.37.09.58ZM46.43,27.92c0-.17-.02-.32-.06-.44-.04-.13-.1-.24-.17-.33-.07-.09-.16-.16-.26-.2-.1-.05-.21-.07-.33-.07s-.23.02-.33.07c-.1.05-.19.11-.26.2-.07.09-.13.2-.17.33-.04.13-.06.28-.06.44s.02.31.06.44c.04.13.1.24.17.33.07.09.16.16.26.2.1.05.21.07.33.07s.23-.02.33-.07c.1-.05.19-.11.26-.2.07-.09.13-.2.17-.33.04-.13.06-.28.06-.44ZM43.89,29.27s-.1.03-.17.04c-.08.01-.17.02-.28.02-.14,0-.26-.02-.37-.05-.1-.03-.19-.09-.26-.15-.07-.07-.12-.14-.15-.24-.03-.09-.05-.2-.05-.31v-1.64h-.52v-.38h.52v-.74h.44v.74h.81v.38h-.81v1.57c0,.06,0,.12.03.17.02.05.05.1.09.14.04.04.09.07.15.09.06.02.13.03.22.03.06,0,.12,0,.19-.01.06,0,.13-.02.18-.04v.37ZM41.06,26.5c.13,0,.26.01.37.04.12.03.22.07.31.11v.36c-.12-.04-.23-.08-.33-.1-.1-.02-.2-.03-.31-.03-.11,0-.22.02-.33.05-.11.04-.2.1-.29.18-.09.08-.15.19-.21.33-.05.14-.08.3-.08.5,0,.15.02.28.06.4.04.12.1.23.17.32.08.09.17.16.29.21.12.05.25.08.4.08.11,0,.22-.01.33-.03.11-.02.22-.06.33-.1v.36s-.07.04-.13.06c-.05.02-.11.03-.17.05-.06.01-.13.03-.2.03-.07,0-.14.01-.21.01-.18,0-.35-.03-.52-.08-.16-.05-.3-.14-.42-.25-.12-.11-.22-.26-.29-.43-.07-.17-.1-.38-.1-.62,0-.18.02-.34.06-.48.04-.14.09-.27.15-.37.06-.11.14-.2.23-.28.09-.08.18-.14.28-.19.1-.05.2-.08.3-.1.1-.02.21-.03.3-.03ZM38.62,28.08c-.08-.02-.18-.04-.29-.07-.11-.02-.23-.03-.37-.03-.19,0-.33.04-.44.12-.11.08-.16.2-.16.37,0,.08.01.16.04.22.03.06.06.11.11.16.05.04.1.07.16.09.06.02.13.03.2.03.09,0,.18-.01.26-.04.08-.03.15-.06.22-.1.06-.04.12-.08.16-.11.05-.04.08-.07.1-.09v-.54ZM38.64,28.97h-.01s-.08.09-.14.14c-.06.04-.12.08-.19.12-.07.04-.15.06-.24.08-.08.02-.18.03-.27.03-.13,0-.25-.02-.36-.06-.11-.04-.2-.1-.28-.17-.08-.07-.14-.17-.18-.27-.04-.11-.07-.23-.07-.37s.02-.26.07-.36c.05-.11.12-.2.2-.27.09-.07.19-.13.31-.17.12-.04.26-.06.41-.06.14,0,.27.01.39.04.12.02.23.05.32.09h.01v-.19c0-.07,0-.14-.01-.2,0-.06-.03-.11-.05-.15-.05-.09-.13-.17-.24-.23-.11-.06-.25-.09-.44-.09-.14,0-.26.01-.38.04-.12.03-.24.06-.36.1v-.37s.1-.04.16-.06c.06-.02.13-.04.2-.05.07-.01.14-.03.22-.03.08,0,.15-.01.23-.01.27,0,.5.05.67.14.17.1.3.22.38.38.03.06.05.13.06.2.01.07.02.15.02.24v1.8h-.37l-.05-.3ZM36.78,25.5c-.06-.01-.12-.02-.19-.03-.07,0-.13,0-.18,0-.1,0-.19.01-.26.04-.08.02-.14.06-.2.12-.05.05-.09.13-.12.21-.03.09-.04.19-.04.32v.41h.8v.38h-.8v2.32h-.44v-2.32h-.47v-.38h.47v-.41c0-.19.03-.36.08-.49.05-.13.12-.24.21-.33.09-.09.2-.15.32-.19.12-.04.25-.06.4-.06.09,0,.17,0,.25.01.08,0,.13.02.17.03v.37ZM33.58,26.93h-.03c-.1,0-.21,0-.31.03-.1.02-.19.05-.28.09-.09.04-.17.09-.24.14-.07.06-.13.12-.18.2v1.88h-.44v-2.7h.34l.09.43h0c.04-.07.1-.13.16-.19.06-.06.13-.11.21-.16.08-.05.17-.08.26-.11.09-.03.19-.04.3-.04.02,0,.04,0,.06,0,.02,0,.04,0,.05,0v.42ZM30.48,28.96c.15,0,.28-.01.4-.03.12-.02.24-.06.36-.1v.36c-.1.05-.22.08-.36.11-.14.03-.29.04-.46.04-.19,0-.37-.02-.54-.07-.17-.05-.32-.13-.44-.24-.12-.11-.22-.25-.29-.43-.07-.18-.1-.39-.1-.64s.03-.46.1-.64c.07-.18.16-.33.27-.45.11-.12.24-.21.39-.27.15-.06.3-.09.46-.09.15,0,.29.03.42.08.13.05.25.13.34.24.1.11.17.25.23.42.05.17.08.38.08.61v.06s0,.05,0,.11h-1.87c0,.17.03.32.08.44.05.12.12.22.21.29.09.07.2.13.32.16.12.03.25.05.39.05ZM30.25,26.88c-.1,0-.2.02-.29.06-.09.04-.16.09-.23.16-.06.07-.12.15-.16.24-.04.09-.06.19-.07.29h1.38c0-.11-.01-.21-.04-.3-.03-.09-.07-.17-.12-.24-.05-.07-.12-.12-.2-.16-.08-.04-.17-.06-.27-.06ZM28.5,27.89c0,.19-.02.35-.06.5-.04.14-.09.27-.15.38-.06.11-.13.2-.21.27-.08.07-.17.13-.25.18-.09.04-.18.08-.27.1-.09.02-.18.03-.26.03-.17,0-.31-.03-.43-.08-.12-.05-.23-.13-.33-.24h0v1.57h-.43v-4.02h.33l.09.31h0s.06-.07.1-.11c.04-.04.09-.07.16-.11.07-.04.14-.08.24-.11.09-.03.19-.05.3-.05.15,0,.3.03.44.08.14.05.27.13.37.24.11.11.2.25.26.43.07.18.1.39.1.64ZM28.04,27.9c0-.16-.02-.3-.05-.42-.03-.12-.08-.23-.15-.32-.07-.09-.15-.16-.25-.2-.1-.05-.21-.07-.34-.07-.09,0-.17.01-.25.04-.07.02-.14.06-.2.09-.06.04-.11.08-.16.12-.04.04-.08.08-.11.12v1.41c.09.09.2.17.32.23.12.06.25.08.38.08.08,0,.17-.02.27-.05.09-.03.18-.09.26-.17.08-.08.14-.19.2-.33.05-.14.08-.31.08-.53ZM24.82,28.08c-.08-.02-.18-.04-.29-.07-.11-.02-.23-.03-.37-.03-.19,0-.33.04-.44.12-.11.08-.16.2-.16.37,0,.08.01.16.04.22.03.06.06.11.11.16.05.04.1.07.16.09.06.02.13.03.2.03.09,0,.18-.01.26-.04.08-.03.15-.06.22-.1.06-.04.12-.08.16-.11.04-.04.08-.07.1-.09v-.54ZM24.85,28.97h-.01s-.08.09-.14.14c-.06.04-.12.08-.19.12-.07.04-.15.06-.24.08-.09.02-.18.03-.27.03-.13,0-.25-.02-.36-.06-.11-.04-.2-.1-.28-.17-.08-.07-.14-.17-.18-.27-.04-.11-.07-.23-.07-.37s.02-.26.07-.36c.05-.11.12-.2.2-.27.09-.07.19-.13.31-.17.12-.04.26-.06.41-.06.14,0,.27.01.39.04.12.02.23.05.32.09h.01v-.19c0-.07,0-.14-.01-.2,0-.06-.03-.11-.05-.15-.05-.09-.13-.17-.24-.23-.11-.06-.25-.09-.44-.09-.14,0-.26.01-.38.04-.12.03-.24.06-.36.1v-.37s.1-.04.16-.06c.06-.02.13-.04.2-.05.07-.01.14-.03.22-.03.08,0,.15-.01.23-.01.27,0,.5.05.67.14.17.1.3.22.38.38.03.06.05.13.06.2.01.07.02.15.02.24v1.8h-.37l-.05-.3ZM22.57,27.89c0,.19-.02.35-.06.5-.04.14-.09.27-.15.38-.06.11-.13.2-.21.27-.08.07-.17.13-.25.18-.09.04-.18.08-.27.1-.09.02-.18.03-.26.03-.17,0-.31-.03-.43-.08-.12-.05-.23-.13-.33-.24h0v1.57h-.43v-4.02h.33l.09.31h0s.06-.07.1-.11c.04-.04.09-.07.16-.11.07-.04.14-.08.24-.11.09-.03.19-.05.3-.05.15,0,.3.03.44.08.14.05.27.13.37.24.11.11.2.25.26.43.06.18.1.39.1.64ZM22.11,27.9c0-.16-.02-.3-.05-.42-.03-.12-.08-.23-.15-.32-.07-.09-.15-.16-.25-.2-.1-.05-.21-.07-.34-.07-.09,0-.17.01-.25.04-.07.02-.14.06-.2.09-.06.04-.11.08-.16.12-.04.04-.08.08-.11.12v1.41c.09.09.2.17.32.23.12.06.25.08.38.08.08,0,.17-.02.27-.05.09-.03.18-.09.26-.17.08-.08.14-.19.2-.33.05-.14.08-.31.08-.53ZM56.31,17.05l.02,1.73-.97.39c-.52-.26-.82-.73-1.28-1.01-.41.15-.65.47-.94.67l.85,1.58-.62.79-1.73-.24c-.16.42-.32.72-.36,1.21l1.39.73-.06,1.16c-.44.09-1.29.35-1.59.62l.2,1.11,1.68.02.46.99c-.37.48-.67.79-1.03,1.28l.64.89c.49-.11,1.12-.5,1.49-.8.37.15.63.37.95.64l-.26,1.59c.27.26.8.39,1.19.46l.77-1.46,1.06.09c.31.5.35,1.14.68,1.58l1.13-.18v-1.66s.98-.48.98-.48c.53.35.79.7,1.28,1.02.37-.14.72-.46.92-.75-.2-.46-.54-.96-.78-1.38l.58-.94,1.76.28.33-1.13-1.43-.84c0-1.8.49-.99,1.64-1.72l-.16-1.16c-1.75,0-1.65.29-2.14-.96.32-.53.72-.88,1.05-1.37-.22-.26-.51-.53-.68-.85-.61.15-.98.65-1.61.77l-.81-.56.26-1.69-1.12-.42-.85,1.47c-1.94-.06-.89-.55-1.73-1.66l-1.17.19ZM57.12,19.91c5.43-1.46,7.45,6.74,2.14,8.14-5.34,1.41-7.68-6.66-2.14-8.14ZM15.24,40.1h-5.13v-3.5h9.34v11.55c-.34.13-.78.26-1.31.4-.53.13-1.12.26-1.78.37-.65.11-1.33.2-2.03.26-.7.07-1.38.11-2.07.11-2.06,0-3.85-.27-5.38-.83-1.54-.55-2.81-1.33-3.83-2.34-1.02-1-1.79-2.2-2.3-3.59-.51-1.39-.76-2.92-.76-4.6,0-1.19.13-2.32.4-3.4.27-1.08.67-2.08,1.19-3,.52-.92,1.16-1.75,1.9-2.49.74-.74,1.59-1.38,2.55-1.9.95-.52,1.99-.92,3.13-1.2,1.13-.28,2.35-.42,3.65-.42,1.15,0,2.25.08,3.29.25,1.03.16,1.89.37,2.55.6v3.53c-.89-.27-1.79-.48-2.69-.62-.91-.15-1.82-.22-2.74-.22-1.24,0-2.41.19-3.49.55-1.09.37-2.02.92-2.81,1.65-.79.72-1.42,1.62-1.87,2.68-.46,1.06-.68,2.29-.68,3.68.01,2.7.72,4.74,2.11,6.09,1.4,1.35,3.38,2.03,5.95,2.03.48,0,.98-.02,1.48-.08.51-.05.96-.12,1.35-.2v-5.37Z" /></svg>`

function addDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function todayFmt() {
  return new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function genNr() {
  const n = new Date()
  return `OF-${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}${String(Math.floor(Math.random()*900)+100)}`
}
function fmtRon(v) {
  return v.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
}

// ── A4 Preview: iframe scaled to fit container width ──
function A4Preview({ html }) {
  const iframeRef = useRef()
  const wrapRef = useRef()
  const [scale, setScale] = useState(1)

  // A4 dimensions in px at 96dpi: 794 x 1123
  const A4_W = 794
  const A4_H = 1123

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open(); doc.write(html); doc.close()
  }, [html])

  useEffect(() => {
    function calcScale() {
      if (!wrapRef.current) return
      const containerW = wrapRef.current.offsetWidth - 40 // 20px padding each side
      setScale(Math.min(1, containerW / A4_W))
    }
    calcScale()
    const ro = new ResizeObserver(calcScale)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div style={{
        width: A4_W * scale,
        height: A4_H * scale,
        flexShrink: 0,
        position: 'relative',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
      }}>
        <iframe
          ref={iframeRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: A4_W, height: A4_H,
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          title="preview"
        />
      </div>
    </div>
  )
}

function ClientField({ f, label, ph, half, value, onChange }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input className="w-full" placeholder={ph} value={value} onChange={e => onChange(f, e.target.value)} style={{ fontSize: 12 }} />
    </div>
  )
}

export default function AdminOferta() {
  const { db, saveOffer } = useStore()
  const [nr] = useState(genNr)
  const [valabilitate, setValabilitate] = useState(15)
  const [observatii, setObservatii] = useState('Prețurile includ discount de volum pentru cantitățile specificate. Oferta poate fi negociată suplimentar pentru contracte pe termen lung sau volume mai mari. Livrarea se efectuează cu mijloace proprii Gixen SRL, fără costuri suplimentare de transport.')
  const [client, setClient] = useState({ name: '', cui: '', regCom: '', adresa: '', email: '', telefon: '' })
  const [linii, setLinii] = useState([{ productId: '', cantitate: 100, discountExtra: 0 }])

  function sc(f, v) { setClient(p => ({ ...p, [f]: v })) }
  function addLinie() { setLinii(p => [...p, { productId: '', cantitate: 100, discountExtra: 0 }]) }
  function rmLinie(i) { setLinii(p => p.filter((_, idx) => idx !== i)) }
  function setLinie(i, f, v) { setLinii(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l)) }

  const liniiCalc = linii.map(l => {
    const product = db.products.find(p => p.id === l.productId)
    if (!product) return null
    const cant = parseInt(l.cantitate) || 0
    const pricing = calcLinePrice(product, cant, null, { ...db, firms: [{ id: null, discountGlobal: 0 }], clientPricing: [] })
    const discExtra = parseFloat(l.discountExtra) || 0
    const pretFinal = Math.round(pricing.pretUnitar * (1 - discExtra / 100) * 100) / 100
    const discTotal = Math.round((1 - pretFinal / product.pretBaza) * 1000) / 10
    return { product, cantitate: cant, pretBaza: product.pretBaza, pretFinal, discountProcent: discTotal, total: Math.round(pretFinal * cant * 100) / 100 }
  }).filter(Boolean)

  // Totals — motor promoții complet pe ofertă
  // Construiește linii pentru motor (în role)
  const subBaza2 = liniiCalc.reduce((s, l) => s + l.pretBaza * l.cantitate, 0)

  const liniiMotor = liniiCalc.map((l, i) => ({
    productId: l.product.id,
    cantitate: l.cantitate,
    cantRole: l.cantitate,
    unitateSel: 'rolă',
    totalBrutLinie: l.pretBaza * l.cantitate,
    produs: l.product,
    idx: i,
    tierPret: l.pretBaza,
    pretAfisatPerUm: l.pretBaza,
  }))

  // Discount manual per linie (discount extra setat în formular)
  const discManuale = liniiCalc
    .map((l, i) => l.discountProcent > 0 ? {
      refLinieIdx: i,
      productId: l.product.id,
      eticheta: `Discount lin. ${i+1} (−${l.discountProcent.toFixed(1)}%)`,
      procent: l.discountProcent,
      valoare: -Math.round((l.pretBaza - l.pretFinal) * l.cantitate * 100) / 100,
      tip: 'MANUAL', ruleId: null,
    } : null)
    .filter(Boolean)

  // Motor promoții — aplică regulile active (fără condiții de grup_client dacă nu e client)
  // Creăm o firmă fictivă fără grupClient ca să nu activăm reguli client-specifice
  const ofertaFirma = { id: null, grupClient: null, discountGlobal: 0 }
  const { discountLinii: promoLinii } = calculeazaCos(liniiMotor, ofertaFirma, db)

  // Combinăm: mai întâi manuale, apoi cele din motor promoții
  const toateDiscountLinii = [...discManuale, ...promoLinii]

  const totalDiscAll = toateDiscountLinii.reduce((s, d) => s + d.valoare, 0)
  const totalNetAll = Math.round((subBaza2 + totalDiscAll) * 100) / 100
  const tvaValAll = Math.round(totalNetAll * TVA * 100) / 100
  const totalCuTvaAll = Math.round((totalNetAll + tvaValAll) * 100) / 100
  const totalNet = totalNetAll
  const tvaVal = tvaValAll
  const totalCuTva = totalCuTvaAll

  // ── Build the offer HTML (shared by preview & print) ──
  function buildHtml(forPrint = false) {
    return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Ofertă ${nr} — Gixen SRL</title>
<style>
${forPrint ? '@page { size: A4; margin: 0; }' : ''}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; ${forPrint ? 'min-height: 297mm;' : ''} background: white; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.top-line { height: 3px; background: #21376c; }
.body { padding: 8mm 16mm 22mm; }
.header { display: grid; grid-template-columns: 1fr 54mm 1fr; gap: 5mm; margin-bottom: 6mm; align-items: start; }
.party-label { font-size: 6.5pt; font-weight: bold; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
.party-name { font-size: 11pt; font-weight: bold; color: #21376c; margin-bottom: 3px; line-height: 1.2; }
.party-detail { font-size: 7.5pt; color: #475569; line-height: 1.65; }
.party-right { text-align: right; }
.party-right .party-label, .party-right .party-name, .party-right .party-detail { text-align: right; }
.logo-center { text-align: center; padding: 4mm 4mm; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
.logo-center img { max-width: 50mm; height: auto; display: block; margin: 0 auto 3px; }
.logo-divider { height: 2px; background: #21376c; width: 80%; margin: 3px auto; }
.logo-tag { font-size: 6.5pt; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin: 2px 0; }
.logo-nr { font-size: 7.5pt; color: #475569; line-height: 1.5; }
.logo-valid { font-size: 8pt; color: #ea580c; font-weight: bold; margin-top: 3px; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 4mm 0; }
.intro { font-size: 8.5pt; color: #475569; line-height: 1.6; margin-bottom: 4mm; }
.section-label { font-size: 7pt; font-weight: bold; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2.5mm; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; }
thead tr { background: #21376c; color: white; }
thead th { padding: 5pt 3pt; font-size: 6.5pt; font-weight: bold; line-height: 1.3; }
thead th.right { text-align: right; }
thead th.center { text-align: center; }
tbody tr:nth-child(even) { background: #f8fafc; }
tbody td { padding: 4.5pt 3pt; border-bottom: 1px solid #e2e8f0; vertical-align: middle; line-height: 1.3; }
tbody td.right { text-align: right; }
tbody td.center { text-align: center; }
.prod-name { font-weight: bold; color: #0f172a; font-size: 8pt; }
.prod-specs { font-size: 6.5pt; color: #94a3b8; margin-top: 1px; }
.prod-cod { font-size: 6pt; color: #b0bec5; }
.disc-badge { background: #f0fdf4; color: #15803d; font-weight: bold; font-size: 7pt; padding: 1pt 4pt; border-radius: 8px; white-space: nowrap; }
.pret-net { font-weight: bold; color: #2563eb; }
.total-cell { font-weight: bold; color: #21376c; }
.small-gray { color: #94a3b8; font-size: 6.5pt; }
.tot-row td { border: none; padding: 2.5pt 3pt; font-size: 8pt; }
.tot-sep td { border-top: 1px solid #e2e8f0; padding-top: 4pt; }
.grand-row td { background: #21376c !important; color: white; font-size: 9pt; font-weight: bold; padding: 6pt 3pt; }
.conditions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3.5mm; margin: 4mm 0; }
.cond-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 4mm; text-align: center; }
.cond-title { font-weight: bold; font-size: 8pt; color: #21376c; margin-bottom: 3px; }
.cond-text { font-size: 7pt; color: #475569; line-height: 1.5; }
.obs-box { background: #eff6ff; border-left: 3px solid #2563eb; padding: 4mm; font-size: 8pt; color: #475569; line-height: 1.55; margin: 3.5mm 0; }
.footer { ${forPrint ? 'position: fixed; bottom: 0; left: 0; right: 0;' : 'margin-top: 6mm;'} background: #e2e8f0; padding: 3mm 16mm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #21376c; }
.footer-text { font-size: 6.5pt; color: #475569; }
</style>
</head><body>
<div class="top-line"></div>
<div class="body">
  <div class="header">
    <div>
      <div class="party-label">Furnizor</div>
      <div class="party-name">${GIXEN_INFO.name}</div>
      <div class="party-detail">CUI: ${GIXEN_INFO.cui}<br>Reg. Com.: ${GIXEN_INFO.regCom}<br>${GIXEN_INFO.adresa}<br>${GIXEN_INFO.email}<br>Tel: ${GIXEN_INFO.telefon}</div>
    </div>
    <div class="logo-center">
      ${GIXEN_LOGO_SVG}
      <div class="logo-divider"></div>
      <div class="logo-tag">Ofertă Comercială</div>
      <div class="logo-nr">Nr. <b>${nr}</b></div>
      <div class="logo-nr">Data: <b>${todayFmt()}</b></div>
      <div class="logo-valid">Valabilă până la: ${addDays(valabilitate)}</div>
    </div>
    <div class="party-right">
      <div class="party-label">Cumpărător</div>
      <div class="party-name">${client.name || '—'}</div>
      <div class="party-detail">
        ${client.cui ? `CUI: ${client.cui}<br>` : ''}
        ${client.regCom ? `Reg. Com.: ${client.regCom}<br>` : ''}
        ${client.adresa || '—'}
        ${client.email ? `<br>${client.email}` : ''}
        ${client.telefon ? `<br>Tel: ${client.telefon}` : ''}
      </div>
    </div>
  </div>
  <hr>
  <p class="intro">Stimați parteneri, vă transmitem oferta noastră comercială pentru produsele de mai jos, valabilă <strong>${valabilitate} zile</strong> de la data emiterii. Prețurile sunt exprimate în <strong>RON</strong>, fără și cu TVA (${Math.round(TVA*100)}%).</p>
  <div class="section-label">Produse și prețuri</div>
  <table>
    <thead>
      <tr>
        <th style="width:16px">#</th>
        <th style="width:28px"></th>
        <th style="text-align:left">Produs</th>
        <th class="center" style="width:34px">Cant.</th>
        <th class="right" style="width:46px">Preț bază<br>fără TVA</th>
        <th class="right" style="width:46px">Preț bază<br>cu TVA</th>
        <th class="center" style="width:40px">Disc.</th>
        <th class="right" style="width:46px">Preț net<br>fără TVA</th>
        <th class="right" style="width:46px">Preț net<br>cu TVA</th>
        <th class="right" style="width:52px">Total<br>fără TVA</th>
        <th class="right" style="width:52px">Total<br>cu TVA</th>
      </tr>
    </thead>
    <tbody>
      ${liniiCalc.map((l, i) => {
        const pbTva = l.pretBaza*(1+TVA), pfTva = l.pretFinal*(1+TVA), totCu = l.total*(1+TVA)
        const specs = l.product.specs ? [l.product.specs.ply?l.product.specs.ply+' str.':'', l.product.specs.sheets?l.product.specs.sheets+' foi':'', l.product.specs.pack||''].filter(Boolean).join(' ') : ''
        const discLiniiProdas = toateDiscountLinii.filter(d => d.refLinieIdx === i)
        const discRows = discLiniiProdas.map(d => `<tr style="background:#f0fdf4">
          <td colspan="3" style="font-size:7pt;color:#15803d;font-style:italic;padding:3pt 4pt 3pt 24pt">
            └ ${d.eticheta}${d.procent ? ' (−'+d.procent+'%)' : ''}
          </td>
          <td></td><td></td><td></td><td></td>
          <td class="right" style="font-size:8pt;color:#15803d;font-weight:bold">${fmtRon(d.valoare)}</td>
          <td class="right" style="font-size:8pt;color:#15803d;font-weight:bold">${fmtRon(d.valoare*(1+TVA))}</td>
          <td class="right" style="font-size:8pt;color:#15803d;font-weight:bold">${fmtRon(d.valoare)}</td>
          <td class="right" style="font-size:8pt;color:#15803d;font-weight:bold">${fmtRon(d.valoare*(1+TVA))}</td>
        </tr>`).join('')
        return `<tr>
          <td class="center" style="color:#94a3b8;font-size:7.5pt">${i+1}</td>
          <td class="center" style="padding:2pt">${l.product.imagine ? '<img src="' + l.product.imagine + '" style="width:24px;height:24px;object-fit:contain">' : ''}</td>
          <td><div class="prod-name">${l.product.name}</div>${specs?'<div class="prod-specs">'+specs+'</div>':''}<div class="prod-cod">Cod: ${l.product.cod}</div></td>
          <td class="center">${l.cantitate}<br><span class="small-gray">${l.product.unitate}</span></td>
          <td class="right"><span class="small-gray">${fmtRon(l.pretBaza)}</span></td>
          <td class="right"><span class="small-gray">${fmtRon(pbTva)}</span></td>
          <td class="center">—</td>
          <td class="right"><span class="pret-net">${fmtRon(l.pretFinal)}</span></td>
          <td class="right"><span class="pret-net">${fmtRon(pfTva)}</span></td>
          <td class="right"><span class="total-cell">${fmtRon(l.total)}</span></td>
          <td class="right"><span class="total-cell">${fmtRon(totCu)}</span></td>
        </tr>${discRows}`
      }).join('')}
      ${toateDiscountLinii.filter(d => d.refLinieIdx === -1).map(d => `<tr style="background:#f0fdf4">
        <td colspan="8" style="font-size:7.5pt;color:#15803d;font-style:italic;padding:4pt">
          └ ${d.eticheta}${d.procent ? ' (−'+d.procent+'%)' : ''}
        </td>
        <td class="right" style="color:#15803d;font-weight:bold">${fmtRon(d.valoare)}</td>
        <td class="right" style="color:#15803d;font-weight:bold">${fmtRon(d.valoare*(1+TVA))}</td>
        <td class="right" style="color:#15803d;font-weight:bold">${fmtRon(d.valoare)}</td>
        <td class="right" style="color:#15803d;font-weight:bold">${fmtRon(d.valoare*(1+TVA))}</td>
      </tr>`).join('')}
    </tbody>
    <tbody>
      <tr class="tot-row tot-sep"><td colspan="8"></td><td class="right" style="color:#475569">Subtotal brut:</td><td class="right" style="color:#475569">${fmtRon(subBaza2)}</td><td class="right" style="color:#475569">${fmtRon(subBaza2*(1+TVA))}</td></tr>
      ${Math.abs(totalDiscAll) > 0.001 ? '<tr class="tot-row"><td colspan="8"></td><td class="right" style="color:#16a34a;font-weight:bold">Total reduceri:</td><td class="right" style="color:#16a34a;font-weight:bold">'+fmtRon(totalDiscAll)+'</td><td class="right" style="color:#16a34a;font-weight:bold">'+fmtRon(totalDiscAll*(1+TVA))+'</td></tr>' : ''}
      <tr class="tot-row"><td colspan="8"></td><td class="right" style="font-weight:bold">Total net:</td><td class="right" style="font-weight:bold">${fmtRon(totalNetAll)}</td><td class="right" style="font-weight:bold">${fmtRon(totalCuTvaAll)}</td></tr>
      <tr class="tot-row"><td colspan="8"></td><td class="right" style="color:#94a3b8">TVA ${Math.round(TVA*100)}%:</td><td class="right" style="color:#94a3b8">${fmtRon(tvaValAll)}</td><td class="right" style="color:#94a3b8">—</td></tr>
      <tr class="grand-row"><td colspan="8"></td><td class="right">TOTAL DE PLATĂ:</td><td class="right">${fmtRon(totalNetAll)}<br><span style="font-size:6.5pt;font-weight:normal;opacity:.8">fără TVA</span></td><td class="right">${fmtRon(totalCuTvaAll)}<br><span style="font-size:6.5pt;font-weight:normal;opacity:.8">cu TVA</span></td></tr>
    </tbody>
  </table>
  <div class="conditions">
    <div class="cond-box"><div class="cond-title">Valabilitate</div><div class="cond-text">Oferta este valabilă <strong>${valabilitate} zile</strong>, până la <strong>${addDays(valabilitate)}</strong>.</div></div>
    <div class="cond-box"><div class="cond-title">Livrare</div><div class="cond-text">Livrare la sediul indicat. Termen: 3–5 zile lucrătoare de la confirmarea comenzii.</div></div>
    <div class="cond-box"><div class="cond-title">Plată</div><div class="cond-text">Plata prin OP.<br><strong>IBAN: ${GIXEN_INFO.iban}</strong><br>${GIXEN_INFO.banca}</div></div>
  </div>
  ${observatii?`<div class="obs-box">${observatii}</div>`:''}
</div>
<div class="footer">
  <div class="footer-text">${GIXEN_INFO.name} · CUI ${GIXEN_INFO.cui} · ${GIXEN_INFO.adresa} · ${GIXEN_INFO.email}</div>
  <div class="footer-text">Valabilă ${valabilitate} zile de la data emiterii.</div>
</div>
${forPrint ? '<script>window.onload=()=>{window.print()}</scr' + 'ipt>' : ''}
</body></html>`
  }

  function handleSaveOffer() {
    if (!client.name || liniiCalc.length === 0) return
    const offerData = {
      nr, firmId: '',
      clientName: client.name,
      dataEmitere: new Date().toISOString().split('T')[0],
      dataExpirare: addDays(valabilitate).split('.').reverse().join('-'),
      status: 'emisa', valabilitate, observatii,
      linii: liniiCalc.map((l, i) => ({
        productId: l.product.id, cantitate: l.cantitate,
        unitateSel: linii[i]?.productId === l.product.id ? 'rolă' : 'rolă',
        pretUnitar: l.pretFinal, total: l.total
      })),
      discountLinii: liniiCalc
        .map((l, i) => l.discountProcent > 0 ? {
          refLinie: i,
          eticheta: `Discount lin. ${i+1}`,
          procent: l.discountProcent,
          valoare: -(l.pretBaza - l.pretFinal) * l.cantitate
        } : null)
        .filter(Boolean),
      totalBrut: subBaza2,
      totalDiscount: -(subBaza2 - totalNet),
      totalNet,
      tva: tvaVal,
      totalCuTva,
      creatDe: 'admin@gixen.ro',
    }
    saveOffer(offerData)
    return offerData
  }

  function handlePrint() {
    handleSaveOffer()
    const win = window.open('', '_blank')
    win.document.write(buildHtml(true))
    win.document.close()
  }

  const previewHtml = buildHtml(false)



  return (
    <Layout title="Generator ofertă" subtitle="Emite ofertă comercială pentru client potențial">
      <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: 20, alignItems: 'start', height: 'calc(100vh - 120px)' }}>

        {/* ── LEFT: FORM (scrollable) ── */}
        <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>

          {/* Date client — 2 coloane */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Date client</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <ClientField f="name" label="Denumire firmă *" ph="SC Firma Clientului SRL" value={client["name"]}
                  onChange={sc} />
              <ClientField f="cui" label="CUI" ph="RO12345678" half value={client["cui"]}
                  onChange={sc} />
              <ClientField f="regCom" label="Nr. Reg. Com." ph="J40/1234/2023" half value={client["regCom"]}
                  onChange={sc} />
              <ClientField f="adresa" label="Adresă" ph="Str. Exemplu nr. 1, București" value={client["adresa"]}
                  onChange={sc} />
              <ClientField f="email" label="Email" ph="contact@firma.ro" half value={client["email"]}
                  onChange={sc} />
              <ClientField f="telefon" label="Telefon" ph="07xx xxx xxx" half value={client["telefon"]}
                  onChange={sc} />
            </div>
          </div>

          {/* Setări + Observații — 2 coloane */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Setări ofertă</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nr. ofertă</label>
                <input className="w-full" value={nr} readOnly style={{ fontSize: 12, background: 'var(--bg)', color: 'var(--text3)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Valabilitate (zile)</label>
                <input type="number" className="w-full" min={1} max={90} value={valabilitate}
                  onChange={e => setValabilitate(parseInt(e.target.value) || 15)} style={{ fontSize: 12 }} />
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Până la: <b>{addDays(valabilitate)}</b></div>
              </div>
              <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Observații</label>
                <textarea className="w-full" rows={3} value={observatii}
                  onChange={e => setObservatii(e.target.value)} style={{ fontSize: 12, resize: 'none' }} />
              </div>
            </div>
          </div>

          {/* Produse */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-hdr">
              <div className="section-title">Produse</div>
              <button className="btn btn-secondary btn-sm" onClick={addLinie}>+ Adaugă</button>
            </div>
            {linii.map((l, i) => {
              const product = db.products.find(p => p.id === l.productId)
              const calc = liniiCalc[i]
              return (
                <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, marginBottom: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select style={{ flex: 1, fontSize: 12 }} value={l.productId}
                      onChange={e => setLinie(i, 'productId', e.target.value)}>
                      <option value="">Selectează produs...</option>
                      {db.products.filter(p => p.activ).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button className="btn btn-danger btn-sm" onClick={() => rmLinie(i)}>✕</button>
                  </div>
                  {product && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {product.imagine && <img src={product.imagine} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} onError={e => e.target.style.display='none'} />}
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{product.cod} · <b>{lei(product.pretBaza)}</b>/{product.unitate}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11 }}>Cantitate ({product?.unitate || 'buc'})</label>
                      <input type="number" style={{ width: '100%', fontSize: 12 }} min={1} value={l.cantitate}
                        onChange={e => setLinie(i, 'cantitate', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11 }}>Discount extra (%)</label>
                      <input type="number" style={{ width: '100%', fontSize: 12 }} min={0} max={80} value={l.discountExtra}
                        onChange={e => setLinie(i, 'discountExtra', e.target.value)} />
                    </div>
                  </div>
                  {calc && calc.cantitate > 0 && (
                    <div style={{ fontSize: 11, marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap', color: 'var(--text3)' }}>
                      <span>Bază: <b style={{ color: 'var(--text)' }}>{lei(calc.pretBaza)}</b></span>
                      {calc.discountProcent > 0 && <span style={{ color: 'var(--green-text)', fontWeight: 600 }}>-{calc.discountProcent.toFixed(1)}%</span>}
                      <span>Net: <b style={{ color: 'var(--blue)' }}>{lei(calc.pretFinal)}</b></span>
                      <span>Total: <b style={{ color: 'var(--text)' }}>{lei(calc.total)}</b></span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', fontSize: 12 }}>
              <span style={{ color: 'var(--text2)' }}>Subtotal brut</span><span style={{ textAlign: 'right' }}>{lei(subBaza2)}</span>
              {Math.abs(totalDiscAll) > 0 && <><span style={{ color: 'var(--green-text)', fontWeight: 500 }}>Total reduceri</span><span style={{ textAlign: 'right', color: 'var(--green-text)', fontWeight: 500 }}>-{lei(Math.abs(totalDiscAll))}</span></>}
              <span style={{ color: 'var(--text2)' }}>Total net (fără TVA)</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{lei(totalNetAll||totalNet)}</span>
              <span style={{ color: 'var(--text2)' }}>TVA {Math.round(TVA*100)}%</span><span style={{ textAlign: 'right' }}>{lei(tvaValAll||tvaVal)}</span>
              <div style={{ gridColumn: 'span 2', height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Total cu TVA</span>
              <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>{lei(totalCuTvaAll||totalCuTva)}</span>
            </div>
          </div>

          <button className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '11px', fontSize: 14, marginBottom: 6 }}
            disabled={!client.name || liniiCalc.length === 0}
            onClick={handlePrint}>
            📄 Generează & Descarcă PDF
          </button>
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
            Selectează "Salvare ca PDF" în fereastra de print
          </div>
        </div>

        {/* ── RIGHT: A4 PREVIEW în iframe ── */}
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#525659' }}>
          <div style={{ padding: '10px 16px', background: '#3c3f41', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#d0d0d0' }}>Preview A4</div>
            <div style={{ fontSize: 11, color: '#888' }}>Se actualizează în timp real</div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <A4Preview html={previewHtml} />
          </div>
        </div>

      </div>
    </Layout>
  )
}
