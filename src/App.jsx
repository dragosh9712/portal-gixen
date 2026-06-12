import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import ComandaNoua from './pages/ComandaNoua'
import ComenzileMele from './pages/ComenzileMele'
import Produse from './pages/Produse'
import Favorite from './pages/Favorite'
import Profil from './pages/Profil'
import ClientRapoarte from './pages/ClientRapoarte'
import AdminDashboard from './pages/AdminDashboard'
import AdminComenzi from './pages/AdminComenzi'
import AdminComandaNoua from './pages/AdminComandaNoua'
import AdminClienti from './pages/AdminClienti'
import AdminProduse from './pages/AdminProduse'
import AdminPromotii from './pages/AdminPromotii'
import AdminRuleBuilder from './pages/AdminRuleBuilder'
import AdminOferta from './pages/AdminOferta'
import AdminOferte from './pages/AdminOferte'
import AdminRapoarte from './pages/AdminRapoarte'
import AdminComisioane from './pages/AdminComisioane'
import AdminLocatii from './pages/AdminLocatii'
import AdminUoM from './pages/AdminUoM'
import AdminSurvey from './pages/AdminSurvey'
import AdminBannere from './pages/AdminBannere'

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/reset-parola" element={<ForgotPassword />} />

        {/* Client routes */}
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/comanda-noua" element={<RequireAuth><ComandaNoua /></RequireAuth>} />
        <Route path="/comenzile-mele" element={<RequireAuth><ComenzileMele /></RequireAuth>} />
        <Route path="/produse" element={<RequireAuth><Produse /></RequireAuth>} />
        <Route path="/favorite" element={<RequireAuth><Favorite /></RequireAuth>} />
        <Route path="/profil" element={<RequireAuth><Profil /></RequireAuth>} />
        <Route path="/rapoarte" element={<RequireAuth><ClientRapoarte /></RequireAuth>} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/comenzi" element={<RequireAuth role="admin"><AdminComenzi /></RequireAuth>} />
        <Route path="/admin/comanda-noua" element={<RequireAuth role="admin"><AdminComandaNoua /></RequireAuth>} />
        <Route path="/admin/clienti" element={<RequireAuth role="admin"><AdminClienti /></RequireAuth>} />
        <Route path="/admin/produse" element={<RequireAuth role="admin"><AdminProduse /></RequireAuth>} />
        <Route path="/admin/promotii" element={<RequireAuth role="admin"><AdminPromotii /></RequireAuth>} />
        <Route path="/admin/promotii/rules" element={<RequireAuth role="admin"><AdminRuleBuilder /></RequireAuth>} />
        <Route path="/admin/oferta" element={<RequireAuth role="admin"><AdminOferta /></RequireAuth>} />
        <Route path="/admin/oferte" element={<RequireAuth role="admin"><AdminOferte /></RequireAuth>} />
        <Route path="/admin/rapoarte" element={<RequireAuth role="admin"><AdminRapoarte /></RequireAuth>} />
        <Route path="/admin/comisioane" element={<RequireAuth role="admin"><AdminComisioane /></RequireAuth>} />
        <Route path="/admin/locatii" element={<RequireAuth role="admin"><AdminLocatii /></RequireAuth>} />
        <Route path="/admin/uom" element={<RequireAuth role="admin"><AdminUoM /></RequireAuth>} />
        <Route path="/admin/survey" element={<RequireAuth role="admin"><AdminSurvey /></RequireAuth>} />
        <Route path="/admin/bannere" element={<RequireAuth role="admin"><AdminBannere /></RequireAuth>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
