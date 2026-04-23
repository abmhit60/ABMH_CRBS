import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'

export default function LoginPage() {
  const { profile, signInWithPin, signInAsAdmin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('staff')
  const [depts, setDepts] = useState([])
  const [staff, setStaff] = useState([])
  const [dept, setDept] = useState('')
  const [person, setPerson] = useState(null)
  const [pin, setPin] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (profile) navigate('/') }, [profile])
  useEffect(() => {
    supabase.from('departments').select('id,name').order('name').then(({ data }) => setDepts(data || []))
  }, [])
  useEffect(() => {
    if (!dept) { setStaff([]); setPerson(null); return }
    supabase.from('staff_directory').select('id,full_name,mobile,pin,department_id,departments(name)')
      .eq('department_id', dept).eq('is_active', true).order('full_name')
      .then(({ data }) => { setStaff(data || []); setPerson(null); setPin('') })
  }, [dept])

  async function doStaffLogin() {
    if (!person) { setError('Please select your name.'); return }
    if (pin.length !== 4) { setError('Enter your 4-digit PIN.'); return }
    setLoading(true)
    const { error } = await signInWithPin(person, pin)
    setLoading(false)
    if (error) { setError(error.message); setPin('') } else navigate('/')
  }

  async function doAdminLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await signInAsAdmin(username, password)
    setLoading(false)
    if (error) setError(error.message) else navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <img src="/crbs-logo.png" alt="ABMH CRBS" className="login-logo" />
        <div className="login-tabs">
          <button className={mode === 'staff' ? 'ltab active' : 'ltab'} onClick={() => { setMode('staff'); setError(''); setPin('') }}>Staff</button>
          <button className={mode === 'admin' ? 'ltab active' : 'ltab'} onClick={() => { setMode('admin'); setError('') }}>Admin / Owner</button>
        </div>

        {mode === 'staff' ? (
          <div className="login-form">
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Welcome</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Select your department and name, then enter your PIN</p>
            </div>
            <div className="field">
              <label>Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)}>
                <option value="">Select department...</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Your Name</label>
              <select value={person?.id || ''} disabled={!dept}
                onChange={e => { setPerson(staff.find(s => s.id === e.target.value) || null); setPin('') }}>
                <option value="">{!dept ? 'Select department first' : staff.length === 0 ? 'No staff found' : 'Select your name...'}</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            {person && (
              <div className="field">
                <label>PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                  placeholder="Enter 4-digit PIN" autoFocus />
              </div>
            )}
            {error && <div className="err-msg">{error}</div>}
            <button className="btn-login" onClick={doStaffLogin} disabled={loading || !person || pin.length !== 4}>
              {loading ? 'Signing in...' : 'Continue →'}
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={doAdminLogin}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Admin Access</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Sign in with your credentials</p>
            </div>
            <div className="field">
              <label>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div className="err-msg">{error}</div>}
            <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        )}
      </div>
      <div className="login-bg" />
    </div>
  )
}
