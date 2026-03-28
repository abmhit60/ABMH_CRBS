import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/ProtectedRoute'
import { format, parseISO } from 'date-fns'

export default function ApprovalsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [rejecting, setRejecting] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [reason, setReason] = useState('')
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', start_hour: '', end_hour: '' })

  useEffect(() => { fetchBookings() }, [])

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, rooms(name, location)')
      .order('start_time', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function approve(id) {
    const { error } = await supabase.from('bookings').update({
      status: 'confirmed',
      reviewed_by: profile?.id || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) alert(error.message)
    else fetchBookings()
  }

  async function reject(id) {
    const { error } = await supabase.from('bookings').update({
      status: 'rejected',
      reviewed_by: profile?.id || null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    }).eq('id', id)
    if (error) alert(error.message)
    else { setRejecting(null); setReason(''); fetchBookings() }
  }

  async function cancelConfirmed(id) {
    if (!confirm('Cancel this confirmed booking?')) return
    const { error } = await supabase.from('bookings').update({
      status: 'cancelled',
      reviewed_by: profile?.id || null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || 'Cancelled by room owner',
    }).eq('id', id)
    if (error) alert(error.message)
    else { setRejecting(null); setReason(''); fetchBookings() }
  }

  async function reschedule(id) {
    if (!rescheduleForm.date || !rescheduleForm.start_hour || !rescheduleForm.end_hour) {
      alert('Please fill in all fields.'); return
    }
    const start_time = new Date(`${rescheduleForm.date}T${rescheduleForm.start_hour}:00`)
    const end_time = new Date(`${rescheduleForm.date}T${rescheduleForm.end_hour}:00`)
    if (end_time <= start_time) { alert('End time must be after start time.'); return }

    const { error } = await supabase.from('bookings').update({
      start_time: start_time.toISOString(),
      end_time: end_time.toISOString(),
      status: 'confirmed',
      reviewed_by: profile?.id || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) alert(error.message)
    else { setRescheduling(null); setRescheduleForm({ date: '', start_hour: '', end_hour: '' }); fetchBookings() }
  }

  function openReschedule(b) {
    setRescheduling(b.id)
    setRescheduleForm({
      date: format(parseISO(b.start_time), 'yyyy-MM-dd'),
      start_hour: format(parseISO(b.start_time), 'HH:mm'),
      end_hour: format(parseISO(b.end_time), 'HH:mm'),
    })
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  const statusColor = { pending: 'badge-warning', confirmed: 'badge-success', rejected: 'badge-danger', cancelled: 'badge-neutral' }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-sub">{pendingCount > 0 ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} awaiting review` : 'All caught up!'}</p>
        </div>
        <div className="page-actions">
          {['pending', 'confirmed', 'rejected', 'cancelled', 'all'].map(s => (
            <button key={s} className={filter === s ? 'btn-primary' : 'btn-outline'}
              onClick={() => setFilter(s)} style={{ textTransform: 'capitalize', fontSize: 13 }}>
              {s}{s === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="loading-msg">Loading...</div> : (
        <div className="bookings-list">
          {filtered.length === 0 && <div className="empty-state">No {filter} bookings.</div>}
          {filtered.map(b => (
            <div key={b.id} className={`booking-card card ${b.status === 'pending' ? 'pending-card' : ''}`}>
              <div className="booking-card-header">
                <div>
                  <h3 className="booking-title">{b.title}</h3>
                  <p className="booking-room">
                    {b.rooms?.name} · <strong>{b.requester_name}</strong>
                    {b.requester_dept ? ` · ${b.requester_dept}` : ''}
                  </p>
                </div>
                <span className={`badge ${statusColor[b.status] || 'badge-neutral'}`}>{b.status}</span>
              </div>

              <div className="booking-meta">
                <span>📅 {format(parseISO(b.start_time), 'EEE, dd MMM yyyy')}</span>
                <span>🕐 {format(parseISO(b.start_time), 'hh:mm a')} – {format(parseISO(b.end_time), 'hh:mm a')}</span>
                <span>👥 {b.attendees_count} attendees</span>
                {b.requester_mobile && <span>📱 {b.requester_mobile}</span>}
              </div>

              {b.purpose && <p className="booking-purpose">{b.purpose}</p>}
              {b.rejection_reason && <div className="rejection-note">Note: {b.rejection_reason}</div>}

              {/* Pending actions */}
              {b.status === 'pending' && (
                rejecting === b.id ? (
                  <div className="reject-form">
                    <input type="text" placeholder="Reason for rejection (optional)" value={reason} onChange={e => setReason(e.target.value)} />
                    <div className="reject-actions">
                      <button className="btn-outline" onClick={() => { setRejecting(null); setReason('') }}>Cancel</button>
                      <button className="btn-danger" onClick={() => reject(b.id)}>Confirm Reject</button>
                    </div>
                  </div>
                ) : (
                  <div className="booking-actions">
                    <button className="btn-success" onClick={() => approve(b.id)}>✓ Approve</button>
                    <button className="btn-danger" onClick={() => setRejecting(b.id)}>✕ Reject</button>
                  </div>
                )
              )}

              {/* Confirmed actions — cancel or reschedule */}
              {b.status === 'confirmed' && (
                rescheduling === b.id ? (
                  <div className="reject-form" style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Reschedule booking</p>
                    <div className="field-row" style={{ gap: 10 }}>
                      <div className="field">
                        <label>New Date</label>
                        <input type="date" value={rescheduleForm.date}
                          onChange={e => setRescheduleForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <div className="field">
                        <label>Start Time</label>
                        <input type="time" value={rescheduleForm.start_hour}
                          onChange={e => setRescheduleForm(f => ({ ...f, start_hour: e.target.value }))} />
                      </div>
                      <div className="field">
                        <label>End Time</label>
                        <input type="time" value={rescheduleForm.end_hour}
                          onChange={e => setRescheduleForm(f => ({ ...f, end_hour: e.target.value }))} />
                      </div>
                    </div>
                    <div className="reject-actions">
                      <button className="btn-outline" onClick={() => setRescheduling(null)}>Cancel</button>
                      <button className="btn-primary" onClick={() => reschedule(b.id)}>Confirm Reschedule</button>
                    </div>
                  </div>
                ) : rejecting === b.id ? (
                  <div className="reject-form" style={{ marginTop: 14 }}>
                    <input type="text" placeholder="Reason for cancellation (optional)" value={reason} onChange={e => setReason(e.target.value)} />
                    <div className="reject-actions">
                      <button className="btn-outline" onClick={() => { setRejecting(null); setReason('') }}>Back</button>
                      <button className="btn-danger" onClick={() => cancelConfirmed(b.id)}>Confirm Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="booking-actions" style={{ marginTop: 14 }}>
                    <button className="btn-outline" onClick={() => openReschedule(b)}>
                      📅 Reschedule
                    </button>
                    <button className="btn-danger" onClick={() => setRejecting(b.id)}>
                      ✕ Cancel Booking
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
