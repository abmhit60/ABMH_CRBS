import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useNotifications } from '../auth/NotificationsContext'
import NotificationPanel from './NotificationPanel'
import { supabase } from '../../lib/supabase'

const IC = {
  dash: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  cal:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  book: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  appr: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  rpt:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  out:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 6, display: 'block' }
const pinInputStyle = { width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 22, fontFamily: 'monospace', color: '#0d1b2a', background: '#fff', outline: 'none', letterSpacing: 8, textAlign: 'center', boxSizing: 'border-box' }

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const [drawer, setDrawer] = useState(false)
  const [notif, setNotif] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const navigate = useNavigate()
  const isOwner = profile?.source === 'supabase_auth'

  const navItems = [
    ...(isOwner ? [{ to: '/', label: 'Dashboard', short: 'Home', icon: IC.dash, end: true }] : []),
    { to: isOwner ? '/calendar' : '/', label: 'Calendar', short: 'Calendar', icon: IC.cal, end: !isOwner },
    { to: '/my-bookings', label: 'My Bookings', short: 'Bookings', icon: IC.book },
    ...(isOwner ? [
      { to: '/approvals', label: 'Approvals', short: 'Approve', icon: IC.appr },
      { to: '/reports', label: 'Reports', short: 'Reports', icon: IC.rpt },
    ] : []),
  ]

  async function logout() { await signOut(); navigate('/login') }

  function openPinModal() { setPinModal(true); setNewPin(''); setConfirmPin(''); setPinMsg('') }
  function closePinModal() { setPinModal(false); setNewPin(''); setConfirmPin(''); setPinMsg('') }

  async function doChangePin() {
    if (!newPin || newPin.length < 4) { setPinMsg('PIN must be at least 4 digits.'); return }
    if (newPin !== confirmPin) { setPinMsg('PINs do not match.'); return }
    setPinLoading(true); setPinMsg('')
    const { error } = await supabase.from('staff_directory')
      .update({ pin: newPin }).eq('id', profile.id)
    setPinLoading(false)
    if (error) { setPinMsg('Failed to update PIN. Try again.'); return }
    setNewPin(''); setConfirmPin('')
    setPinMsg('✓ PIN changed successfully!')
    setTimeout(() => closePinModal(), 1500)
  }

  const NavList = ({ onClick }) => navItems.map(item => (
    <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClick}>
      {item.icon}{item.label}
    </NavLink>
  ))

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-icon">CR</div>
          <div><div className="sb-title">CRBS</div><div className="sb-sub">ABMH</div></div>
        </div>
        <nav className="sb-nav"><NavList /></nav>
        <div className="sb-footer">
          <div className="u-avatar">{profile?.full_name?.[0] ?? '?'}</div>
          <div className="u-info">
            <div className="u-name">{profile?.full_name}</div>
            <div className="u-role">{profile?.role ?? 'staff'}</div>
          </div>
          {!isOwner && (
            <button className="so-btn" onClick={openPinModal} title="Change PIN" style={{ marginRight: 2 }}>🔑</button>
          )}
          <button className="so-btn" onClick={logout} title="Sign out">{IC.out}</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">Conference Room Booking</span>
          <div className="topbar-right">
            <button className="notif-btn" onClick={() => setNotif(v => !v)}>
              {IC.bell}{unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(isOwner ? '/calendar' : '/')}>+ Book</button>
            {notif && <NotificationPanel onClose={() => setNotif(false)} />}
          </div>
        </header>

        <header className="mob-header">
          <button className="ham-btn" onClick={() => setDrawer(true)}>{IC.menu}</button>
          <span className="mob-title">ABMH CRBS</span>
          <button className="mob-notif" onClick={() => setNotif(v => !v)}>
            {IC.bell}{unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
        </header>

        <div className="page-body"><Outlet /></div>

        <nav className="bot-nav">
          <div className="bot-nav-items">
            {navItems.slice(0, 4).map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `bot-nav-item${isActive ? ' active' : ''}`}>
                {item.icon}<span>{item.short}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <>
          <div className="drawer-ov" onClick={() => setDrawer(false)} />
          <div className="drawer">
            <div className="drawer-head">
              <div className="u-avatar" style={{ width: 44, height: 44, fontSize: 18, flexShrink: 0 }}>{profile?.full_name?.[0] ?? '?'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{profile?.full_name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{profile?.department_name ?? profile?.role}</div>
              </div>
            </div>
            <nav className="drawer-nav"><NavList onClick={() => setDrawer(false)} /></nav>
            <div className="drawer-foot" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!isOwner && (
                <button onClick={() => { openPinModal(); setDrawer(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(192,57,43,.15)', color: '#fca5a5', border: '1px solid rgba(192,57,43,.2)', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                  🔑 Change PIN
                </button>
              )}
              <button onClick={logout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(220,38,38,.15)', color: '#f87171', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                {IC.out} Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notification panel */}
      {notif && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, padding: '64px 8px 0' }}>
          <NotificationPanel onClose={() => setNotif(false)} />
        </div>
      )}

      {/* Change PIN Modal */}
      {pinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={closePinModal}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0d1b2a', marginBottom: 4 }}>🔑 Change PIN</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>{profile?.full_name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>New PIN</label>
                <input type="password" inputMode="numeric" maxLength={6}
                  value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••" autoFocus style={pinInputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Confirm PIN</label>
                <input type="password" inputMode="numeric" maxLength={6}
                  value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••" style={pinInputStyle} />
              </div>
              {pinMsg && (
                <div style={{ fontSize: 13, color: pinMsg.startsWith('✓') ? '#059669' : '#dc2626', fontWeight: 500 }}>
                  {pinMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={closePinModal}
                  style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={doChangePin} disabled={pinLoading}
                  style={{ flex: 1, padding: '12px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(192,57,43,.4)' }}>
                  {pinLoading ? 'Saving...' : 'Save PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
