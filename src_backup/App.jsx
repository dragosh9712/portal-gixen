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
import AdminOferta from './pages/AdminOferta'
import AdminOferte from './pages/AdminOferte'
import AdminRuleBuilder from './pages/AdminRuleBuilder'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard', '/comanda-noua': 'Comandă nouă', '/comenzile-mele': 'Comenzile mele',
  '/produse': 'Produse & prețuri', '/favorite': 'Favorite', '/rapoarte': 'Rapoarte', '/profil': 'Profil firmă',
  '/admin/dashboard': 'Dashboard Admin', '/admin/comenzi': 'Comenzi', '/admin/clienti': 'Clienți',
  '/admin/produse': 'Produse', '/admin/promotii': 'Promoții', '/admin/rapoarte': 'Rapoarte',
  '/admin/oferta': 'Generator ofertă', '/admin/oferte': 'Oferte emise', '/admin/promotii-rules': 'Motor promoții',
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

const A = ({ role, children }) => <RequireAuth role={role}>{children}</RequireAuth>

export default function App() {
  return (
    <BrowserRouter>
      <TitleUpdater />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/dashboard"        element={<A role="client"><Dashboard /></A>} />
        <Route path="/comanda-noua"     element={<A role="client"><ComandaNoua /></A>} />
        <Route path="/comenzile-mele"   element={<A role="client"><ComenzileMele /></A>} />
        <Route path="/produse"          element={<A role="client"><Produse /></A>} />
        <Route path="/favorite"         element={<A role="client"><Favorite /></A>} />
        <Route path="/rapoarte"         element={<A role="client"><ClientRapoarte /></A>} />
        <Route path="/profil"           element={<A role="client"><Profil /></A>} />
        <Route path="/admin/dashboard"  element={<A role="admin"><AdminDashboard /></A>} />
        <Route path="/admin/comenzi"    element={<A role="admin"><AdminComenzi /></A>} />
        <Route path="/admin/clienti"    element={<A role="admin"><AdminClienti /></A>} />
        <Route path="/admin/produse"    element={<A role="admin"><AdminProduse /></A>} />
        <Route path="/admin/promotii"   element={<A role="admin"><AdminPromotii /></A>} />
        <Route path="/admin/rapoarte"   element={<A role="admin"><AdminRapoarte /></A>} />
        <Route path="/admin/oferta"     element={<A role="admin"><AdminOferta /></A>} />
        <Route path="/admin/oferte"     element={<A role="admin"><AdminOferte /></A>} />
        <Route path="/admin/promotii-rules" element={<A role="admin"><AdminRuleBuilder /></A>} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
