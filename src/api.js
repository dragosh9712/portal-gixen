const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

let _token = localStorage.getItem('gixen_token') || null

export function setToken(t) {
  _token = t
  t ? localStorage.setItem('gixen_token', t) : localStorage.removeItem('gixen_token')
}
export function getToken() { return _token }

async function req(method, path, body = null, isFormData = false) {
  const headers = {}
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 || (res.status === 403 && path !== '/api/auth/login')) {
    setToken(null)
    localStorage.removeItem('gixen_user')
    window.location.href = '/login'
    return
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const api = {
  auth: {
    login: (email, password) => req('POST', '/api/auth/login', { email, password }),
    me:    ()                 => req('GET',  '/api/auth/me'),
  },
  products: {
    list:        (params = {})    => req('GET',  '/api/products?' + new URLSearchParams(params)),
    get:         id               => req('GET',  `/api/products/${id}`),
    create:      data             => req('POST', '/api/products', data),
    update:      (id, data)       => req('PUT',  `/api/products/${id}`, data),
    syncSS:      id               => req('POST', `/api/products/${id}/selectsoft`),
    uploadImage: async (productId, file) => {
      const form = new FormData()
      form.append('image', file)
      return req('POST', `/api/upload/product-image/${productId}`, form, true)
    },
    deleteImage: id               => req('DELETE', `/api/upload/product-image/${id}`),
  },
  customers: {
    list:   ()             => req('GET',  '/api/customers'),
    get:    id             => req('GET',  `/api/customers/${id}`),
    create: data           => req('POST', '/api/customers', data),
    update: (id, data)     => req('PUT',  `/api/customers/${id}`, data),
    syncSS: id             => req('POST', `/api/customers/${id}/selectsoft`),
    credit: id             => req('GET',  `/api/credit/${id}`),
    setCredit: (id, data)  => req('PUT',  `/api/credit/${id}`, data),
  },
  orders: {
    list:      (p = {})             => req('GET',  '/api/orders?' + new URLSearchParams(p)),
    get:       id                   => req('GET',  `/api/orders/${id}`),
    create:    data                 => req('POST', '/api/orders', data),
    setStatus: (id, status, locId)  => req('PUT',  `/api/orders/${id}/status`, { status, location_id: locId }),
    addNote:   (id, text)           => req('POST', `/api/orders/${id}/notes`, { text }),
  },
  agents: {
    list:   ()           => req('GET',    '/api/agents'),
    create: data         => req('POST',   '/api/agents', data),
    update: (id, data)   => req('PUT',    `/api/agents/${id}`, data),
    delete: id           => req('DELETE', `/api/agents/${id}`),
  },
  offers: {
    list:   ()           => req('GET',  '/api/offers'),
    save:   data         => req('POST', '/api/offers', data),
    update: (id, data)   => req('PUT',  `/api/offers/${id}`, data),
  },
  exchange: {
    get:        ()       => req('GET',  '/api/exchange'),
    refreshBNR: ()       => req('POST', '/api/exchange/refresh'),
  },
  locations: {
    list: ()             => req('GET', '/api/locations'),
  },
  promotions: {
    list:   ()           => req('GET',  '/api/promotions'),
    save:   data         => req('POST', '/api/promotions', data),
    update: (id, data)   => req('PUT',  `/api/promotions/${id}`, data),
  },
}

export default api
