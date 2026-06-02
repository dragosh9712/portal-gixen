import { createContext, useContext, useState } from 'react'
import db from './db.json'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gixen_user')
    return saved ? JSON.parse(saved) : null
  })

  function login(email, password) {
    const found = db.users.find(u => u.email === email && u.password === password)
    if (!found) return { ok: false, error: 'Email sau parolă incorecte.' }
    if (found.role === 'client') {
      const firm = db.firms.find(f => f.id === found.firmId)
      if (firm?.status === 'in_aprobare') return { ok: false, error: 'Contul tău este în așteptarea aprobării. Te contactăm în curând.' }
    }
    const session = { ...found, password: undefined }
    setUser(session)
    localStorage.setItem('gixen_user', JSON.stringify(session))
    return { ok: true }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('gixen_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
