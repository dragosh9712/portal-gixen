import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

function NavIcon({ d }) {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const ICONS = {
  dashboard: 'M3 5a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm9 0a2 2 0 012-2h1a2 2 0 012 2v3a2 2 0 01-2 2h-1a2 2 0 01-2-2V5zm0 9a2 2 0 012-2h1a2 2 0 012 2v1a2 2 0 01-2 2h-1a2 2 0 01-2-2v-1zm-9 0a2 2 0 012-2h3a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1z',
  order: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  orders: 'M4 6h16M4 10h16M4 14h10',
  products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  clients: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  promotions: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
}

export default function Layout({ children, title, actions }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const clientNav = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/comanda-noua', label: 'Comandă nouă', icon: 'order' },
    { to: '/comenzile-mele', label: 'Comenzile mele', icon: 'orders' },
    { to: '/produse', label: 'Produse & prețuri', icon: 'products' },
    { to: '/profil', label: 'Profil firmă', icon: 'profile' },
  ]

  const adminNav = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/comenzi', label: 'Comenzi', icon: 'orders' },
    { to: '/admin/clienti', label: 'Clienți', icon: 'clients' },
    { to: '/admin/produse', label: 'Produse', icon: 'products' },
    { to: '/admin/promotii', label: 'Promoții', icon: 'promotions' },
  ]

  const navItems = isAdmin ? adminNav : clientNav

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo">portal.gixen.ro</div>
          <div className="logo-sub">{isAdmin ? 'Panou administrare' : 'Portal comenzi B2B'}</div>
        </div>

        <nav className="nav-section">
          <div className="nav-label">{isAdmin ? 'Administrare' : 'Meniu'}</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <NavIcon d={ICONS[item.icon]} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="uname">{user?.name}</div>
            <div className="urole">{isAdmin ? 'Administrator' : 'Client'}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Deconectare</button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="flex gap-8">{actions}</div>
        </div>
        <div className="page-body">
          {children}
        </div>
      </div>
    </div>
  )
}
