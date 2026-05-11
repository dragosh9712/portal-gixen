import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const GIXEN_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 83.56 49.28"><path d="M59.89,34.59h.07c.24-.34.54-.68.91-1.01.37-.33.78-.62,1.25-.87.47-.25.99-.46,1.55-.61.57-.16,1.17-.23,1.8-.23s1.19.07,1.76.2c.56.14,1.08.35,1.55.64.47.29.88.67,1.24,1.13.36.47.64,1.02.85,1.65.12.36.19.74.23,1.16.04.41.06.9.06,1.45v10.76h-4.06v-10.14c0-.44-.02-.82-.05-1.14-.04-.32-.09-.6-.19-.84-.2-.53-.51-.9-.93-1.13-.42-.23-.92-.34-1.51-.34-.79,0-1.54.19-2.27.56-.72.37-1.36.91-1.92,1.62v11.42h-4.06v-16.57h3.36l.37,2.3ZM48.21,35.02c-.51,0-.97.09-1.37.28-.4.19-.74.44-1.03.77-.29.33-.52.71-.69,1.14-.18.43-.29.89-.34,1.38h6.52c0-.49-.06-.95-.2-1.38-.13-.43-.32-.81-.58-1.14-.26-.33-.58-.58-.96-.77-.39-.19-.83-.28-1.34-.28ZM49.84,46.02c.79,0,1.61-.08,2.46-.23.86-.16,1.72-.39,2.6-.68v3.22c-.52.23-1.33.44-2.41.65-1.08.2-2.21.3-3.37.3s-2.29-.15-3.35-.46c-1.05-.3-1.97-.79-2.77-1.46-.79-.67-1.41-1.55-1.88-2.62-.46-1.07-.7-2.37-.7-3.9s.22-2.82.65-3.95c.43-1.13,1.02-2.06,1.75-2.8.73-.74,1.56-1.3,2.51-1.67.94-.37,1.92-.55,2.92-.55s2.02.16,2.91.48c.88.32,1.65.82,2.3,1.5.65.68,1.15,1.56,1.51,2.63.36,1.08.54,2.35.54,3.82-.01.57-.03,1.05-.05,1.45h-10.87c.06.77.23,1.42.51,1.97.29.54.65.99,1.12,1.33.46.34,1,.59,1.61.74.62.16,1.28.23,2,.23ZM33.49,43.1l-4.28,5.76h-4.65l6.55-8.45-6.15-8.12h4.77l3.87,5.47,3.94-5.47h4.79l-6.33,8.11,6.51,8.47h-4.74l-4.26-5.76ZM21.07,32.29h4.06v16.57h-4.06v-16.57ZM15.24,40.1h-5.13v-3.5h9.34v11.55c-.34.13-.78.26-1.31.4-.53.13-1.12.26-1.78.37-.65.11-1.33.2-2.03.26-.7.07-1.38.11-2.07.11-2.06,0-3.85-.27-5.38-.83-1.54-.55-2.81-1.33-3.83-2.34-1.02-1-1.79-2.2-2.3-3.59-.51-1.39-.76-2.92-.76-4.6,0-1.19.13-2.32.4-3.4.27-1.08.67-2.08,1.19-3,.52-.92,1.16-1.75,1.9-2.49.74-.74,1.59-1.38,2.55-1.9.95-.52,1.99-.92,3.13-1.2,1.13-.28,2.35-.42,3.65-.42,1.15,0,2.25.08,3.29.25,1.03.16,1.89.37,2.55.6v3.53c-.89-.27-1.79-.48-2.69-.62-.91-.15-1.82-.22-2.74-.22-1.24,0-2.41.19-3.49.55-1.09.37-2.02.92-2.81,1.65-.79.72-1.42,1.62-1.87,2.68-.46,1.06-.68,2.29-.68,3.68.01,2.7.72,4.74,2.11,6.09,1.4,1.35,3.38,2.03,5.95,2.03.48,0,.98-.02,1.48-.08.51-.05.96-.12,1.35-.2v-5.37Z"/></svg>`

function Icon({ name }) {
  const icons = {
    dashboard: (
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    order: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M4 2h8.5L17 6.5V18H4V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h14M3 15h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    products: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 2L17 6v8l-7 4L3 14V6l7-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M10 2v12M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    clients: (
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 18c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 9c1.657 0 3 1.343 3 3s-1.343 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M18 18c0-1.657-.895-3-2-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    promotions: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M3 10.5L10 3l7 7.5V18H3v-7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7.5 18v-5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M13 3h4v14h-4M8 13l4-3-4-3M12 10H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }
  return <svg className="nav-icon" viewBox="0 0 20 20" fill="none">{icons[name]?.props?.children}</svg>
}

export default function Layout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const clientNav = [
    { to: '/dashboard',      label: 'Dashboard',        icon: 'dashboard' },
    { to: '/comanda-noua',   label: 'Comandă nouă',     icon: 'order' },
    { to: '/comenzile-mele', label: 'Comenzile mele',   icon: 'orders' },
    { to: '/produse',        label: 'Produse & prețuri', icon: 'products' },
    { to: '/profil',         label: 'Profil firmă',     icon: 'profile' },
  ]
  const adminNav = [
    { to: '/admin/dashboard', label: 'Dashboard',  icon: 'dashboard' },
    { to: '/admin/comenzi',   label: 'Comenzi',    icon: 'orders' },
    { to: '/admin/clienti',   label: 'Clienți',    icon: 'clients' },
    { to: '/admin/produse',   label: 'Produse',    icon: 'products' },
    { to: '/admin/promotii',  label: 'Promoții',   icon: 'promotions' },
  ]
  const navItems = isAdmin ? adminNav : clientNav

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div dangerouslySetInnerHTML={{ __html: GIXEN_LOGO }} />
          <div className="logo-sub">{isAdmin ? 'Panou administrare' : 'Portal comenzi'}</div>
        </div>

        <nav className="nav-section">
          <div className="nav-label">{isAdmin ? 'Administrare' : 'Navigare'}</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="uname">{user?.name}</div>
              <div className="urole">{isAdmin ? 'Administrator' : 'Client'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login') }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M13 3h4v14h-4M8 13l4-3-4-3M12 10H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Deconectare
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>
          <div className="flex gap-8">{actions}</div>
        </div>
        <div className="page-body">{children}</div>
      </div>
    </div>
  )
}
