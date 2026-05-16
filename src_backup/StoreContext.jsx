import { createContext, useContext, useState } from 'react'
import initialDb from './db.json'

function clone(x) { return JSON.parse(JSON.stringify(x)) }

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(clone(initialDb))

  function updateDb(fn) {
    setDb(prev => { const next = clone(prev); fn(next); return next })
  }

  // ── Orders ──
  function updateOrderStatus(orderId, status) {
    updateDb(d => {
      const o = d.orders.find(o => o.id === orderId)
      if (!o) return
      const prev = o.status; o.status = status
      if (!o.activityLog) o.activityLog = []
      o.activityLog.push({ action: `Status: ${prev} → ${status}`, timestamp: new Date().toISOString(), by: 'Admin' })
    })
  }

  function addNotaInterna(orderId, nota) {
    updateDb(d => {
      const o = d.orders.find(o => o.id === orderId)
      if (!o) return
      if (!o.noteInterne) o.noteInterne = []
      o.noteInterne.push({ text: nota, timestamp: new Date().toISOString() })
      if (!o.activityLog) o.activityLog = []
      o.activityLog.push({ action: 'Notă internă adăugată', timestamp: new Date().toISOString(), by: 'Admin' })
    })
  }

  function createOrder(firmId, userId, lines, dataLivrare, observatii, adresaLivrare, discountLinii) {
    const newId = 'o' + Date.now()
    const nr = 'GX-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100)
    const total = lines.reduce((s, l) => s + l.total, 0)
    const discTotal = (discountLinii || []).reduce((s, d) => s + d.valoare, 0)
    const order = {
      id: newId, nr, firmId, userId,
      status: 'plasata',
      dataComanda: new Date().toISOString().split('T')[0],
      dataLivrare: dataLivrare || null,
      observatii: observatii || '',
      total: Math.round((total + discTotal) * 100) / 100,
      nrFactura: null, noteInterne: [],
      adresaLivrare: adresaLivrare || '',
      transport: { sofer: null, nrMasina: null, dataLivrareConfirmata: null, oraEstimata: null },
      documente: { nrAviz: null, urlAviz: null, nrFactura: null, urlFactura: null },
      discountLinii: discountLinii || [],
      activityLog: [{ action: 'Comandă plasată', timestamp: new Date().toISOString(), by: 'Client' }],
      lines
    }
    updateDb(d => { d.orders.unshift(order) })
    return order
  }

  function bulkUpdateOrderStatus(orderIds, status) {
    updateDb(d => {
      orderIds.forEach(id => {
        const o = d.orders.find(o => o.id === id)
        if (o) {
          o.activityLog = o.activityLog || []
          o.activityLog.push({ action: `Bulk: status → ${status}`, timestamp: new Date().toISOString(), by: 'Admin' })
          o.status = status
        }
      })
    })
  }

  function updateTransport(orderId, data) {
    updateDb(d => {
      const o = d.orders.find(o => o.id === orderId)
      if (!o) return
      o.transport = { ...o.transport, ...data }
      if (!o.activityLog) o.activityLog = []
      o.activityLog.push({ action: 'Date transport actualizate', timestamp: new Date().toISOString(), by: 'Admin' })
    })
  }

  function updateDocumente(orderId, data) {
    updateDb(d => {
      const o = d.orders.find(o => o.id === orderId)
      if (!o) return
      o.documente = { ...o.documente, ...data }
      if (data.nrFactura) o.nrFactura = data.nrFactura
      if (!o.activityLog) o.activityLog = []
      o.activityLog.push({ action: 'Documente actualizate', timestamp: new Date().toISOString(), by: 'Admin' })
    })
  }

  function updateAdresaLivrare(orderId, adresa) {
    updateDb(d => { const o = d.orders.find(o => o.id === orderId); if (o) o.adresaLivrare = adresa })
  }

  function setFactura(orderId, nrFactura) {
    updateDb(d => { const o = d.orders.find(o => o.id === orderId); if (o) o.nrFactura = nrFactura })
  }

  // ── Firms ──
  function registerNewClient(firmData, userData) {
    const firmId = 'f' + Date.now()
    const userId = 'u' + Date.now()
    updateDb(d => {
      d.firms.push({
        id: firmId, name: firmData.name, cui: firmData.cui, regCom: firmData.regCom,
        adresa: firmData.adresa + ', ' + firmData.localitate + ', ' + firmData.judet,
        telefon: firmData.contactTelefon, email: firmData.contactEmail,
        discountGlobal: 0, status: 'in_aprobare',
        marciPermise: ['Gixen'], grupClient: 'standard'
      })
      d.users.push({
        id: userId, email: userData.email, password: userData.password,
        role: 'client', name: userData.contactNume + ' ' + userData.contactPrenume,
        firmId, status: 'in_aprobare'
      })
    })
    return { firmId, userId }
  }

  function approveFirm(firmId) {
    updateDb(d => {
      const f = d.firms.find(f => f.id === firmId); if (f) f.status = 'activ'
      const u = d.users.find(u => u.firmId === firmId); if (u) u.status = 'activ'
    })
  }

  function rejectFirm(firmId) {
    updateDb(d => {
      const f = d.firms.find(f => f.id === firmId); if (f) f.status = 'respinsa'
      const u = d.users.find(u => u.firmId === firmId); if (u) u.status = 'respins'
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
    updateDb(d => { d.products.push({ id: 'p' + Date.now(), ...product }) })
  }

  // ── Favorites ──
  function toggleFavorite(userId, productId) {
    updateDb(d => {
      if (!d.favorites) d.favorites = []
      const idx = d.favorites.findIndex(f => f.userId === userId && f.productId === productId)
      if (idx >= 0) d.favorites.splice(idx, 1)
      else d.favorites.push({ userId, productId })
    })
  }

  function isFavorite(userId, productId) {
    return (db.favorites || []).some(f => f.userId === userId && f.productId === productId)
  }

  // ── Pricing ──
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

  // ── Promotions (legacy) ──
  function addPromotion(promo) {
    updateDb(d => { d.promotions.push({ id: 'promo' + Date.now(), ...promo }) })
  }

  function updatePromotion(id, data) {
    updateDb(d => {
      const idx = d.promotions.findIndex(p => p.id === id)
      if (idx >= 0) d.promotions[idx] = { ...d.promotions[idx], ...data }
    })
  }

  function togglePromotion(id) {
    updateDb(d => { const p = d.promotions.find(p => p.id === id); if (p) p.activa = !p.activa })
  }

  // ── Promotion Rules ──
  function addPromotionRule(rule) {
    updateDb(d => {
      if (!d.promotionRules) d.promotionRules = []
      d.promotionRules.push({ id: 'rule_' + Date.now(), ...rule })
    })
  }

  function updatePromotionRule(id, data) {
    updateDb(d => {
      if (!d.promotionRules) return
      const idx = d.promotionRules.findIndex(r => r.id === id)
      if (idx >= 0) d.promotionRules[idx] = { ...d.promotionRules[idx], ...data }
    })
  }

  function togglePromotionRule(id) {
    updateDb(d => {
      if (!d.promotionRules) return
      const r = d.promotionRules.find(r => r.id === id)
      if (r) r.activ = !r.activ
    })
  }

  // ── Offers ──
  function saveOffer(offerData) {
    updateDb(d => {
      if (!d.offers) d.offers = []
      const existing = d.offers.findIndex(o => o.id === offerData.id)
      if (existing >= 0) d.offers[existing] = offerData
      else d.offers.push({ id: 'of' + Date.now(), ...offerData })
    })
  }

  function updateOfferStatus(offerId, status) {
    updateDb(d => {
      const o = (d.offers || []).find(o => o.id === offerId)
      if (o) o.status = status
    })
  }

  function deleteOffer(offerId) {
    updateDb(d => { d.offers = (d.offers || []).filter(o => o.id !== offerId) })
  }

  // ── Computed stats ──
  const pendingApprovals = db.firms.filter(f => f.status === 'in_aprobare').length
  const pendingOrders = db.orders.filter(o => o.status === 'in_aprobare').length
  const totalPending = pendingApprovals + pendingOrders

  return (
    <StoreContext.Provider value={{
      db, totalPending, pendingApprovals, pendingOrders,
      // Orders
      updateOrderStatus, addNotaInterna, createOrder, bulkUpdateOrderStatus,
      updateTransport, updateDocumente, updateAdresaLivrare, setFactura,
      // Firms
      registerNewClient, approveFirm, rejectFirm, updateFirm,
      // Products
      updateProduct, addProduct,
      // Favorites
      toggleFavorite, isFavorite,
      // Pricing
      setClientPricing,
      // Promotions legacy
      addPromotion, updatePromotion, togglePromotion,
      // Promotion Rules
      addPromotionRule, updatePromotionRule, togglePromotionRule,
      // Offers
      saveOffer, updateOfferStatus, deleteOffer,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
