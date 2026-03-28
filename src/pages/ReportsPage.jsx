import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'

const STATUS_STYLES = {
  pending:   { label: 'Pending',   cls: 'badge-warning' },
  confirmed: { label: 'Confirmed', cls: 'badge-success' },
  rejected:  { label: 'Rejected',  cls: 'badge-danger' },
  cancelled: { label: 'Cancelled', cls: 'badge-neutral' },
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    room: 'all',
    department: 'all',
    status: 'all',
  })

  useEffect(() => {
    supabase.from('rooms').select('*').then(({ data }) => setRooms(data || []))
    supabase.from('departments').select('*').order('name').then(({ data }) => setDepartments(data || []))
  }, [])

  function setFilter(k) { return e => setFilters(f => ({ ...f, [k]: e.target.value })) }

  async function fetchReport() {
    setLoading(true)
    let q = supabase.from('bookings').select('*, rooms(name)')
      .gte('start_time', new Date(filters.from).toISOString())
      .lte('start_time', new Date(filters.to + 'T23:59:59').toISOString())
      .order('start_time', { ascending: false })

    if (filters.room !== 'all') q = q.eq('room_id', filters.room)
    if (filters.status !== 'all') q = q.eq('status', filters.status)
    if (filters.department !== 'all') q = q.eq('requester_dept', departments.find(d => d.id === filters.department)?.name)

    const { data } = await q
    setBookings(data || [])
    setLoading(false)
  }

  async function exportExcel() {
    if (bookings.length === 0) { alert('No data to export. Run the report first.'); return }

    // Build CSV content
    const headers = ['#', 'Date', 'Start Time', 'End Time', 'Room', 'Meeting Title', 'Purpose', 'Requested By', 'Department', 'Mobile', 'Attendees', 'Status']
    const rows = bookings.map((b, i) => [
      i + 1,
      format(parseISO(b.start_time), 'dd-MMM-yyyy'),
      format(parseISO(b.start_time), 'hh:mm a'),
      format(parseISO(b.end_time), 'hh:mm a'),
      b.rooms?.name || '',
      b.title || '',
      b.purpose || '',
      b.requester_name || '',
      b.requester_dept || '',
      b.requester_mobile || '',
      b.attendees_count || '',
      b.status || '',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ABMH_CRBS_Report_${filters.from}_to_${filters.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Summary stats
  const total = bookings.length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const cancelled = bookings.filter(b => b.status === 'cancelled').length
  const pending = bookings.filter(b => b.status === 'pending').length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Booking Reports</h1>
          <p className="page-sub">Filter and export booking data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div className="field">
            <label>From Date</label>
            <input type="date" value={filters.from} onChange={setFilter('from')} />
          </div>
          <div className="field">
            <label>To Date</label>
            <input type="date" value={filters.to} onChange={setFilter('to')} />
          </div>
          <div className="field">
            <label>Room</label>
            <select className="select" value={filters.room} onChange={setFilter('room')}>
              <option value="all">All Rooms</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Department</label>
            <select className="select" value={filters.department} onChange={setFilter('department')}>
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={filters.status} onChange={setFilter('status')}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Quick date presets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'This Week', from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') },
            { label: 'This Month', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
            { label: 'Last Month', from: format(startOfMonth(new Date(new Date().setMonth(new Date().getMonth()-1))), 'yyyy-MM-dd'), to: format(endOfMonth(new Date(new Date().setMonth(new Date().getMonth()-1))), 'yyyy-MM-dd') },
          ].map(p => (
            <button key={p.label} className="btn-outline"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setFilters(f => ({ ...f, from: p.from, to: p.to }))}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : '🔍 Run Report'}
          </button>
          <button className="btn-outline" onClick={exportExcel} disabled={bookings.length === 0}>
            📥 Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {bookings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', value: total, color: '#1e40af', bg: '#dbeafe' },
            { label: 'Confirmed', value: confirmed, color: '#059669', bg: '#d1fae5' },
            { label: 'Pending', value: pending, color: '#d97706', bg: '#fef3c7' },
            { label: 'Cancelled', value: cancelled, color: '#dc2626', bg: '#fee2e2' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px', textAlign: 'center', background: s.bg, border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.color, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {bookings.length > 0 && (
        <div className="card admin-table" style={{ overflow: 'auto' }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Time</th>
                <th>Room</th>
                <th>Meeting Title</th>
                <th>Requested By</th>
                <th>Department</th>
                <th>Mobile</th>
                <th>Attendees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => {
                const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending
                return (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{i + 1}</td>
                    <td>{format(parseISO(b.start_time), 'dd MMM yyyy')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {format(parseISO(b.start_time), 'hh:mm a')} – {format(parseISO(b.end_time), 'hh:mm a')}
                    </td>
                    <td>{b.rooms?.name}</td>
                    <td><strong>{b.title}</strong>{b.purpose && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{b.purpose}</div>}</td>
                    <td>{b.requester_name}</td>
                    <td>{b.requester_dept || '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{b.requester_mobile}</td>
                    <td style={{ textAlign: 'center' }}>{b.attendees_count}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {bookings.length === 0 && !loading && (
        <div className="empty-state">Set your filters and click "Run Report" to see data.</div>
      )}
    </div>
  )
}
