import { Navigate } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from localStorage instantly — no async needed
    try {
      const saved = localStorage.getItem('crbs_session')
      if (saved) setProfile(JSON.parse(saved))
    } catch {}
    setLoading(false)
  }, [])

  // Staff login — uses staff_directory, no Supabase auth needed
  // Change 4: Store a session token tied to the device to prevent URL forwarding abuse
  async function signInWithMobile(staffMember) {
    // staffMember comes directly from staff_directory table
    const session = {
      id: staffMember.id,
      full_name: staffMember.full_name,
      mobile: staffMember.mobile,
      department_id: staffMember.department_id,
      department_name: staffMember.departments?.name,
      role: 'staff',
      source: 'staff_directory',
      session_token: btoa(`${staffMember.mobile}-${Date.now()}-${Math.random()}`),
      logged_in_at: new Date().toISOString(),
    }
    localStorage.setItem('crbs_session', JSON.stringify(session))
    setProfile(session)
    return { error: null }
  }

  // Owner/admin username+password login via Supabase Auth
  // Maps simple usernames to actual email addresses
  const USERNAME_MAP = {
    'admin': 'healthcare@adityabirla.com',
    'smita': 'healthcare@adityabirla.com',
  }

  async function signInWithEmail(username, password) {
    const email = USERNAME_MAP[username.toLowerCase()] || username
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    if (data.user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*, departments(name)')
        .eq('id', data.user.id)
        .single()
      if (p) {
        const session = {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          department_id: p.department_id,
          department_name: p.departments?.name,
          source: 'supabase_auth',
        }
        localStorage.setItem('crbs_session', JSON.stringify(session))
        setProfile(session)
      }
    }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('crbs_session')
    setProfile(null)
  }

  const user = profile ? { id: profile.id } : null

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithMobile, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// ── Notifications ──────────────────────────────────────────
const NotifContext = createContext({})

export function NotificationsProvider({ children }) {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!profile || profile.source !== 'supabase_auth') {
      setNotifications([]); setUnreadCount(0); return
    }
    supabase.from('notifications').select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        setNotifications(data || [])
        setUnreadCount((data || []).filter(n => !n.is_read).length)
      })
    const channel = supabase.channel('notifs_' + profile.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        setNotifications(p => [payload.new, ...p])
        setUnreadCount(p => p + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  async function markAllRead() {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', profile.id).eq('is_read', false)
    setNotifications(p => p.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotifications = () => useContext(NotifContext)

// ── Protected Route ────────────────────────────────────────
export default function ProtectedRoute({ children, requiredRole }) {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12, color:'#94a3b8' }}>
      <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTopColor:'#1e40af', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p>Loading...</p>
    </div>
  )

  if (!profile) return <Navigate to="/login" replace />
  if (requiredRole && profile.role !== requiredRole && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}
