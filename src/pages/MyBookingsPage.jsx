import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format } from 'date-fns'

const STATUS_BADGE = { pending: 'badge-pending', confirmed: 'badge-confirmed', rejected: 'badge-rejected', cancelled: 'badge-cancelled' }

const START_H = 8
const END_H = 21

export default function MyBookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [rescheduling, setRescheduling] = useState(null)
  const [rf, setRf] = useState({ date: '', startHour: 9, startMin: 0, endHour: 10, endMin: 0 })
  const [rfErr, setRfErr] = useState('')
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

  async function reschedule(b) {
    const st = new Date(rf.date); st.setHours(rf.startHour, rf.startMin, 0, 0)
    const en = new Date(rf.date); en.setHours(rf.endHour, rf.endMin, 0, 0)
    if (en <= st) { setRfErr('End time must be after start time.'); return }
    if (st < new Date()) { setRfErr('Cannot reschedule to a past time.'); return }
    await supabase.from('bookings').update({
      start_time: st.toISOString(),
      end_time: en.toISOString(),
      status: 'pending'  // re-submit for approval
    }).eq('id', b.id)
    setRescheduling(null); fetchBookings()
  }

  function timeOptions(step = 15) {
    const opts = []
    for (let h = START_H; h < END_H; h++) {
      for (let m = 0; m < 60; m += step) {
        opts.push({ h, m, label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` })
      }
    }
    return opts
  }

  function endTimeOptions() {
    const opts = []
    let h = rf.startHour, m = rf.startMin
    m += 15; if (m >= 60) { h++; m = m - 60 }
    while (h < END_H || (h === END_H && m === 0)) {
      opts.push({ h, m, label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` })
      m += 15; if (m >= 60) { h++; m = m - 60 }
    }
    return opts
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
              <span>📅 {format(new Date(b.start_time), 'EEE, dd MMM yyyy')}</span>
              <span>🕐 {format(new Date(b.start_time), 'hh:mm a')} – {format(new Date(b.end_time), 'hh:mm a')}</span>
              <span>👥 {b.attendees_count}</span>
              {b.requester_dept && <span>🏢 {b.requester_dept}</span>}
            </div>
            {b.rejection_reason && (
              <div style={{ marginTop: 8, padding: '7px 12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>
                Reason: {b.rejection_reason}
              </div>
            )}

            {/* RESCHEDULE FORM */}
            {rescheduling === b.id && (
              <div className="reject-form" style={{ marginTop: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📅 Reschedule Booking</p>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={rf.date} style={{ colorScheme: 'light', width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                    onChange={e => setRf(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div className="field">
                    <label>Start Time</label>
                    <select value={`${rf.startHour}:${rf.startMin}`}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':').map(Number)
                        const newEndH = h + 1 <= END_H ? h + 1 : END_H
                        setRf(f => ({ ...f, startHour: h, startMin: m, endHour: newEndH, endMin: m }))
                      }}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                      {timeOptions().map(o => <option key={o.label} value={`${o.h}:${o.m}`}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>End Time</label>
                    <select value={`${rf.endHour}:${rf.endMin}`}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':').map(Number)
                        setRf(f => ({ ...f, endHour: h, endMin: m }))
                      }}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                      {endTimeOptions().map(o => <option key={o.label} value={`${o.h}:${o.m}`}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {rfErr && <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 6 }}>{rfErr}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                  ⚠️ Rescheduled bookings will need re-approval from Smita Hule.
                </div>
                <div className="reject-actions" style={{ marginTop: 10 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setRescheduling(null); setRfErr('') }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={() => reschedule(b)}>Confirm Reschedule</button>
                </div>
              </div>
            )}

            {/* ACTIONS */}
            {(b.status === 'pending' || b.status === 'confirmed') && rescheduling !== b.id && new Date(b.end_time) > new Date() && (
              <div className="bcard-actions" style={{ marginTop: 10 }}>
                <button className="btn btn-outline btn-sm"
                  onClick={() => {
                    const d = new Date(b.start_time)
                    setRescheduling(b.id)
                    setRfErr('')
                    setRf({
                      date: format(d, 'yyyy-MM-dd'),
                      startHour: d.getHours(),
                      startMin: d.getMinutes(),
                      endHour: new Date(b.end_time).getHours(),
                      endMin: new Date(b.end_time).getMinutes(),
                    })
                  }}>
                  📅 Reschedule
                </button>
                <button className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                  onClick={() => cancelBooking(b.id)}>
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  )
}
