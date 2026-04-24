import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'

const ROLES = [
  { key: 'staff', label: 'Staff', icon: '👤' },
  { key: 'admin', label: 'Admin', icon: '🔐' },
]

export default function LoginPage() {
  const { profile, signInWithPin, signInAsAdmin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('staff')
  const [depts, setDepts] = useState([])
  const [staff, setStaff] = useState([])
  const [dept, setDept] = useState('')
  const [person, setPerson] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (profile) navigate('/') }, [profile])
  useEffect(() => {
    supabase.from('departments').select('id,name').order('name')
      .then(({ data }) => setDepts(data || []))
  }, [])
  useEffect(() => {
    if (!dept) { setStaff([]); setPerson(null); return }
    supabase.from('staff_directory')
      .select('id,full_name,mobile,pin,department_id,departments(name)')
      .eq('department_id', dept).eq('is_active', true).order('full_name')
      .then(({ data }) => { setStaff(data || []); setPerson(null) })
  }, [dept])

  async function doStaffLogin() {
    if (!person) { setError('Please select your name.'); return }
    setLoading(true)
    // Sign in without PIN — just select name and go
    const session = {
      id: person.id, full_name: person.full_name, mobile: person.mobile,
      role: 'staff', department_id: person.department_id,
      department_name: person.departments?.name, source: 'staff_directory',
    }
    localStorage.setItem('crbs_session', JSON.stringify(session))
    window.location.href = '/'
  }

  async function doAdminLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await signInAsAdmin(username, password)
    setLoading(false)
    if (error) { setError(error.message) } else { navigate('/') }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: 15, fontFamily: 'inherit', color: '#0d1b2a',
    background: '#fff', outline: 'none',
    transition: 'border-color .15s',
    colorScheme: 'light', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
    paddingRight: 36,
  }
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: '#94a3b8',
    letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 6, display: 'block'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f2f5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/crbs-logo.png" alt="ABMH" style={{ height: 64, display: 'block', margin: '0 auto 14px' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0d1b2a', letterSpacing: -0.5, lineHeight: 1.2, margin: 0 }}>
            Aditya Birla Memorial Hospital
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6, fontWeight: 500, letterSpacing: 0.3 }}>
            Conference Room Booking Portal
          </p>
        </div>

        {/* Role selector */}
        <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 14, padding: 4, gap: 4, marginBottom: 20 }}>
          {ROLES.map(r => (
            <button key={r.key} onClick={() => { setMode(r.key); setError('') }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 7, padding: '10px 16px',
                background: mode === r.key ? '#c0392b' : 'transparent',
                color: mode === r.key ? '#fff' : '#64748b',
                border: 'none', borderRadius: 10,
                fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'all .2s',
                boxShadow: mode === r.key ? '0 2px 8px rgba(192,57,43,.35)' : 'none',
              }}>
              <span style={{ fontSize: 16 }}>{r.icon}</span>{r.label}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: '#fff', borderRadius: 18,
          boxShadow: '0 4px 24px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)',
          padding: '28px 28px 24px', marginBottom: 16
        }}>
          {mode === 'staff' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Department</label>
                <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
                  <option value="">Select your department</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Employee Name</label>
                <select value={person?.id || ''} disabled={!dept}
                  onChange={e => setPerson(staff.find(s => s.id === e.target.value) || null)}
                  style={{ ...inputStyle, opacity: !dept ? 0.5 : 1 }}>
                  <option value="">{!dept ? 'Select department first' : staff.length === 0 ? 'No staff found' : 'Select your name'}</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button onClick={doStaffLogin} disabled={loading || !person}
                style={{
                  width: '100%', padding: '14px', marginTop: 4,
                  background: !person ? '#e2e8f0' : '#c0392b',
                  color: !person ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  cursor: !person ? 'not-allowed' : 'pointer',
                  transition: 'all .2s', letterSpacing: 0.3,
                  boxShadow: !person ? 'none' : '0 4px 14px rgba(192,57,43,.4)',
                }}>
                {loading ? 'Signing in...' : 'Continue →'}
              </button>
            </div>
          ) : (
            <form onSubmit={doAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Username</label>
                <input type="text" value={username} placeholder="Enter username"
                  onChange={e => setUsername(e.target.value)}
                  style={{ ...inputStyle, backgroundImage: 'none', paddingRight: 16 }} required autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} placeholder="Enter password"
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, backgroundImage: 'none', paddingRight: 16 }} required />
              </div>
              {error && (
                <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px', marginTop: 4,
                  background: loading ? '#e2e8f0' : '#c0392b',
                  color: loading ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all .2s', letterSpacing: 0.3,
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(192,57,43,.4)',
                }}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#cbd5e1' }}>
          Aditya Birla Memorial Hospital · CRBS v2.0
        </p>
      </div>
    </div>
  )
}
