import { createContext, useContext, useState } from 'react'
import api, { setToken } from './apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gixen_user')
    return saved ? JSON.parse(saved) : null
  })

  async function login(email, password) {
    try {
      const data = await api.auth.login(email, password)
      setToken(data.token)
      const userObj = { ...data.user }
      setUser(userObj)
      localStorage.setItem('gixen_user', JSON.stringify(userObj))
      return { ok: true, user: userObj }
    } catch (err) {
      return { ok: false, error: err.message || 'Email sau parolă incorecte.' }
    }
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('gixen_user')
    localStorage.removeItem('gixen_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
