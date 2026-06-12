import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useStore } from './StoreContext'
import { GixenLogo } from './GixenLogo'
import GlobalSearch from './components/GlobalSearch'
import { getInitials } from './utils'

function Icon({ name }) {
  const icons = {
    dashboard:   <><rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></>,
    order:       <><path d="M4 2h8.5L17 6.5V18H4V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    orders:      <path d="M3 5h14M3 10h14M3 15h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    products:    <><path d="M10 2L17 6v8l-7 4L3 14V6l7-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 2v12M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5"/></>,
    clients:     <><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 18c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15 9c1.657 0 3 1.343 3 3s-1.343 3-3 3M18 18c0-1.657-.895-3-2-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    promotions:  <><path d="M3 10.5L10 3l7 7.5V18H3v-7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7.5 18v-5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></>,
    profile:     <><circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    rulebuilder: <><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    oferte:      <><path d="M9 2H4a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V7l-5-5H9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M13 2v5h5M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    offer:       <><path d="M4 2h8.5L17 6.5V18H4V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 9h6M7 12h6M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    chart:       <path d="M3 17V11M7 17V7M11 17V9M15 17V5M19 17H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    heart:       <path d="M10 17s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>,
    agent:       <><circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 18v-1a4 4 0 014-4h4a4 4 0 014 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    location:    <><path d="M10 2C7.239 2 5 4.239 5 7c0 4.418 5 11 5 11s5-6.582 5-11c0-2.761-2.239-5-5-5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/></>,
    uom:         <><path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15 12l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    recipe:      <><path d="M9 3H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V9l-7-6z" stroke="currentColor" strokeWidth="1.5"/><path d="M9 3v6h7M7 12h6M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    survey:      <><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    megaphone:   <><path d="M3 8v4M3 10h12l3-5v10l-3-5H3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 14v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    support:     <><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 14v-1c0-1.5 1.5-2 2.5-3s1-3.5-2.5-3.5S7.5 8 7.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="16" r="0.8" fill="currentColor"/></>,
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.7 }}>
      {icons[name]}
    </svg>
  )
}

export default function Layout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth()
  const { totalPending, pendingApprovals, pendingOrders } = useStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const clientNav = [
    { to: '/dashboard',       label: 'Dashboard',       icon: 'dashboard' },
    { to: '/comanda-noua',    label: 'Comandă nouă',    icon: 'order' },
    { to: '/comenzile-mele',  label: 'Comenzile mele',  icon: 'orders' },
    { to: '/produse',         label: 'Produse & prețuri', icon: 'products' },
    { to: '/favorite',        label: 'Favorite',         icon: 'heart' },
    { to: '/rapoarte',        label: 'Rapoartele mele',  icon: 'chart' },
    { to: '/profil',          label: 'Profil firmă',     icon: 'profile' },
    { to: '/suport',          label: 'Suport',           icon: 'support' },
  ]

  const adminNav = [
    { to: '/admin/dashboard',      label: 'Dashboard',          icon: 'dashboard', badge: totalPending > 0 ? totalPending : null },
    { to: '/admin/comenzi',        label: 'Comenzi',            icon: 'orders',    badge: pendingOrders > 0 ? pendingOrders : null },
    { to: '/admin/comanda-noua',   label: 'Comandă nouă (client)', icon: 'order' },
    { to: '/admin/clienti',        label: 'Clienți',            icon: 'clients',   badge: pendingApprovals > 0 ? pendingApprovals : null },
    { to: '/admin/produse',        label: 'Produse',            icon: 'products' },
    { to: '/admin/promotii',       label: 'Promoții',           icon: 'promotions' },
    { to: '/admin/oferta',         label: 'Generator ofertă',   icon: 'offer' },
    { to: '/admin/oferte',         label: 'Oferte emise',       icon: 'oferte' },
    { to: '/admin/rapoarte',       label: 'Rapoarte',           icon: 'chart' },
    { label: '─', divider: true },
    { to: '/admin/comisioane',     label: 'Agenți & Comisioane', icon: 'agent' },
    { to: '/admin/locatii',        label: 'Locații',            icon: 'location' },
    { to: '/admin/uom',            label: 'Unități de măsură',  icon: 'uom' },
    { to: '/admin/survey',         label: 'Survey clienți',     icon: 'survey' },
    { to: '/admin/bannere',        label: 'Bannere promo',      icon: 'megaphone' },
    { to: '/admin/suport',         label: 'Suport clienți',     icon: 'support' },
  ]

  const navItems = isAdmin ? adminNav : clientNav
  const initials = getInitials(user?.name)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GixenLogo color="white" height={42} />
          <div className="logo-sub">{isAdmin ? 'Panou administrare' : 'Portal comenzi'}</div>
        </div>
        <nav className="nav-section">
          <div className="nav-label">{isAdmin ? 'Administrare' : 'Navigare'}</div>
          {navItems.map((item, i) => {
            if (item.divider) return <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 16px' }} />
            return (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                <Icon name={item.icon} />
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          {user?.currency === 'EUR' && (
            <div style={{ padding: '6px 16px', marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Valută cont</div>
              <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>EUR</div>
            </div>
          )}
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="uname">{user?.name}</div>
              <div className="urole">{isAdmin ? 'Administrator' : (user?.delegate_type === 'delegate' ? 'Delegat' : 'Client')}</div>
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
          <div className="flex gap-8" style={{ alignItems: 'center' }}>
            <GlobalSearch />
            {actions}
          </div>
        </div>
        <div className="page-body page-enter">{children}</div>
      </div>
    </div>
  )
}
