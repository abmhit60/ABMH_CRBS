import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format, parseISO } from 'date-fns'

const STATUS_BADGE = { pending: 'badge-pending', confirmed: 'badge-confirmed', rejected: 'badge-rejected', cancelled: 'badge-cancelled' }

export default function MyBookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const isOwner = profile?.source === 'supabase_auth'

  useEffect(() => { fetchBookings() }, [profile])

  async function fetchBookings() {
    if (!profile) return
    let q = supabase.from('bookings').select('*, rooms(name)').order('start_time', { ascending: false })
    if (!isOwner && profile.mobile) q = q.eq('requester_mobile', profile.mobile)
    const { data } = await q
    setBookings(data || []); setLoading(false)
  }

  async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    fetchBookings()
  }

  const statuses = ['all', 'pending', 'confirmed', 'rejected', 'cancelled']
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>My Bookings</h1>
      </div>
      <div className="scroll-tabs">
        {statuses.map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(s)} style={{ textTransform: 'capitalize', flexShrink: 0 }}>{s}</button>
        ))}
      </div>

      {loading ? <div className="loading-msg">Loading...</div> : filtered.length === 0
        ? <div className="empty-state">No {filter === 'all' ? '' : filter} bookings found.</div>
        : filtered.map(b => (
          <div key={b.id} className="card bcard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div className="bcard-title">{b.title}</div>
                <div className="bcard-room">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.status === 'confirmed' ? 'var(--confirmed)' : 'var(--pending)', flexShrink: 0 }} />
                  {b.rooms?.name}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-cancelled'}`}>{b.status}</span>
            </div>
            <div className="bcard-meta">
              <span>📅 {format(parseISO(b.start_time), 'EEE, dd MMM yyyy')}</span>
              <span>🕐 {format(parseISO(b.start_time), 'hh:mm a')} – {format(parseISO(b.end_time), 'hh:mm a')}</span>
              <span>👥 {b.attendees_count}</span>
              {b.requester_dept && <span>🏢 {b.requester_dept}</span>}
            </div>
            {b.rejection_reason && (
              <div style={{ marginTop: 8, padding: '7px 12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>
                Reason: {b.rejection_reason}
              </div>
            )}
            {(b.status === 'pending' || b.status === 'confirmed') && (
              <div className="bcard-actions">
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => cancelBooking(b.id)}>Cancel Booking</button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  )
}
