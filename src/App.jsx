import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Login from './pages/Login'

// Lazy-load: fiecare pagină devine un chunk separat → bundle inițial mic, încărcare rapidă
const Onboarding      = lazy(() => import('./pages/Onboarding'))
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const ComandaNoua     = lazy(() => import('./pages/ComandaNoua'))
const ComenzileMele   = lazy(() => import('./pages/ComenzileMele'))
const Produse         = lazy(() => import('./pages/Produse'))
const Favorite        = lazy(() => import('./pages/Favorite'))
const Profil          = lazy(() => import('./pages/Profil'))
const ClientRapoarte  = lazy(() => import('./pages/ClientRapoarte'))
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'))
const AdminComenzi    = lazy(() => import('./pages/AdminComenzi'))
const AdminComandaNoua= lazy(() => import('./pages/AdminComandaNoua'))
const AdminClienti    = lazy(() => import('./pages/AdminClienti'))
const AdminProduse    = lazy(() => import('./pages/AdminProduse'))
const AdminPromotii   = lazy(() => import('./pages/AdminPromotii'))
const AdminRuleBuilder= lazy(() => import('./pages/AdminRuleBuilder'))
const AdminOferta     = lazy(() => import('./pages/AdminOferta'))
const AdminOferte     = lazy(() => import('./pages/AdminOferte'))
const AdminRapoarte   = lazy(() => import('./pages/AdminRapoarte'))
const AdminComisioane = lazy(() => import('./pages/AdminComisioane'))
const AdminLocatii    = lazy(() => import('./pages/AdminLocatii'))
const AdminUoM        = lazy(() => import('./pages/AdminUoM'))
const AdminSurvey     = lazy(() => import('./pages/AdminSurvey'))
const AdminBannere    = lazy(() => import('./pages/AdminBannere'))

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text3)', fontSize: 13 }}>
      Se încarcă…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  )
}
