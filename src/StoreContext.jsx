import { createContext, useContext, useState } from 'react'
import initialDb from './db.json'

// Deep clone so we can mutate in-memory
function clone(x) { return JSON.parse(JSON.stringify(x)) }

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(clone(initialDb))

  function updateDb(fn) {
    setDb(prev => {
      const next = clone(prev)
      fn(next)
      return next
    })
  }

  // ── Orders ──
  function updateOrderStatus(orderId, status) {
    updateDb(d => {
      const o = d.orders.find(o => o.id === orderId)
      if (o) o.status = status
    })
  }

  function createOrder(firmId, userId, lines, dataLivrare, observatii) {
    const newId = 'o' + Date.now()
    const nr = 'GX-' + new Date().getFullYear() + '-' + String(db.orders.length + 100).padStart(3, '0')
    const total = lines.reduce((s, l) => s + l.total, 0)
    const order = {
      id: newId, nr, firmId, userId,
      status: 'plasata',
      dataComanda: new Date().toISOString().split('T')[0],
      dataLivrare: dataLivrare || null,
      observatii: observatii || '',
      total: Math.round(total * 100) / 100,
      nrFactura: null,
      lines
    }
    updateDb(d => { d.orders.unshift(order) })
    return order
  }

  // ── Firms ──
  function approveFirm(firmId) {
    updateDb(d => {
      const f = d.firms.find(f => f.id === firmId)
      if (f) f.status = 'activ'
      const u = d.users.find(u => u.firmId === firmId)
      if (u) u.status = 'activ'
    })
  }

  function rejectFirm(firmId) {
    updateDb(d => {
      const f = d.firms.find(f => f.id === firmId)
      if (f) f.status = 'respinsa'
      const u = d.users.find(u => u.firmId === firmId)
      if (u) u.status = 'respins'
    })
  }

  function updateFirm(firmId, data) {
    updateDb(d => {
      const idx = d.firms.findIndex(f => f.id === firmId)
      if (idx >= 0) d.firms[idx] = { ...d.firms[idx], ...data }
    })
  }

  // ── Products ──
  function updateProduct(productId, data) {
    updateDb(d => {
      const idx = d.products.findIndex(p => p.id === productId)
      if (idx >= 0) d.products[idx] = { ...d.products[idx], ...data }
    })
  }

  function addProduct(product) {
    const id = 'p' + Date.now()
    updateDb(d => { d.products.push({ id, ...product }) })
  }

  // ── Client pricing ──
  function setClientPricing(firmId, productId, discountExtra) {
    updateDb(d => {
      const idx = d.clientPricing.findIndex(cp => cp.firmId === firmId && cp.productId === productId)
      if (idx >= 0) {
        if (discountExtra === 0) d.clientPricing.splice(idx, 1)
        else d.clientPricing[idx].discountExtra = discountExtra
      } else if (discountExtra > 0) {
        d.clientPricing.push({ firmId, productId, discountExtra })
      }
    })
  }

  // ── Promotions ──
  function addPromotion(promo) {
    const id = 'promo' + Date.now()
    updateDb(d => { d.promotions.push({ id, ...promo }) })
  }

  function togglePromotion(id) {
    updateDb(d => {
      const p = d.promotions.find(p => p.id === id)
      if (p) p.activa = !p.activa
    })
  }

  // ── Order factura ──
  function setFactura(orderId, nrFactura) {
    updateDb(d => {
      const o = d.orders.find(o => o.id === orderId)
      if (o) o.nrFactura = nrFactura
    })
  }

  return (
    <StoreContext.Provider value={{
      db,
      updateOrderStatus, createOrder,
      approveFirm, rejectFirm, updateFirm,
      updateProduct, addProduct,
      setClientPricing,
      addPromotion, togglePromotion,
      setFactura
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
