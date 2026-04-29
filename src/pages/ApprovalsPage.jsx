import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format, parseISO } from 'date-fns'

export default function ApprovalsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [rejecting, setRejecting] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [moving, setMoving] = useState(null)
  const [reason, setReason] = useState('')
  const [rf, setRf] = useState({ date: '', start: '', end: '' })
  const [newRoomId, setNewRoomId] = useState('')

  useEffect(() => { fetchBookings(); fetchRooms() }, [])

  async function fetchBookings() {
    const { data } = await supabase.from('bookings').select('*, rooms(name)').order('start_time', { ascending: false })
    setBookings(data || []); setLoading(false)
  }

  async function fetchRooms() {
    const { data } = await supabase.from('rooms').select('*').eq('is_active', true).order('name')
    setRooms(data || [])
  }

  async function approve(id) {
    await supabase.from('bookings').update({ status: 'confirmed', reviewed_at: new Date().toISOString() }).eq('id', id)
    fetchBookings()
  }

  async function reject(id) {
    await supabase.from('bookings').update({ status: 'rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason || null }).eq('id', id)
    setRejecting(null); setReason(''); fetchBookings()
  }

  async function cancelConfirmed(id) {
    await supabase.from('bookings').update({ status: 'cancelled', rejection_reason: reason || 'Cancelled by admin' }).eq('id', id)
    setRejecting(null); setReason(''); fetchBookings()
  }

  async function reschedule(id) {
    const s = new Date(`${rf.date}T${rf.start}`), e = new Date(`${rf.date}T${rf.end}`)
    if (e <= s) { alert('End time must be after start.'); return }
    await supabase.from('bookings').update({ start_time: s.toISOString(), end_time: e.toISOString(), status: 'confirmed' }).eq('id', id)
    setRescheduling(null); fetchBookings()
  }

  async function moveRoom(id) {
    if (!newRoomId) { alert('Please select a room.'); return }
    await supabase.from('bookings').update({ room_id: newRoomId }).eq('id', id)
    setMoving(null); setNewRoomId(''); fetchBookings()
  }

  const statuses = ['pending', 'confirmed', 'rejected', 'cancelled', 'all']
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Approvals</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{pendingCount > 0 ? `${pendingCount} pending` : 'All caught up!'}</p>
      </div>
      <div className="scroll-tabs">
        {statuses.map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(s)} style={{ textTransform: 'capitalize', flexShrink: 0 }}>
            {s}{s === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-msg">Loading...</div> : filtered.length === 0
        ? <div className="empty-state">No {filter} bookings.</div>
        : filtered.map(b => (
          <div key={b.id} className="card bcard" style={{ borderLeft: `3px solid ${b.status === 'confirmed' ? 'var(--confirmed)' : b.status === 'rejected' ? 'var(--danger)' : b.status === 'cancelled' ? 'var(--cancelled)' : 'var(--pending)'}`, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{b.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
                  {b.rooms?.name} · <strong>{b.requester_name}</strong>{b.requester_dept ? ` · ${b.requester_dept}` : ''}
                </div>
              </div>
              <span className={`badge badge-${b.status === 'confirmed' ? 'confirmed' : b.status === 'pending' ? 'pending' : b.status === 'rejected' ? 'rejected' : 'cancelled'}`}>{b.status}</span>
            </div>
            <div className="bcard-meta">
              <span>📅 {format(new Date(b.start_time), 'EEE dd MMM yyyy')}</span>
              <span>🕐 {format(new Date(b.start_time), 'hh:mm a')} – {format(new Date(b.end_time), 'hh:mm a')}</span>
              <span>👥 {b.attendees_count}</span>
              {b.requester_mobile && <span>📱 {b.requester_mobile}</span>}
            </div>
            {b.rejection_reason && <div style={{ marginTop: 8, padding: '7px 12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>Note: {b.rejection_reason}</div>}

            {/* PENDING ACTIONS */}
            {b.status === 'pending' && (
              rejecting === b.id
                ? <div className="reject-form">
                    <input type="text" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
                    <div className="reject-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => { setRejecting(null); setReason('') }}>Cancel</button>
                      <button className="btn btn-danger btn-sm" onClick={() => reject(b.id)}>Confirm Reject</button>
                    </div>
                  </div>
                : new Date(b.end_time) > new Date() ? (
  <div className="bcard-actions" style={{ marginTop: 10 }}>
    <button className="btn btn-success btn-sm" onClick={() => approve(b.id)}>✓ Approve</button>
    <button className="btn btn-danger btn-sm" onClick={() => setRejecting(b.id)}>✕ Reject</button>
  </div>
) : (
  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>⏰ Meeting time has passed</div>
)
            )}

            {/* CONFIRMED ACTIONS */}
            {b.status === 'confirmed' && (
              rescheduling === b.id
                ? <div className="reject-form" style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📅 Reschedule Booking</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div className="field"><label>Date</label><input type="date" value={rf.date} style={{ colorScheme: 'light' }} onChange={e => setRf(f => ({ ...f, date: e.target.value }))} /></div>
                      <div className="field"><label>Start</label><input type="time" value={rf.start} onChange={e => setRf(f => ({ ...f, start: e.target.value }))} /></div>
                      <div className="field"><label>End</label><input type="time" value={rf.end} onChange={e => setRf(f => ({ ...f, end: e.target.value }))} /></div>
                    </div>
                    <div className="reject-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => setRescheduling(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => reschedule(b.id)}>Confirm</button>
                    </div>
                  </div>
                : moving === b.id
                  ? <div className="reject-form" style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🚪 Move to Another Room</p>
                      <div className="field">
                        <label>Select Room</label>
                        <select value={newRoomId} onChange={e => setNewRoomId(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', colorScheme: 'light' }}>
                          <option value="">Select a room...</option>
                          {rooms.filter(r => r.id !== b.room_id).map(r => (
                            <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>
                          ))}
                        </select>
                      </div>
                      <div className="reject-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => { setMoving(null); setNewRoomId('') }}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={() => moveRoom(b.id)}>Move Room</button>
                      </div>
                    </div>
                  : rejecting === b.id
                    ? <div className="reject-form" style={{ marginTop: 12 }}>
                        <input type="text" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
                        <div className="reject-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => { setRejecting(null); setReason('') }}>Back</button>
                          <button className="btn btn-danger btn-sm" onClick={() => cancelConfirmed(b.id)}>Cancel Booking</button>
                        </div>
                      </div>
                    : new Date(b.end_time) > new Date() ? (
  <div className="bcard-actions" style={{ marginTop: 10 }}>
    <button className="btn btn-outline btn-sm" onClick={() => { setRescheduling(b.id); setRf({ date: format(new Date(b.start_time), 'yyyy-MM-dd'), start: format(new Date(b.start_time), 'HH:mm'), end: format(new Date(b.end_time), 'HH:mm') }) }}>📅 Reschedule</button>
    <button className="btn btn-outline btn-sm" onClick={() => { setMoving(b.id); setNewRoomId('') }}>🚪 Move Room</button>
    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => setRejecting(b.id)}>✕ Cancel</button>
  </div>
) : (
  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>✓ Meeting completed</div>
)
            )}
          </div>
        ))
      }
    </div>
  )
}
