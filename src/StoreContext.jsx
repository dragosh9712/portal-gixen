import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from './api'

const StoreContext = createContext(null)

const EMPTY_DB = {
  orders: [], firms: [], products: [], users: [],
  promotions: [], promotionRules: [], offers: [],
  clientPricing: [], favorites: [],
  agents: [], locations: [], exchange: null,
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(EMPTY_DB)
  const [loading, setLoading] = useState(() => !!localStorage.getItem('gixen_token'))
  const [error, setError] = useState(null)

  // ── Fetch all data ──
  const refreshAll = useCallback(async () => {
    try {
      const [orders, customers, products, promotions, agents, locations, exchange, offers] =
        await Promise.allSettled([
          api.orders.list({ limit: 200 }),
          api.customers.list(),
          api.products.list({ active_only: true }),
          api.promotions.list(),
          api.agents.list(),
          api.locations.list(),
          api.exchange.get(),
          api.offers.list(),
        ])

      setDb(prev => ({
        ...prev,
        orders:     orders.status     === 'fulfilled' ? (orders.value || [])     : prev.orders,
        firms:      customers.status  === 'fulfilled' ? (customers.value || [])  : prev.firms,
        products:   products.status   === 'fulfilled' ? (products.value || [])   : prev.products,
        promotions: promotions.status === 'fulfilled' ? (promotions.value || []) : prev.promotions,
        agents:     agents.status     === 'fulfilled' ? (agents.value || [])     : prev.agents,
        locations:  locations.status  === 'fulfilled' ? (locations.value || [])  : prev.locations,
        exchange:   exchange.status   === 'fulfilled' ? exchange.value           : prev.exchange,
        offers:     offers.status     === 'fulfilled' ? (offers.value || [])     : prev.offers,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshOrders = useCallback(async () => {
    try {
      const orders = await api.orders.list({ limit: 200 })
      setDb(prev => ({ ...prev, orders: orders || [] }))
    // eslint-disable-next-line no-empty
    } catch { }
  }, [])

  const refreshCustomers = useCallback(async () => {
    try {
      const customers = await api.customers.list()
      setDb(prev => ({ ...prev, firms: customers || [] }))
    // eslint-disable-next-line no-empty
    } catch { }
  }, [])

  const refreshProducts = useCallback(async () => {
    try {
      const products = await api.products.list({ active_only: true })
      setDb(prev => ({ ...prev, products: products || [] }))
    // eslint-disable-next-line no-empty
    } catch { }
  }, [])

  const refreshPromotions = useCallback(async () => {
    try {
      const promotions = await api.promotions.list()
      setDb(prev => ({ ...prev, promotions: promotions || [] }))
    // eslint-disable-next-line no-empty
    } catch { }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem('gixen_token')) refreshAll()
  }, [refreshAll])

  // ── Orders ──
  async function updateOrderStatus(orderId, status) {
    await api.orders.setStatus(orderId, status)
    setDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId
        ? { ...o, status, activityLog: [...(o.activityLog || []), { action: `Status → ${status}`, timestamp: new Date().toISOString(), by: 'Admin' }] }
        : o)
    }))
  }

  async function addNotaInterna(orderId, nota) {
    await api.orders.addNote(orderId, nota)
    setDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId
        ? {
            ...o,
            noteInterne: [...(o.noteInterne || []), { text: nota, timestamp: new Date().toISOString() }],
            activityLog: [...(o.activityLog || []), { action: 'Notă internă adăugată', timestamp: new Date().toISOString(), by: 'Admin' }],
          }
        : o)
    }))
  }

  async function createOrder(firmId, userId, lines, dataLivrare, observatii, adresaLivrare, discountLinii) {
    const total = lines.reduce((s, l) => s + l.total, 0)
    const discTotal = (discountLinii || []).reduce((s, d) => s + d.valoare, 0)
    const orderData = {
      firmId, userId, lines,
      dataLivrare: dataLivrare || null,
      observatii: observatii || '',
      adresaLivrare: adresaLivrare || '',
      total: Math.round((total + discTotal) * 100) / 100,
      discountLinii: discountLinii || [],
    }
    const created = await api.orders.create(orderData)
    await refreshOrders()
    return created
  }

  async function bulkUpdateOrderStatus(orderIds, status) {
    await Promise.all(orderIds.map(id => api.orders.setStatus(id, status)))
    await refreshOrders()
  }

  function updateTransport(orderId, data) {
    // Optimistic update — backend-ul va fi actualizat ulterior prin WMS
    setDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId
        ? { ...o, transport: { ...o.transport, ...data } }
        : o)
    }))
  }

  function updateDocumente(orderId, data) {
    setDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId
        ? { ...o, documente: { ...o.documente, ...data }, nrFactura: data.nrFactura || o.nrFactura }
        : o)
    }))
  }

  function updateAdresaLivrare(orderId, adresa) {
    setDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, adresaLivrare: adresa } : o)
    }))
  }

  function setFactura(orderId, nrFactura) {
    setDb(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, nrFactura } : o)
    }))
  }

  // ── Customers / Firms ──
  async function registerNewClient(firmData, userData) {
    const result = await api.customers.create({
      name: firmData.name, cui: firmData.cui, regCom: firmData.regCom,
      adresa: firmData.adresa + ', ' + firmData.localitate + ', ' + firmData.judet,
      telefon: firmData.contactTelefon, email: firmData.contactEmail,
      contact_name: userData.contactNume + ' ' + userData.contactPrenume,
      contact_email: userData.email, password: userData.password,
    })
    await refreshCustomers()
    return result
  }

  async function approveFirm(firmId) {
    await api.customers.update(firmId, { status: 'activ' })
    setDb(prev => ({
      ...prev,
      firms: prev.firms.map(f => f.id === firmId ? { ...f, status: 'activ' } : f)
    }))
  }

  async function rejectFirm(firmId) {
    await api.customers.update(firmId, { status: 'respinsa' })
    setDb(prev => ({
      ...prev,
      firms: prev.firms.map(f => f.id === firmId ? { ...f, status: 'respinsa' } : f)
    }))
  }

  async function updateFirm(firmId, data) {
    await api.customers.update(firmId, data)
    setDb(prev => ({
      ...prev,
      firms: prev.firms.map(f => f.id === firmId ? { ...f, ...data } : f)
    }))
  }

  // ── Products ──
  async function updateProduct(productId, data) {
    await api.products.update(productId, data)
    setDb(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === productId ? { ...p, ...data } : p)
    }))
  }

  async function addProduct(product) {
    const created = await api.products.create(product)
    await refreshProducts()
    return created
  }

  // ── Favorites (local, nu există endpoint) ──
  function toggleFavorite(userId, productId) {
    setDb(prev => {
      const favs = prev.favorites || []
      const idx = favs.findIndex(f => f.userId === userId && f.productId === productId)
      return {
        ...prev,
        favorites: idx >= 0
          ? favs.filter((_, i) => i !== idx)
          : [...favs, { userId, productId }]
      }
    })
  }

  function isFavorite(userId, productId) {
    return (db.favorites || []).some(f => f.userId === userId && f.productId === productId)
  }

  // ── Client Pricing (local până la endpoint) ──
  function setClientPricing(firmId, productId, discountExtra) {
    setDb(prev => {
      const pricing = [...(prev.clientPricing || [])]
      const idx = pricing.findIndex(cp => cp.firmId === firmId && cp.productId === productId)
      if (idx >= 0) {
        if (discountExtra === 0) pricing.splice(idx, 1)
        else pricing[idx] = { ...pricing[idx], discountExtra }
      } else if (discountExtra > 0) {
        pricing.push({ firmId, productId, discountExtra })
      }
      return { ...prev, clientPricing: pricing }
    })
  }

  // ── Promotions ──
  async function addPromotion(promo) {
    await api.promotions.save(promo)
    await refreshPromotions()
  }

  async function updatePromotion(id, data) {
    await api.promotions.update(id, data)
    setDb(prev => ({
      ...prev,
      promotions: prev.promotions.map(p => p.id === id ? { ...p, ...data } : p)
    }))
  }

  function togglePromotion(id) {
    setDb(prev => ({
      ...prev,
      promotions: prev.promotions.map(p => p.id === id ? { ...p, activa: !p.activa } : p)
    }))
  }

  // ── Promotion Rules ──
  function addPromotionRule(rule) {
    setDb(prev => ({
      ...prev,
      promotionRules: [...(prev.promotionRules || []), { id: 'rule_' + Date.now(), ...rule }]
    }))
  }

  function updatePromotionRule(id, data) {
    setDb(prev => ({
      ...prev,
      promotionRules: (prev.promotionRules || []).map(r => r.id === id ? { ...r, ...data } : r)
    }))
  }

  function togglePromotionRule(id) {
    setDb(prev => ({
      ...prev,
      promotionRules: (prev.promotionRules || []).map(r => r.id === id ? { ...r, activ: !r.activ } : r)
    }))
  }

  // ── Offers ──
  async function saveOffer(offerData) {
    const existing = (db.offers || []).find(o => o.id === offerData.id)
    if (existing) {
      await api.offers.update(offerData.id, offerData)
      setDb(prev => ({ ...prev, offers: prev.offers.map(o => o.id === offerData.id ? offerData : o) }))
    } else {
      await api.offers.save(offerData)
      setDb(prev => ({ ...prev, offers: [...(prev.offers || []), offerData] }))
    }
  }

  async function updateOfferStatus(offerId, status) {
    await api.offers.update(offerId, { status })
    setDb(prev => ({
      ...prev,
      offers: prev.offers.map(o => o.id === offerId ? { ...o, status } : o)
    }))
  }

  function deleteOffer(offerId) {
    setDb(prev => ({ ...prev, offers: prev.offers.filter(o => o.id !== offerId) }))
  }

  // ── Computed stats ──
  const pendingApprovals = db.firms.filter(f => f.status === 'in_aprobare').length
  const pendingOrders = db.orders.filter(o => o.status === 'in_aprobare').length
  const totalPending = pendingApprovals + pendingOrders

  return (
    <StoreContext.Provider value={{
      db, loading, error,
      totalPending, pendingApprovals, pendingOrders,
      // Refresh
      refreshAll, refreshOrders, refreshCustomers, refreshProducts, refreshPromotions,
      // Orders
      updateOrderStatus, addNotaInterna, createOrder, bulkUpdateOrderStatus,
      updateTransport, updateDocumente, updateAdresaLivrare, setFactura,
      // Firms / Customers
      registerNewClient, approveFirm, rejectFirm, updateFirm,
      // Products
      updateProduct, addProduct,
      // Favorites
      toggleFavorite, isFavorite,
      // Pricing
      setClientPricing,
      // Promotions
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

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => useContext(StoreContext)
