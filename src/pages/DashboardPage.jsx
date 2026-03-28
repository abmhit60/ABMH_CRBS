import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, isToday } from 'date-fns'

const ROOM_COLORS = {
  'Conference Room 1':    '#4f46e5',
  'Conference Room 2':    '#0891b2',
  'Onco Conference Room': '#059669',
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, cancelled: 0 })
  const [todayBookings, setTodayBookings] = useState([])
  const [weekBookings, setWeekBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const now = new Date()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const [roomsRes, todayRes, weekRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('is_active', true),
      supabase.from('bookings').select('*, rooms(name)')
        .gte('start_time', startOfDay(now).toISOString())
        .lte('start_time', endOfDay(now).toISOString())
        .order('start_time'),
      supabase.from('bookings').select('*, rooms(name)')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .in('status', ['confirmed', 'pending']),
    ])

    const allWeek = weekRes.data || []
    setRooms(roomsRes.data || [])
    setTodayBookings(todayRes.data || [])
    setWeekBookings(allWeek)
    setStats({
      total: allWeek.length,
      confirmed: allWeek.filter(b => b.status === 'confirmed').length,
      pending: allWeek.filter(b => b.status === 'pending').length,
      cancelled: (todayRes.data || []).filter(b => b.status === 'cancelled').length,
    })
    setLoading(false)
  }

  // Room utilization this week (hours booked)
  function roomUtilization(roomName) {
    const roomBookings = weekBookings.filter(b => b.rooms?.name === roomName && b.status === 'confirmed')
    const totalMins = roomBookings.reduce((acc, b) => {
      return acc + (new Date(b.end_time) - new Date(b.start_time)) / 60000
    }, 0)
    const totalHours = (totalMins / 60).toFixed(1)
    const maxHours = 5 * 13 // 5 days * 13 hours
    const pct = Math.min(Math.round((totalMins / 60 / maxHours) * 100), 100)
    return { hours: totalHours, pct }
  }

  if (loading) return <div className="loading-msg">Loading dashboard...</div>

  const pending = todayBookings.filter(b => b.status === 'pending')
  const confirmedToday = todayBookings.filter(b => b.status === 'confirmed')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{format(now, 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/book')}>+ New Booking</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: "This week's bookings", value: stats.total, color: '#1e40af', bg: '#dbeafe', icon: '📅' },
          { label: 'Confirmed this week', value: stats.confirmed, color: '#059669', bg: '#d1fae5', icon: '✅' },
          { label: 'Pending approval', value: stats.pending, color: '#d97706', bg: '#fef3c7', icon: '⏳' },
          { label: "Today's meetings", value: confirmedToday.length, color: '#7c3aed', bg: '#ede9fe', icon: '🏢' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 16px', background: s.bg, border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.color, marginTop: 4, opacity: .8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Today's schedule */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Today's Schedule</h2>
          {todayBookings.filter(b => b.status !== 'cancelled').length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No bookings today</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayBookings.filter(b => b.status !== 'cancelled').map(b => {
                const isPast = new Date(b.end_time) < now
                const isNow = new Date(b.start_time) <= now && new Date(b.end_time) >= now
                return (
                  <div key={b.id} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '10px 12px', borderRadius: 8,
                    background: isNow ? '#f0fdf4' : isPast ? 'var(--surface-2)' : 'var(--surface)',
                    border: `1px solid ${isNow ? '#86efac' : 'var(--border)'}`,
                    opacity: isPast ? .6 : 1,
                  }}>
                    <div style={{ width: 4, borderRadius: 99, alignSelf: 'stretch', background: ROOM_COLORS[b.rooms?.name] ?? '#6366f1', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{b.rooms?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>
                        {format(parseISO(b.start_time), 'hh:mm a')} – {format(parseISO(b.end_time), 'hh:mm a')}
                        {b.requester_name && ` · ${b.requester_name}`}
                      </div>
                    </div>
                    {isNow && <span style={{ fontSize: 10, background: '#16a34a', color: '#fff', padding: '2px 7px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>LIVE</span>}
                    {b.status === 'pending' && <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', padding: '2px 7px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>PENDING</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Room utilization */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Room Utilization — This Week</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rooms.map(r => {
              const { hours, pct } = roomUtilization(r.name)
              const color = ROOM_COLORS[r.name] ?? '#6366f1'
              return (
                <div key={r.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    <span style={{ color: 'var(--text-3)' }}>{hours}h booked</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{pct}% utilized</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pending approvals alert */}
      {pending.length > 0 && (
        <div className="card" style={{ padding: 16, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e' }}>⏳ {pending.length} pending approval{pending.length > 1 ? 's' : ''} today</div>
              <div style={{ fontSize: 13, color: '#78350f', marginTop: 2 }}>
                {pending.map(b => b.title).join(', ')}
              </div>
            </div>
            <button className="btn-primary" style={{ background: '#d97706', whiteSpace: 'nowrap' }} onClick={() => navigate('/approvals')}>
              Review Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
