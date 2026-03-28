import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/ProtectedRoute'
import { useNotifications } from '../auth/ProtectedRoute'
import NotificationPanel from '../notifications/NotificationPanel'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const [showNotifs, setShowNotifs] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  const navItems = [
    ...(isOwnerOrAdmin ? [{ to: '/', label: 'Dashboard', short: 'Home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }] : []),
    { to: isOwnerOrAdmin ? '/calendar' : '/', label: 'Calendar', short: 'Calendar', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { to: '/book', label: 'New Booking', short: 'Book', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { to: '/my-bookings', label: 'My Bookings', short: 'Bookings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    ...(isOwnerOrAdmin ? [{ to: '/approvals', label: 'Approvals', short: 'Approve', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> }] : []),
    ...(isOwnerOrAdmin ? [{ to: '/reports', label: 'Reports', short: 'Reports', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }] : []),
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin', short: 'Admin', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> }] : []),
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">CR</div>
          <div><div className="brand-title">CRBS</div><div className="brand-sub">ABMH</div></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">{profile?.full_name?.[0] ?? '?'}</div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name}</div>
            <div className="user-role">{profile?.role}</div>
          </div>
          <button className="sign-out-btn" onClick={handleSignOut} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)} style={{ display: 'none' }} id="hamburger">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span style={{ fontWeight: 600, fontSize: 14, display: 'none' }} id="mobile-brand">ABMH CRBS</span>
          </div>
          <div className="topbar-right">
            <button className="notif-btn" onClick={() => setShowNotifs(v => !v)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
            <div className="mobile-menu" onClick={e => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <div className="user-avatar" style={{ width: 44, height: 44, fontSize: 18, flexShrink: 0 }}>{profile?.full_name?.[0] ?? '?'}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{profile?.full_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{profile?.role}{profile?.department_name ? ` · ${profile.department_name}` : ''}</div>
                  {profile?.mobile && <div style={{ fontSize: 12, color: '#94a3b8' }}>{profile.mobile}</div>}
                </div>
              </div>
              <nav style={{ flex: 1 }}>
                {navItems.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'}
                    className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}
                    onClick={() => setMenuOpen(false)}>
                    {item.icon}{item.label}
                  </NavLink>
                ))}
              </nav>
              <div style={{ padding: 16, borderTop: '1px solid #e2e8f0' }}>
                <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="page-body"><Outlet /></div>
        {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
      </main>

      <nav className="mobile-bottom-nav" id="bottom-nav" style={{ display: 'none' }}>
        {navItems.slice(0, 4).map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}>
            {item.icon}
            <span>{item.short}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          #hamburger { display: flex !important; }
          #mobile-brand { display: block !important; }
          #bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
