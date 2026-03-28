import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/ProtectedRoute'

export default function LoginPage() {
  const { signInWithMobile, signInWithEmail, profile } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [staffList, setStaffList] = useState([])
  const [mode, setMode] = useState('staff')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [ownerForm, setOwnerForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) { navigate('/'); return }
    // Fetch departments immediately on mount
    supabase.from('departments').select('id, name').order('name')
      .then(({ data }) => setDepartments(data || []))
  }, [profile])

  useEffect(() => {
    if (!selectedDept) { setStaffList([]); setSelectedStaff(null); return }
    // Fetch only needed fields for speed
    supabase.from('staff_directory')
      .select('id, full_name, mobile, department_id')
      .eq('department_id', selectedDept)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => { setStaffList(data || []); setSelectedStaff(null) })
  }, [selectedDept])

  async function handleStaffLogin(e) {
    e.preventDefault()
    if (!selectedStaff) { setError('Please select your name.'); return }
    setError(''); setLoading(true)
    const { error } = await signInWithMobile(selectedStaff)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  async function handleOwnerLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await signInWithEmail(ownerForm.email, ownerForm.password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <img src="/crbs-logo.png" alt="ABMH CRBS" />
      </div>
      <div className="login-right">
        <div className="login-box">
          <div className="login-tabs">
            <button className={mode === 'staff' ? 'login-tab active' : 'login-tab'} onClick={() => { setMode('staff'); setError('') }}>Staff Login</button>
            <button className={mode === 'owner' ? 'login-tab active' : 'login-tab'} onClick={() => { setMode('owner'); setError('') }}>Admin / Owner</button>
          </div>
          {mode === 'staff' ? (
            <form onSubmit={handleStaffLogin} className="login-form">
              <div><h3>Welcome</h3><p>Select your department and name to continue</p></div>
              <div className="field">
                <label>Department</label>
                <select className="select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)} required>
                  <option value="">Select your department...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Your Name</label>
                <select className="select" value={selectedStaff?.id || ''}
                  onChange={e => setSelectedStaff(staffList.find(s => s.id === e.target.value) || null)}
                  required disabled={!selectedDept}>
                  <option value="">{!selectedDept ? 'Select department first' : staffList.length === 0 ? 'No staff in this department' : 'Select your name...'}</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              {selectedStaff && (
                <div className="mobile-display">
                  <span className="mobile-label">📱 Mobile</span>
                  <span className="mobile-value">{selectedStaff.mobile}</span>
                </div>
              )}
              {error && <div className="error-msg">{error}</div>}
              <button type="submit" className="btn-login" disabled={loading || !selectedStaff}>
                {loading ? 'Please wait...' : 'Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOwnerLogin} className="login-form">
              <div><h3>Admin Access</h3><p>Sign in with your credentials</p></div>
              <div className="field">
                <label>Username</label>
                <input type="text" value={ownerForm.email} onChange={e => setOwnerForm(f => ({ ...f, email: e.target.value }))} placeholder="admin" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={ownerForm.password} onChange={e => setOwnerForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
