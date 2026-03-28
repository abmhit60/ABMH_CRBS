import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [rooms, setRooms] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('rooms')

  useEffect(() => {
    supabase.from('rooms').select('*').order('name').then(({ data }) => setRooms(data || []))
    supabase.from('profiles').select('*, departments(name)').order('full_name').then(({ data }) => setUsers(data || []))
  }, [])

  async function toggleRoom(id, is_active) {
    await supabase.from('rooms').update({ is_active: !is_active }).eq('id', id)
    setRooms(prev => prev.map(r => r.id === id ? { ...r, is_active: !is_active } : r))
  }

  async function updateUserRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-sub">Manage rooms and user roles</p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={tab === 'rooms' ? 'tab active' : 'tab'} onClick={() => setTab('rooms')}>Rooms</button>
        <button className={tab === 'users' ? 'tab active' : 'tab'} onClick={() => setTab('users')}>Users</button>
      </div>

      {tab === 'rooms' && (
        <div className="admin-table card">
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Amenities</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.location}</td>
                  <td>{r.capacity}</td>
                  <td>{r.amenities?.join(', ')}</td>
                  <td>
                    <span className={`badge ${r.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-outline-sm" onClick={() => toggleRoom(r.id, r.is_active)}>
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-table card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.full_name}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.departments?.name ?? '—'}</td>
                  <td>
                    <select className="select-sm" value={u.role}
                      onChange={e => updateUserRole(u.id, e.target.value)}>
                      <option value="staff">Staff</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
