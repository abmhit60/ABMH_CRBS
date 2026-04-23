import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [tab, setTab] = useState('staff')
  const [staff, setStaff] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPin, setNewPin] = useState({})

  useEffect(() => {
    Promise.all([
      supabase.from('staff_directory').select('*, departments(name)').order('full_name'),
      supabase.from('rooms').select('*').order('name'),
    ]).then(([s, r]) => { setStaff(s.data || []); setRooms(r.data || []); setLoading(false) })
  }, [])

  async function resetPin(id, pin) {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) { alert('PIN must be exactly 4 digits.'); return }
    await supabase.from('staff_directory').update({ pin }).eq('id', id)
    setNewPin(p => ({ ...p, [id]: '' })); alert('PIN updated!')
  }

  async function toggleRoom(id, current) {
    await supabase.from('rooms').update({ is_active: !current }).eq('id', id)
    setRooms(r => r.map(x => x.id === id ? { ...x, is_active: !current } : x))
  }

  if (loading) return <div className="loading-msg">Loading...</div>

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Admin Panel</h1>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {['staff', 'rooms'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: tab === t ? 'var(--brand)' : 'var(--text-2)', borderBottom: `2px solid ${tab === t ? 'var(--brand)' : 'transparent'}`, marginBottom: -1, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'staff' && (
        <div>
          {staff.map(s => (
            <div key={s.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.departments?.name} · {s.mobile}</div>
                </div>
                <span className={`badge ${s.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN"
                  value={newPin[s.id] || ''}
                  onChange={e => setNewPin(p => ({ ...p, [s.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={() => resetPin(s.id, newPin[s.id])}>Set PIN</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'rooms' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {rooms.map(r => (
            <div key={r.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                <span className={`badge ${r.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>📍 {r.location || '—'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>👥 Capacity: {r.capacity}</div>
              <button className="btn btn-sm" style={{ width: '100%', background: r.is_active ? 'var(--danger-bg)' : 'var(--success-bg)', color: r.is_active ? 'var(--danger)' : 'var(--success)', border: `1px solid ${r.is_active ? '#fca5a5' : '#86efac'}` }}
                onClick={() => toggleRoom(r.id, r.is_active)}>
                {r.is_active ? '🔴 Deactivate Room' : '🟢 Activate Room'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
