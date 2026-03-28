import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/ProtectedRoute'
import { format, parseISO } from 'date-fns'

const STATUS_STYLES = {
  pending:   { label: 'Pending',   cls: 'badge-warning' },
  confirmed: { label: 'Confirmed', cls: 'badge-success' },
  rejected:  { label: 'Rejected',  cls: 'badge-danger' },
  cancelled: { label: 'Cancelled', cls: 'badge-neutral' },
}

export default function MyBookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (profile) fetchBookings() }, [profile])

  async function fetchBookings() {
  if (!profile) return

  let query = supabase
    .from('bookings')
    .select('*, rooms(name, location)')
    .order('start_time', { ascending: false })

  if (profile.source === 'supabase_auth') {
    query = query.eq('booked_by', profile.id)
  } else {
    const mobile = profile?.mobile || profile?.requester_mobile
    if (!mobile) { setLoading(false); return }
    query = query.eq('requester_mobile', mobile)
  }

  const { data } = await query
  setBookings(data || [])
  setLoading(false)
}
  }

  async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    fetchBookings()
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-sub">{bookings.length} total bookings</p>
        </div>
        <div className="page-actions" style={{ flexWrap: 'wrap' }}>
          {['all','pending','confirmed','rejected','cancelled'].map(s => (
            <button key={s} className={filter === s ? 'btn-primary' : 'btn-outline'}
              onClick={() => setFilter(s)} style={{ textTransform:'capitalize', fontSize: 12, padding: '6px 10px' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-msg">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {bookings.length === 0 ? 'You have no bookings yet.' : `No ${filter} bookings.`}
        </div>
      ) : (
        <div className="bookings-list">
          {filtered.map(b => {
            const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending
            return (
              <div key={b.id} className="booking-card card">
                <div className="booking-card-header">
                  <div>
                    <h3 className="booking-title">{b.title}</h3>
                    <p className="booking-room">{b.rooms?.name} · {b.rooms?.location}</p>
                  </div>
                  <span className={`badge ${s.cls}`}>{s.label}</span>
                </div>
                <div className="booking-meta">
                  <span>📅 {format(parseISO(b.start_time), 'EEE, dd MMM yyyy')}</span>
                  <span>🕐 {format(parseISO(b.start_time), 'hh:mm a')} – {format(parseISO(b.end_time), 'hh:mm a')}</span>
                  <span>👥 {b.attendees_count} attendees</span>
                </div>
                {b.purpose && <p className="booking-purpose">{b.purpose}</p>}
                {b.rejection_reason && (
                  <div className="rejection-note">Reason: {b.rejection_reason}</div>
                )}
                {b.status === 'pending' && (
                  <div className="booking-actions">
                    <button className="btn-danger-sm" onClick={() => cancelBooking(b.id)}>Cancel Booking</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
