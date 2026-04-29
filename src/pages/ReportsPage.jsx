import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'

export default function ReportsPage() {
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    room: 'all', dept: 'all', status: 'all',
  })

  useEffect(() => {
    supabase.from('rooms').select('*').then(({ data }) => setRooms(data || []))
    supabase.from('departments').select('*').order('name').then(({ data }) => setDepts(data || []))
  }, [])

  const sf = k => e => setFilters(f => ({ ...f, [k]: e.target.value }))

  async function runReport() {
    setLoading(true)
    let q = supabase.from('bookings').select('*, rooms(name)')
      .gte('start_time', new Date(filters.from + 'T00:00:00').toISOString())
      .lte('start_time', new Date(filters.to + 'T23:59:59').toISOString())
      .order('start_time', { ascending: false })
    if (filters.room !== 'all') q = q.eq('room_id', filters.room)
    if (filters.status !== 'all') q = q.eq('status', filters.status)
    const { data } = await q
    let result = data || []
    if (filters.dept !== 'all') {
      const dname = depts.find(d => d.id === filters.dept)?.name
      if (dname) result = result.filter(b => b.requester_dept === dname)
    }
    setBookings(result); setLoading(false)
  }

  function exportCSV() {
    if (!bookings.length) { alert('Run report first.'); return }
    const hdrs = ['#', 'Date', 'Start', 'End', 'Room', 'Title', 'Requested By', 'Dept', 'Mobile', 'Attendees Count', 'Attendee Names', 'Status']
    const rows = bookings.map((b, i) => [
      i + 1,
      format(new Date(b.start_time), 'dd-MMM-yyyy'),
      format(new Date(b.start_time), 'hh:mm a'),
      format(new Date(b.end_time), 'hh:mm a'),
      b.rooms?.name || '',
      b.title || '',
      b.requester_name || '',
      b.requester_dept || '',
      b.requester_mobile || '',
      b.attendees_count || '',
      b.attendee_names || '',
      b.status || ''
    ])
    const csv = [hdrs, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `CRBS_${filters.from}_${filters.to}.csv`; a.click()
  }

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Reports</h1>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
          <div className="field"><label>From</label><input type="date" value={filters.from} onChange={sf('from')} max={filters.to} style={{ colorScheme: 'light' }} /></div>
          <div className="field"><label>To</label><input type="date" value={filters.to} onChange={sf('to')} min={filters.from} style={{ colorScheme: 'light' }} /></div>
          <div className="field"><label>Room</label>
            <select value={filters.room} onChange={sf('room')}>
              <option value="all">All Rooms</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Department</label>
            <select value={filters.dept} onChange={sf('dept')}>
              <option value="all">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Status</label>
            <select value={filters.status} onChange={sf('status')}>
              {['all', 'pending', 'confirmed', 'rejected', 'cancelled'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setFilters(f => ({ ...f, from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') }))}>This Week</button>
          <button className="btn btn-outline btn-sm" onClick={() => setFilters(f => ({ ...f, from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }))}>This Month</button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={runReport} disabled={loading}>{loading ? 'Loading...' : '🔍 Run Report'}</button>
          <button className="btn btn-outline" onClick={exportCSV} disabled={!bookings.length}>📥 Export CSV</button>
        </div>
      </div>

      {bookings.length > 0 && (
        <>
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            {[
              { l: 'Total', v: stats.total, c: '#1e40af', bg: '#dbeafe' },
              { l: 'Confirmed', v: stats.confirmed, c: '#0f766e', bg: '#f0fdfa' },
              { l: 'Pending', v: stats.pending, c: '#b45309', bg: '#fffbeb' },
              { l: 'Cancelled', v: stats.cancelled, c: '#dc2626', bg: '#fef2f2' }
            ].map(s => (
              <div key={s.l} className="card stat-card" style={{ background: s.bg, border: `1px solid ${s.c}22` }}>
                <div className="stat-val" style={{ color: s.c }}>{s.v}</div>
                <div className="stat-label" style={{ color: s.c }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="card report-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Room</th>
                  <th>Title</th>
                  <th>Requested By</th>
                  <th>Dept</th>
                  <th>Attendees</th>
                  <th>Attendee Names</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{i + 1}</td>
                    <td>{format(new Date(b.start_time), 'dd MMM yyyy')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{format(new Date(b.start_time), 'hh:mm a')} – {format(new Date(b.end_time), 'hh:mm a')}</td>
                    <td>{b.rooms?.name}</td>
                    <td><strong>{b.title}</strong></td>
                    <td>{b.requester_name}</td>
                    <td>{b.requester_dept || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{b.attendees_count}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 200 }}>
                      {b.attendee_names || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td><span className={`badge badge-${b.status === 'confirmed' ? 'confirmed' : b.status === 'pending' ? 'pending' : b.status === 'rejected' ? 'rejected' : 'cancelled'}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!bookings.length && !loading && <div className="empty-state">Set filters and click Run Report.</div>}
    </div>
  )
}
