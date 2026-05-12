import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './AuthContext'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import ComandaNoua from './pages/ComandaNoua'
import ComenzileMele from './pages/ComenzileMele'
import Produse from './pages/Produse'
import Profil from './pages/Profil'
import Favorite from './pages/Favorite'
import ClientRapoarte from './pages/ClientRapoarte'
import AdminDashboard from './pages/AdminDashboard'
import AdminComenzi from './pages/AdminComenzi'
import AdminClienti from './pages/AdminClienti'
import AdminProduse from './pages/AdminProduse'
import AdminPromotii from './pages/AdminPromotii'
import AdminRapoarte from './pages/AdminRapoarte'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard', '/comanda-noua': 'Comandă nouă', '/comenzile-mele': 'Comenzile mele',
  '/produse': 'Produse & prețuri', '/favorite': 'Favorite', '/rapoarte': 'Rapoarte', '/profil': 'Profil firmă',
  '/admin/dashboard': 'Dashboard Admin', '/admin/comenzi': 'Comenzi', '/admin/clienti': 'Clienți',
  '/admin/produse': 'Produse', '/admin/promotii': 'Promoții', '/admin/rapoarte': 'Rapoarte',
}

function TitleUpdater() {
  const location = useLocation()
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'portal.gixen.ro'
    document.title = `${title} | portal.gixen.ro`
  }, [location])
  return null
}

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
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
      <TitleUpdater />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/dashboard" element={<RequireAuth role="client"><Dashboard /></RequireAuth>} />
        <Route path="/comanda-noua" element={<RequireAuth role="client"><ComandaNoua /></RequireAuth>} />
        <Route path="/comenzile-mele" element={<RequireAuth role="client"><ComenzileMele /></RequireAuth>} />
        <Route path="/produse" element={<RequireAuth role="client"><Produse /></RequireAuth>} />
        <Route path="/favorite" element={<RequireAuth role="client"><Favorite /></RequireAuth>} />
        <Route path="/rapoarte" element={<RequireAuth role="client"><ClientRapoarte /></RequireAuth>} />
        <Route path="/profil" element={<RequireAuth role="client"><Profil /></RequireAuth>} />
        <Route path="/admin/dashboard" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/comenzi" element={<RequireAuth role="admin"><AdminComenzi /></RequireAuth>} />
        <Route path="/admin/clienti" element={<RequireAuth role="admin"><AdminClienti /></RequireAuth>} />
        <Route path="/admin/produse" element={<RequireAuth role="admin"><AdminProduse /></RequireAuth>} />
        <Route path="/admin/promotii" element={<RequireAuth role="admin"><AdminPromotii /></RequireAuth>} />
        <Route path="/admin/rapoarte" element={<RequireAuth role="admin"><AdminRapoarte /></RequireAuth>} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
