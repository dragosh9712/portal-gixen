// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from './api'

const StoreContext = createContext(null)

const EMPTY_DB = {
  orders: [], firms: [], products: [], users: [],
  promotions: [], promotionRules: [], offers: [],
  clientPricing: [], favorites: [],
  agents: [], locations: [], exchange: null,
  commissionRules: [], uoms: [], unit_of_measure: [], recipes: [], surveys: [], survey_results: [],
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(EMPTY_DB)
  const [loading, setLoading] = useState(() => !!localStorage.getItem('gixen_token'))
  const [error, setError] = useState(null)

  const refreshAll = useCallback(async () => {
    try {
      const [orders, customers, products, promotions, agents, locations, exchange, offers, uoms, surveys] =
        await Promise.allSettled([
          api.orders.list({ limit: 200 }),
          api.customers.list(),
          api.products.list({ active_only: true }),
          api.promotions.list(),
          api.agents.list(),
          api.locations.list(),
          api.exchange.get(),
          api.offers.list(),
          api.uom.list(),
          api.surveys.list(),
        ])
      setDb(prev => ({
        ...prev,
        orders:           orders.status     === 'fulfilled' ? (orders.value || [])     : prev.orders,
        firms:            customers.status  === 'fulfilled' ? (customers.value || [])  : prev.firms,
        products:         products.status   === 'fulfilled' ? (products.value || [])   : prev.products,
        promotions:       promotions.status === 'fulfilled' ? (promotions.value || []) : prev.promotions,
        agents:           agents.status     === 'fulfilled' ? (agents.value || [])     : prev.agents,
        locations:        locations.status  === 'fulfilled' ? (locations.value || [])  : prev.locations,
        exchange:         exchange.status   === 'fulfilled' ? exchange.value           : prev.exchange,
        offers:           offers.status     === 'fulfilled' ? (offers.value || [])     : prev.offers,
        unit_of_measure:  uoms.status       === 'fulfilled' ? (uoms.value || [])       : prev.unit_of_measure,
        surveys:          surveys.status    === 'fulfilled' ? (surveys.value || [])    : prev.surveys,
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
    if (localStorage.getItem('gixen_token')) refreshAll()
  }, [refreshAll])

  // ── Orders ──
  async function updateOrderStatus(orderId, status, locationId) {
    await api.orders.setStatus(orderId, status, locationId)
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
    const created = await api.orders.create({
      firmId, userId, lines,
      dataLivrare: dataLivrare || null,
      observatii: observatii || '',
      adresaLivrare: adresaLivrare || '',
      total: Math.round((total + discTotal) * 100) / 100,
      discountLinii: discountLinii || [],
    })
    await refreshOrders()
    return created
  }

  async function bulkUpdateOrderStatus(orderIds, status) {
    await Promise.all(orderIds.map(id => api.orders.setStatus(id, status)))
    await refreshOrders()
  }

  function updateTransport(orderId, data) {
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
  async function approveFirm(firmId) {
    await api.customers.update(firmId, { status: 'activ' })
    setDb(prev => ({ ...prev, firms: prev.firms.map(f => f.id === firmId ? { ...f, status: 'activ' } : f) }))
  }

  async function rejectFirm(firmId) {
    await api.customers.update(firmId, { status: 'respinsa' })
    setDb(prev => ({ ...prev, firms: prev.firms.map(f => f.id === firmId ? { ...f, status: 'respinsa' } : f) }))
  }

  async function updateFirm(firmId, data) {
    await api.customers.update(firmId, data)
    setDb(prev => ({ ...prev, firms: prev.firms.map(f => f.id === firmId ? { ...f, ...data } : f) }))
  }

  async function registerNewClient(firmData, userData) {
    const result = await api.customers.create({
      name: firmData.name, cui: firmData.cui, regCom: firmData.regCom,
      adresa: `${firmData.adresa}, ${firmData.localitate}, ${firmData.judet}`,
      telefon: firmData.contactTelefon, email: firmData.contactEmail,
      contact_name: `${userData.contactNume} ${userData.contactPrenume}`,
      contact_email: userData.email, password: userData.password,
    })
    await refreshCustomers()
    return result
  }

  // ── Delegates ──
  async function addDelegate(firmId, delegateData) {
    await api.customers.update(firmId, { addDelegate: delegateData })
    await refreshCustomers()
  }

  async function updateDelegate(userId, data) {
    setDb(prev => ({ ...prev, users: (prev.users || []).map(u => u.id === userId ? { ...u, ...data } : u) }))
  }

  async function deactivateDelegate(userId) {
    setDb(prev => ({ ...prev, users: (prev.users || []).map(u => u.id === userId ? { ...u, status: 'inactive' } : u) }))
  }

  function generateOnboardingToken(userId) {
    return 'tok_' + userId + '_' + Date.now()
  }

  // ── Credit ──
  function getCreditLimit(firmId) {
    const firm = db.firms.find(f => f.id === firmId)
    return firm?.credit_limit_data || null
  }

  async function saveCreditLimit(firmId, data) {
    await api.customers.setCredit(firmId, data)
    setDb(prev => ({
      ...prev,
      firms: prev.firms.map(f => f.id === firmId ? { ...f, credit_limit_data: data } : f)
    }))
  }

  function checkCreditLimit(firmId, orderTotal) {
    const firm = db.firms.find(f => f.id === firmId)
    if (!firm?.credit_limit_data?.enabled) return { ok: true }
    const limit = firm.credit_limit_data.limit || 0
    const used = (db.orders || [])
      .filter(o => o.firmId === firmId && !['livrat', 'anulat'].includes(o.status))
      .reduce((s, o) => s + (o.total || 0), 0)
    const remaining = limit - used
    if (orderTotal > remaining) return { ok: false, limit, used, remaining }
    return { ok: true, limit, used, remaining }
  }

  // ── Products ──
  async function updateProduct(productId, data) {
    await api.products.update(productId, data)
    setDb(prev => ({ ...prev, products: prev.products.map(p => p.id === productId ? { ...p, ...data } : p) }))
  }

  async function addProduct(product) {
    const created = await api.products.create(product)
    await refreshProducts()
    return created
  }

  async function updateProductUom(productId, uomData) {
    await api.products.update(productId, { uom: uomData })
    setDb(prev => ({ ...prev, products: prev.products.map(p => p.id === productId ? { ...p, uom: uomData } : p) }))
  }

  async function addProductPrice(productId, priceData) {
    await api.products.update(productId, { addPrice: priceData })
    await refreshProducts()
  }

  async function syncProductSelectSoft(productId) {
    try {
      await api.products.syncSS(productId)
      await refreshProducts()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  // ── Pricing ──
  function getPretPentruClient(productOrId, firmOrId) {
    const product = typeof productOrId === 'string' ? (db.products || []).find(p => p.id === productOrId) : productOrId
    const firm    = typeof firmOrId    === 'string' ? (db.firms    || []).find(f => f.id === firmOrId)    : firmOrId
    if (!product) return 0
    const basePrice = product.active_base_price || product.pret_ron || 0
    if (!firm) return basePrice
    const currency = firm.currency || 'RON'
    const tier = firm.customer_group || firm.tier || 'standard'
    const exchange = db.exchange?.rate || 5
    const tierDiscounts = { platinum: 0.15, gold: 0.10, silver: 0.05, standard: 0 }
    const discount = tierDiscounts[tier] || 0
    const cpEntry = (db.clientPricing || []).find(cp => cp.firmId === firm.id && cp.productId === product.id)
    const extraDiscount = cpEntry ? cpEntry.discountExtra / 100 : 0
    let price = basePrice * (1 - discount) * (1 - extraDiscount)
    if (currency === 'EUR') price = price / exchange
    return Math.round(price * 100) / 100
  }

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

  // ── Favorites ──
  function toggleFavorite(userId, productId) {
    setDb(prev => {
      const favs = prev.favorites || []
      const idx = favs.findIndex(f => f.userId === userId && f.productId === productId)
      return {
        ...prev,
        favorites: idx >= 0 ? favs.filter((_, i) => i !== idx) : [...favs, { userId, productId }]
      }
    })
  }

  function isFavorite(userId, productId) {
    return (db.favorites || []).some(f => f.userId === userId && f.productId === productId)
  }

  // ── Promotions ──
  async function addPromotion(promo) {
    await api.promotions.save(promo)
    await refreshPromotions()
  }

  async function updatePromotion(id, data) {
    await api.promotions.update(id, data)
    setDb(prev => ({ ...prev, promotions: prev.promotions.map(p => p.id === id ? { ...p, ...data } : p) }))
  }

  function togglePromotion(id) {
    setDb(prev => ({ ...prev, promotions: prev.promotions.map(p => p.id === id ? { ...p, activa: !p.activa } : p) }))
  }

  function addPromotionRule(rule) {
    setDb(prev => ({ ...prev, promotionRules: [...(prev.promotionRules || []), { id: 'rule_' + Date.now(), ...rule }] }))
  }

  function updatePromotionRule(id, data) {
    setDb(prev => ({ ...prev, promotionRules: (prev.promotionRules || []).map(r => r.id === id ? { ...r, ...data } : r) }))
  }

  function togglePromotionRule(id) {
    setDb(prev => ({ ...prev, promotionRules: (prev.promotionRules || []).map(r => r.id === id ? { ...r, activ: !r.activ } : r) }))
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
    setDb(prev => ({ ...prev, offers: prev.offers.map(o => o.id === offerId ? { ...o, status } : o) }))
  }

  function deleteOffer(offerId) {
    setDb(prev => ({ ...prev, offers: prev.offers.filter(o => o.id !== offerId) }))
  }

  // ── Commission Rules ──
  function saveCommissionRule(rule) {
    setDb(prev => {
      const rules = [...(prev.commissionRules || [])]
      const idx = rules.findIndex(r => r.id === rule.id)
      if (idx >= 0) rules[idx] = rule
      else rules.push({ id: 'cr_' + Date.now(), ...rule })
      return { ...prev, commissionRules: rules }
    })
  }

  function deleteCommissionRule(id) {
    setDb(prev => ({ ...prev, commissionRules: (prev.commissionRules || []).filter(r => r.id !== id) }))
  }

  function toggleCommissionRule(id) {
    setDb(prev => ({ ...prev, commissionRules: (prev.commissionRules || []).map(r => r.id === id ? { ...r, activ: !r.activ } : r) }))
  }

  // ── Locations ──
  async function saveLocation(data) {
    if (data.id) {
      await api.locations.update(data.id, data)
      setDb(prev => ({ ...prev, locations: prev.locations.map(l => l.id === data.id ? { ...l, ...data } : l) }))
    } else {
      const created = await api.locations.create(data)
      setDb(prev => ({ ...prev, locations: [...(prev.locations || []), created] }))
    }
  }

  async function setDefaultLocation(locationId) {
    await api.locations.setDefault(locationId)
    setDb(prev => ({
      ...prev,
      locations: prev.locations.map(l => ({ ...l, isDefault: l.id === locationId }))
    }))
  }

  // ── UoM ──
  async function saveUom(uomData) {
    try {
      if (uomData.id && !uomData.id.startsWith('uom_')) {
        await api.uom.update(uomData.id, uomData)
      } else {
        const created = await api.uom.create(uomData)
        uomData = { ...uomData, id: created.id || uomData.id || 'uom_' + Date.now() }
      }
    } catch { /* best-effort */ }
    setDb(prev => {
      const list = [...(prev.unit_of_measure || [])]
      const idx = list.findIndex(u => u.id === uomData.id)
      if (idx >= 0) list[idx] = uomData
      else list.push(uomData)
      return { ...prev, unit_of_measure: list, uoms: list }
    })
  }

  // ── Recipes ──
  function saveRecipe(recipeData) {
    setDb(prev => {
      const recipes = [...(prev.recipes || [])]
      const idx = recipes.findIndex(r => r.id === recipeData.id)
      if (idx >= 0) recipes[idx] = recipeData
      else recipes.push({ id: 'rec_' + Date.now(), ...recipeData })
      return { ...prev, recipes }
    })
  }

  // ── Exchange ──
  function getExchangeRate(_currency) {
    return db.exchange || { rate: db.exchange?.rate || 5 }
  }

  async function updateExchangeRate(rate) {
    try {
      await api.exchange.set(rate)
    // eslint-disable-next-line no-empty
    } catch { }
    setDb(prev => ({ ...prev, exchange: { ...(prev.exchange || {}), rate } }))
  }

  // ── SelectSoft ──
  function syncClientsFromSelectSoft() {
    refreshCustomers()
    return { message: 'Sync SS clienți pornit...' }
  }

  function syncProductsFromSelectSoft() {
    refreshProducts()
    return { message: 'Sync SS produse pornit...' }
  }

  function createClientInSelectSoft(firmId) {
    return { message: `Client ${firmId} trimis către SS (în procesare)` }
  }

  function syncCreditFromSelectSoft(firmId) {
    api.customers.syncSS(firmId).catch(() => {})
  }

  // ── Survey ──
  function getSurveyResult(firmId) {
    const firm = db.firms.find(f => f.id === firmId)
    return firm?.survey_result || null
  }

  // ── Generic db update ──
  function updateDb(updater) {
    setDb(prev => {
      if (typeof updater === 'function') {
        const copy = { ...prev }
        updater(copy)
        return copy
      }
      return { ...prev, ...updater }
    })
  }

  // ── Computed ──
  const pendingApprovals = (db.firms || []).filter(f => f.status === 'in_aprobare').length
  const pendingOrders = (db.orders || []).filter(o => o.status === 'in_aprobare').length
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
      // Customers
      registerNewClient, approveFirm, rejectFirm, updateFirm,
      // Delegates
      addDelegate, updateDelegate, deactivateDelegate, generateOnboardingToken,
      // Credit
      getCreditLimit, saveCreditLimit, checkCreditLimit, syncCreditFromSelectSoft,
      // Products
      updateProduct, addProduct, updateProductUom, addProductPrice, syncProductSelectSoft,
      // Pricing
      getPretPentruClient, setClientPricing,
      // Favorites
      toggleFavorite, isFavorite,
      // Promotions
      addPromotion, updatePromotion, togglePromotion,
      addPromotionRule, updatePromotionRule, togglePromotionRule,
      // Offers
      saveOffer, updateOfferStatus, deleteOffer,
      // Commission rules
      saveCommissionRule, deleteCommissionRule, toggleCommissionRule,
      // Locations
      saveLocation, setDefaultLocation,
      // UoM
      saveUom,
      // Recipes
      saveRecipe,
      // Exchange
      getExchangeRate, updateExchangeRate,
      // SelectSoft
      syncClientsFromSelectSoft, syncProductsFromSelectSoft, createClientInSelectSoft,
      // Survey
      getSurveyResult,
      // Generic
      updateDb,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => useContext(StoreContext)
