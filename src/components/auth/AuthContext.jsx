import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    try { const s = localStorage.getItem('crbs_session'); if (s) setProfile(JSON.parse(s)) } catch {}
    setLoading(false)
  }, [])

  async function signInWithPin(staff, pin) {
    if (!staff.pin || String(staff.pin).trim() !== String(pin).trim())
      return { error: { message: 'Incorrect PIN. Please try again.' } }
    const session = { id: staff.id, full_name: staff.full_name, mobile: staff.mobile, role: 'staff', department_id: staff.department_id, department_name: staff.departments?.name, source: 'staff_directory' }
    localStorage.setItem('crbs_session', JSON.stringify(session))
    setProfile(session); return { error: null }
  }

 async function signInAsAdmin(username, password) {
  const ADMINS = {
    'admin': { password: 'admin123', name: 'Smita Hule', role: 'owner' },
    'smita': { password: 'admin123', name: 'Smita Hule', role: 'owner' }
  }
  const admin = ADMINS[username.toLowerCase().trim()]
  if (!admin) return { error: { message: 'Invalid username.' } }
  if (admin.password !== password) return { error: { message: 'Incorrect password.' } }

  // Sign in via Supabase Auth to get real UUID
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'healthcare@adityabirla.com',
    password: password,
  })
  if (error) return { error: { message: 'Admin auth failed. Check Supabase credentials.' } }

  const session = {
    id: data.user.id,  // real UUID now
    full_name: admin.name,
    role: admin.role,
    source: 'supabase_auth'
  }
  localStorage.setItem('crbs_session', JSON.stringify(session))
  setProfile(session)
  return { error: null }
}

  async function signOut() {
    await supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('crbs_session'); setProfile(null)
  }

  return <Ctx.Provider value={{ profile, loading, signInWithPin, signInAsAdmin, signOut }}>{children}</Ctx.Provider>
}

export function ProtectedRoute({ children, ownerOnly }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!profile) { window.location.href = '/login'; return null }
  if (ownerOnly && profile.source !== 'supabase_auth') return <div className="empty-state">Access denied.</div>
  return children
}
