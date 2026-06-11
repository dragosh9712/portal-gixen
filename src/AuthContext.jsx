import { createContext, useContext, useState } from 'react'
import api, { setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gixen_user') || sessionStorage.getItem('gixen_user')
    return saved ? JSON.parse(saved) : null
  })

  async function login(email, password, remember = true) {
    try {
      const data = await api.auth.login(email, password)
      setToken(data.token, remember)
      const userObj = { ...data.user }
      setUser(userObj)
      localStorage.removeItem('gixen_user')
      sessionStorage.removeItem('gixen_user')
      ;(remember ? localStorage : sessionStorage).setItem('gixen_user', JSON.stringify(userObj))
      if (remember) localStorage.setItem('gixen_remember_email', email)
      else localStorage.removeItem('gixen_remember_email')
      return { ok: true, user: userObj }
    } catch (err) {
      return { ok: false, error: err.message || 'Email sau parolă incorecte.' }
    }
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('gixen_user')
    sessionStorage.removeItem('gixen_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
