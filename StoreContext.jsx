// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from './apiClient'
import { getPretPentruClient as engineGetPret } from './promoEngine.js'

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
      const [orders, customers, products, promotions, agents, locations, exchange, offers, uoms, surveys, commRules] =
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
          api.commissionRules.list(),
        ])
      setDb(prev => ({
        ...prev,
        orders:           orders.status     === 'fulfilled' ? (orders.value || [])     : prev.orders,
        firms:            customers.status  === 'fulfilled' ? (customers.value || [])  : prev.firms,
        products:         products.status   === 'fulfilled' ? (products.value || [])   : prev.products,
        promotions:       promotions.status === 'fulfilled' ? (promotions.value || []) : prev.promotions,
        promotionRules:   promotions.status === 'fulfilled' ? (promotions.value || []).map(p => ({
          ...p,
          activ: !!p.is_active,
          conditii: p.conditions || [],
          actiune: (p.actions || [])[0] || {},
          combinabil: !!p.cumulative,
          prioritate: p.priority,
          tip: p.rule_type,
          customer_ids: p.customer_ids || [],
          restrictii: { dataStart: p.valid_from || null, dataEnd: p.valid_until || null },
        })) : prev.promotionRules,
        agents:           agents.status     === 'fulfilled' ? (agents.value || [])     : prev.agents,
        locations:        locations.status  === 'fulfilled' ? (locations.value || [])  : prev.locations,
        exchange:         exchange.status   === 'fulfilled' ? exchange.value           : prev.exchange,
        offers:           offers.status     === 'fulfilled' ? (offers.value || [])     : prev.offers,
        unit_of_measure:  uoms.status       === 'fulfilled' ? (uoms.value || [])       : prev.unit_of_measure,
        surveys:          surveys.status    === 'fulfilled' ? (surveys.value || [])    : prev.surveys,
        commission_rules: commRules.status  === 'fulfilled' ? (commRules.value || [])  : prev.commission_rules,
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

  async function createOrder(firmId, userId, lines, dataLivrare, observatii, adresaLivrare, discountLinii, extra) {
    const total = lines.reduce((s, l) => s + l.total, 0)
    const discTotal = (discountLinii || []).reduce((s, d) => s + d.valoare, 0)
    const created = await api.orders.create({
      customer_id: firmId,
      user_id: userId,
      lines,
      delivery_address: adresaLivrare || '',
      observations: observatii || '',
      payment_type: extra?.payment_type || 'OP',
      transport_type: extra?.transport_type || 'Van',
      total: Math.round((total + discTotal) * 100) / 100,
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
    await api.customers.addDelegate(firmId, delegateData)
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

  async function checkCreditLimit(firmId, orderTotal) {
    let creditData = null
    try { creditData = await api.customers.credit(firmId) } catch { return { ok: true } }
    const limit = creditData?.credit_limit || 0
    if (limit <= 0) return { ok: true }
    const available = creditData?.available_credit ?? (limit - (creditData?.used_credit || 0))
    const threshold = creditData?.notification_threshold_pct || 80
    const block = creditData?.block_on_exceed || false
    const used = creditData?.used_credit || 0
    const remaining = available
    const pctUsed = limit > 0 ? ((used + orderTotal) / limit) * 100 : 0
    if (orderTotal > remaining) {
      return { ok: !block, block, warning: true, limit, used, remaining, orderTotal, message: `Limită credit depășită! Disponibil: ${remaining.toFixed(2)} RON, comandă: ${orderTotal.toFixed(2)} RON` }
    }
    if (pctUsed >= threshold) {
      return { ok: true, warning: true, block: false, limit, used, remaining, orderTotal, message: `Atenție: ai utilizat ${pctUsed.toFixed(0)}% din limita de credit.` }
    }
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
    const result = await api.products.addPrice(productId, priceData)
    // Actualizează local produsul cu noul preț (fără re-fetch complet)
    setDb(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id !== productId) return p
        const oldPrices = (p.product_prices || []).map(pr => ({ ...pr, is_active: false }))
        const newPrice = { id: result.id || Date.now(), ...priceData, base_price_tva: result.base_price_tva, is_active: true, created_at: new Date().toISOString() }
        return { ...p, product_prices: [newPrice, ...oldPrices], active_base_price: priceData.base_price }
      })
    }))
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
  // Sursă unică de preț: delegă către motorul din promoEngine
  // (base_price + comision agent → discount contractual). FĂRĂ tier-discount.
  // Returnează preț per rolă, în RON. Conversia EUR se face la afișare.
  function getPretPentruClient(productOrId, firmOrId) {
    const product = typeof productOrId === 'string' ? (db.products || []).find(p => p.id === productOrId) : productOrId
    const firm    = typeof firmOrId    === 'string' ? (db.firms    || []).find(f => f.id === firmOrId)    : firmOrId
    if (!product) return 0
    return engineGetPret(product, firm, db)
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

  async function addPromotionRule(rule) {
    const apiPayload = {
      name: rule.name,
      rule_type: rule.tip || 'LINE_DISCOUNT',
      priority: rule.prioritate || 10,
      activa: rule.activ !== false,
      cumulative: !!rule.combinabil,
      conditions: rule.conditii || [],
      actions: rule.actiune ? [rule.actiune] : [],
    }
    const result = await api.promotions.save(apiPayload)
    const newRule = { ...rule, id: result?.id || 'rule_' + Date.now() }
    setDb(prev => ({ ...prev, promotionRules: [...(prev.promotionRules || []), newRule] }))
  }

  async function updatePromotionRule(id, data) {
    const apiPayload = {
      name: data.name,
      rule_type: data.tip || 'LINE_DISCOUNT',
      priority: data.prioritate || 10,
      activa: data.activ !== false,
      cumulative: !!data.combinabil,
      conditions: data.conditii || [],
      actions: data.actiune ? [data.actiune] : [],
    }
    await api.promotions.update(id, apiPayload)
    setDb(prev => ({ ...prev, promotionRules: (prev.promotionRules || []).map(r => r.id === id ? { ...r, ...data } : r) }))
  }

  async function togglePromotionRule(id) {
    const rule = db.promotionRules?.find(r => r.id === id)
    if (rule) await api.promotions.update(id, { activa: !rule.activ })
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

  // ── Agents CRUD ──
  async function createAgent(data) {
    const result = await api.agents.create(data)
    const newAgent = { id: result?.id || 'ag_' + Date.now(), ...data, is_active: true }
    setDb(prev => ({ ...prev, agents: [...(prev.agents || []), newAgent] }))
    // reload to get commission rule created by backend
    const updated = await api.agents.list()
    const updatedRules = await api.commissionRules.list()
    setDb(prev => ({ ...prev, agents: updated || prev.agents, commission_rules: updatedRules || prev.commission_rules }))
    return newAgent
  }

  async function updateAgent(id, data) {
    await api.agents.update(id, data)
    setDb(prev => ({ ...prev, agents: prev.agents.map(a => a.id === id ? { ...a, ...data } : a) }))
  }

  async function deleteAgent(id) {
    await api.agents.delete(id)
    setDb(prev => ({ ...prev, agents: prev.agents.filter(a => a.id !== id) }))
  }

  // ── Commission Rules ──
  async function saveCommissionRule(rule) {
    if (rule.id && !rule.id.startsWith('cr_fake')) {
      // update existing
      await api.commissionRules.update(rule.id, rule)
      setDb(prev => ({
        ...prev,
        commission_rules: (prev.commission_rules || []).map(r => r.id === rule.id ? { ...r, ...rule } : r),
      }))
    } else {
      // create new
      const result = await api.commissionRules.create(rule)
      const newRule = { ...rule, id: result?.id || 'cr_' + Date.now(), is_active: 1 }
      setDb(prev => ({ ...prev, commission_rules: [...(prev.commission_rules || []), newRule] }))
    }
  }

  async function addCommissionRule(rule) {
    const result = await api.commissionRules.create(rule)
    const newRule = { ...rule, id: result?.id || 'cr_' + Date.now(), is_active: 1 }
    setDb(prev => {
      const rules = [...(prev.commissionRules || [])]
      rules.push(newRule)
      return { ...prev, commissionRules: rules, commission_rules: [...(prev.commission_rules || []), newRule] }
    })
  }

  async function deleteCommissionRule(id) {
    await api.commissionRules.delete(id)
    setDb(prev => ({
      ...prev,
      commissionRules: (prev.commissionRules || []).filter(r => r.id !== id),
      commission_rules: (prev.commission_rules || []).filter(r => r.id !== id),
    }))
  }

  async function toggleCommissionRule(id) {
    const rule = (db.commission_rules || []).find(r => r.id === id)
    const newActive = rule ? !rule.is_active : false
    await api.commissionRules.update(id, { is_active: newActive })
    setDb(prev => ({
      ...prev,
      commission_rules: (prev.commission_rules || []).map(r => r.id === id ? { ...r, is_active: newActive ? 1 : 0 } : r),
    }))
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
      // Agents
      createAgent, updateAgent, deleteAgent,
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
      saveCommissionRule, addCommissionRule, deleteCommissionRule, toggleCommissionRule,
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
