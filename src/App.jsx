import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import ComandaNoua from './pages/ComandaNoua'
import ComenzileMele from './pages/ComenzileMele'
import Produse from './pages/Produse'
import Profil from './pages/Profil'
import AdminDashboard from './pages/AdminDashboard'
import AdminComenzi from './pages/AdminComenzi'
import AdminClienti from './pages/AdminClienti'
import AdminProduse from './pages/AdminProduse'
import AdminPromotii from './pages/AdminPromotii'

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
  }
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/dashboard" element={<RequireAuth role="client"><Dashboard /></RequireAuth>} />
        <Route path="/comanda-noua" element={<RequireAuth role="client"><ComandaNoua /></RequireAuth>} />
        <Route path="/comenzile-mele" element={<RequireAuth role="client"><ComenzileMele /></RequireAuth>} />
        <Route path="/produse" element={<RequireAuth role="client"><Produse /></RequireAuth>} />
        <Route path="/profil" element={<RequireAuth role="client"><Profil /></RequireAuth>} />
        <Route path="/admin/dashboard" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/comenzi" element={<RequireAuth role="admin"><AdminComenzi /></RequireAuth>} />
        <Route path="/admin/clienti" element={<RequireAuth role="admin"><AdminClienti /></RequireAuth>} />
        <Route path="/admin/produse" element={<RequireAuth role="admin"><AdminProduse /></RequireAuth>} />
        <Route path="/admin/promotii" element={<RequireAuth role="admin"><AdminPromotii /></RequireAuth>} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
