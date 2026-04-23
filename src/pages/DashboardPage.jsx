import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'

const COLORS = { 'Conference Room 1 (BIG)': '#4f46e5', 'Conference Room 1': '#4f46e5', 'Conference Room 2 (SMALL)': '#0891b2', 'Conference Room 2': '#0891b2', 'Onco Conference Room': '#059669' }

export default function DashboardPage() {
  const [rooms, setRooms] = useState([])
  const [todayBk, setTodayBk] = useState([])
  const [weekBk, setWeekBk] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const now = new Date()

  useEffect(() => {
    Promise.all([
      supabase.from('rooms').select('*').eq('is_active', true),
      supabase.from('bookings').select('*, rooms(name)').gte('start_time', startOfDay(now).toISOString()).lte('start_time', endOfDay(now).toISOString()).order('start_time'),
      supabase.from('bookings').select('*, rooms(name)').gte('start_time', startOfWeek(now, { weekStartsOn: 1 }).toISOString()).lte('start_time', endOfWeek(now, { weekStartsOn: 1 }).toISOString()).in('status', ['confirmed', 'pending']),
    ]).then(([r, t, w]) => { setRooms(r.data || []); setTodayBk(t.data || []); setWeekBk(w.data || []); setLoading(false) })
  }, [])

  function roomUtil(name) {
    const hrs = weekBk.filter(b => b.rooms?.name === name && b.status === 'confirmed')
      .reduce((a, b) => a + (new Date(b.end_time) - new Date(b.start_time)) / 3600000, 0)
    return { hrs: hrs.toFixed(1), pct: Math.min(Math.round(hrs / (5 * 13) * 100), 100) }
  }

  if (loading) return <div className="loading-msg">Loading...</div>

  const stats = [
    { label: "This week's bookings", val: weekBk.length, c: '#1e40af', bg: '#dbeafe' },
    { label: 'Confirmed', val: weekBk.filter(b => b.status === 'confirmed').length, c: '#0f766e', bg: '#f0fdfa' },
    { label: 'Pending approval', val: weekBk.filter(b => b.status === 'pending').length, c: '#b45309', bg: '#fffbeb' },
    { label: "Today's meetings", val: todayBk.filter(b => b.status === 'confirmed').length, c: '#7c3aed', bg: '#ede9fe' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{format(now, 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/calendar')}>+ New Booking</button>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="card stat-card" style={{ background: s.bg, border: `1px solid ${s.c}22` }}>
            <div className="stat-val" style={{ color: s.c }}>{s.val}</div>
            <div className="stat-label" style={{ color: s.c }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Today's Schedule</h3>
          {todayBk.filter(b => b.status !== 'cancelled').length === 0
            ? <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No bookings today</div>
            : todayBk.filter(b => b.status !== 'cancelled').map(b => {
                const isNow = new Date(b.start_time) <= now && new Date(b.end_time) >= now
                return (
                  <div key={b.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ width: 3, height: 36, borderRadius: 99, background: COLORS[b.rooms?.name] ?? '#6366f1', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.rooms?.name} · {format(parseISO(b.start_time), 'h:mm a')}</div>
                    </div>
                    {isNow && <span style={{ fontSize: 10, background: 'var(--success)', color: '#fff', padding: '2px 7px', borderRadius: 99, fontWeight: 700, flexShrink: 0 }}>LIVE</span>}
                    {b.status === 'pending' && <span style={{ fontSize: 10, background: 'var(--pending-bg)', color: 'var(--pending)', padding: '2px 7px', borderRadius: 99, fontWeight: 700, flexShrink: 0 }}>PENDING</span>}
                  </div>
                )
              })
          }
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Room Utilization — This Week</h3>
          {rooms.map(r => {
            const { hrs, pct } = roomUtil(r.name)
            const color = COLORS[r.name] ?? '#6366f1'
            return (
              <div key={r.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <span style={{ color: 'var(--text-3)' }}>{hrs}h · {pct}%</span>
                </div>
                <div className="util-bar"><div className="util-fill" style={{ width: `${pct}%`, background: color }} /></div>
              </div>
            )
          })}
        </div>
      </div>

      {weekBk.filter(b => b.status === 'pending').length > 0 && (
        <div className="card" style={{ padding: 14, background: 'var(--pending-bg)', border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>⏳ {weekBk.filter(b => b.status === 'pending').length} pending approval this week</div>
            <div style={{ fontSize: 13, color: '#78350f', marginTop: 2 }}>{weekBk.filter(b => b.status === 'pending').map(b => b.title).join(', ')}</div>
          </div>
          <button className="btn btn-sm" style={{ background: '#d97706', color: '#fff', border: 'none', flexShrink: 0 }} onClick={() => navigate('/approvals')}>Review Now</button>
        </div>
      )}
    </div>
  )
}
