const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

let _token = localStorage.getItem('gixen_token') || sessionStorage.getItem('gixen_token') || null

// remember=true → localStorage (persistă după închiderea browserului)
// remember=false → sessionStorage (sesiune doar pe tab-ul curent)
export function setToken(t, remember = true) {
  _token = t
  localStorage.removeItem('gixen_token')
  sessionStorage.removeItem('gixen_token')
  if (t) (remember ? localStorage : sessionStorage).setItem('gixen_token', t)
}
export function getToken() { return _token }

// Rute publice de auth — un 401 aici NU trebuie să redirecționeze către login
const PUBLIC_AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password']

async function req(method, path, body = null, isFormData = false) {
  const headers = {}
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const isPublicAuth = PUBLIC_AUTH_PATHS.some(p => path === p || path.startsWith(p + '?'))
  if ((res.status === 401 || res.status === 403) && !isPublicAuth) {
    setToken(null)
    localStorage.removeItem('gixen_user')
    sessionStorage.removeItem('gixen_user')
    window.location.href = '/login'
    return
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const api = {
  auth: {
    login:    (email, password) => req('POST', '/api/auth/login', { email, password }),
    register: data              => req('POST', '/api/auth/register', data),
    me:       ()                => req('GET',  '/api/auth/me'),
    changePassword: (currentPassword, newPassword) => req('PUT', '/api/auth/change-password', { currentPassword, newPassword }),
    resetPassword: (userId, newPassword) => req('PUT', `/api/auth/reset-password/${userId}`, { newPassword }),
    forgotPassword:     email              => req('POST', '/api/auth/forgot-password', { email }),
    resetPasswordToken: (token, newPassword) => req('POST', '/api/auth/reset-password', { token, newPassword }),
  },
  products: {
    list:   (params = {})     => req('GET',  '/api/products?' + new URLSearchParams(params)),
    get:    id                 => req('GET',  `/api/products/${id}`),
    create: data               => req('POST', '/api/products', data),
    update: (id, data)         => req('PUT',  `/api/products/${id}`, data),
    syncSS: id                 => req('POST', `/api/products/${id}/selectsoft`),
    uploadImage: async (productId, file) => {
      const form = new FormData()
      form.append('image', file)
      return req('POST', `/api/upload/product-image/${productId}`, form, true)
    },
    deleteImage: id            => req('DELETE', `/api/upload/product-image/${id}`),
  },
  customers: {
    list:     ()               => req('GET',  '/api/customers'),
    get:      id               => req('GET',  `/api/customers/${id}`),
    create:   data             => req('POST', '/api/customers', data),
    update:   (id, data)       => req('PUT',  `/api/customers/${id}`, data),
    syncSS:      id               => req('POST', `/api/customers/${id}/selectsoft`),
    credit:      id               => req('GET',  `/api/credit/${id}`),
    setCredit:   (id, data)       => req('PUT',  `/api/credit/${id}`, data),
    addDelegate: (id, data)       => req('POST', `/api/customers/${id}/delegate`, data),
    delegates:   id               => req('GET',  `/api/customers/${id}/delegates`),
    notes:       id               => req('GET',  `/api/customers/${id}/notes`),
    addNote:     (id, text)       => req('POST', `/api/customers/${id}/notes`, { text }),
    delNote:     (id, noteId)     => req('DELETE', `/api/customers/${id}/notes/${noteId}`),
  },
  selectsoft: {
    test:          () => req('GET',  '/api/selectsoft/test'),
    syncProducts:  () => req('POST', '/api/selectsoft/sync-products'),
    syncCustomers: () => req('POST', '/api/selectsoft/sync-customers'),
    importHistory: (opts = {}) => req('POST', '/api/selectsoft/import-history', opts),
  },
  orders: {
    list:      (p = {})        => req('GET',  '/api/orders?' + new URLSearchParams(p)),
    get:       id              => req('GET',  `/api/orders/${id}`),
    create:    data            => req('POST', '/api/orders', data),
    setStatus: (id, status, locationId) => req('PUT', `/api/orders/${id}/status`, { status, location_id: locationId }),
    addNote:   (id, text)      => req('POST', `/api/orders/${id}/notes`, { text }),
    checkPayment: id           => req('POST', `/api/orders/${id}/check-payment`),
    proforma:  id              => req('GET',  `/api/orders/${id}/proforma`),
    pushSS:    (id, proforma)  => req('POST', `/api/orders/${id}/push-selectsoft`, { proforma }),
  },
  agents: {
    list:   ()                 => req('GET',  '/api/agents'),
    create: data               => req('POST', '/api/agents', data),
    update: (id, data)         => req('PUT',  `/api/agents/${id}`, data),
    delete: id                 => req('DELETE',`/api/agents/${id}`),
  },
  offers: {
    list:   ()                 => req('GET',  '/api/offers'),
    save:   data               => req('POST', '/api/offers', data),
    update: (id, data)         => req('PUT',  `/api/offers/${id}`, data),
  },
  exchange: {
    get:        ()             => req('GET',  '/api/exchange'),
    set:        rate           => req('PUT',  '/api/exchange', { rate }),
    refreshBNR: ()             => req('POST', '/api/exchange/refresh'),
  },
  locations: {
    list:       ()             => req('GET',  '/api/locations'),
    create:     data           => req('POST', '/api/locations', data),
    update:     (id, data)     => req('PUT',  `/api/locations/${id}`, data),
    setDefault: id             => req('PUT',  `/api/locations/${id}/default`, {}),
  },
  promotions: {
    list:   ()                 => req('GET',  '/api/promotions'),
    save:   data               => req('POST', '/api/promotions', data),
    update: (id, data)         => req('PUT',  `/api/promotions/${id}`, data),
  },
  commissionRules: {
    list:   ()             => req('GET',    '/api/agents/commission-rules'),
    create: data           => req('POST',   '/api/agents/commission-rules', data),
    update: (id, data)     => req('PUT',    `/api/agents/commission-rules/${id}`, data),
    delete: id             => req('DELETE', `/api/agents/commission-rules/${id}`),
  },
  surveys: {
    list:        ()          => req('GET',  '/api/surveys'),
    create:      data        => req('POST', '/api/surveys', data),
    update:      (id, data)  => req('PUT',  `/api/surveys/${id}`, data),
    addQuestion: (id, data)  => req('POST', `/api/surveys/${id}/questions`, data),
    delQuestion: id          => req('DELETE',`/api/surveys/questions/${id}`),
    results:     ()          => req('GET',  '/api/surveys/results'),
    submit:      (id, ans)   => req('POST', `/api/surveys/${id}/submit`, { answers: ans }),
  },
  credit: {
    get:    id                 => req('GET',  `/api/credit/${id}`),
    update: (id, data)         => req('PUT',  `/api/credit/${id}`, data),
  },
  uom: {
    list:   ()                 => req('GET',  '/api/uom'),
    create: data               => req('POST', '/api/uom', data),
    update: (id, data)         => req('PUT',  `/api/uom/${id}`, data),
  },
}

export default api
