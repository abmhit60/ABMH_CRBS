import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInMinutes } from 'date-fns'

const HOUR_H = 64, START_H = 8, END_H = 21
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => i + START_H)
const COLORS = { 'Conference Room 1 (BIG)': '#4f46e5', 'Conference Room 1': '#4f46e5', 'Conference Room 2 (SMALL)': '#0891b2', 'Conference Room 2': '#0891b2', 'Onco Conference Room': '#059669' }
const SMALL = ['Conference Room 2 (SMALL)', 'Conference Room 2']
const rc = name => COLORS[name] ?? '#6366f1'
const isSmall = name => SMALL.includes(name)
const ec = b => b.status === 'pending' ? '#b45309' : b.status === 'cancelled' ? '#9ca3af' : rc(b.rooms?.name)

export default function CalendarPage() {
  const { profile } = useAuth()
  const isOwner = profile?.source === 'supabase_auth'
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selDay, setSelDay] = useState(new Date())
  const [popup, setPopup] = useState(null)
  const [form, setForm] = useState({ title: '', attendees: 1, endHour: 10 })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [mob, setMob] = useState(window.innerWidth < 768)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    supabase.from('rooms').select('*').eq('is_active', true).order('name').then(({ data }) => setRooms(data || []))
  }, [])

  useEffect(() => { fetchBk() }, [weekStart])

  async function fetchBk() {
    const { data } = await supabase.from('bookings').select('*, rooms(name)')
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', addDays(weekStart, 7).toISOString())
    setBookings(data || [])
  }

  const bkForDay = (day, rid) => bookings.filter(b => b.room_id === rid && isSameDay(parseISO(b.start_time), day))
  const topPx = b => { const s = parseISO(b.start_time); return ((s.getHours() - START_H) * 60 + s.getMinutes()) / 60 * HOUR_H }
  const htPx = b => Math.max(differenceInMinutes(parseISO(b.end_time), parseISO(b.start_time)) / 60 * HOUR_H, 32)
  const canSee = b => isOwner || (profile?.mobile && b.requester_mobile === profile.mobile)

  function slotClick(room, day, e) {
    const now = new Date()
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const hour = Math.min(Math.max(Math.floor(y / HOUR_H) + START_H, START_H), END_H - 1)
    const st = new Date(day); st.setHours(hour, 0, 0, 0)
    if (st < now) return
    const conflict = bookings.find(b => {
      if (b.room_id !== room.id) return false
      const s = parseISO(b.start_time), en = parseISO(b.end_time)
      const se = new Date(st); se.setHours(hour + 1)
      return isSameDay(s, day) && s < se && en > st
    })
    if (conflict) return
    setPopup({ room, date: new Date(day), startHour: hour })
    setForm({ title: '', attendees: 1, endHour: Math.min(hour + 1, END_H) })
    setErr('')
  }

  function openQuickBook() {
    if (!rooms.length) return
    const now = new Date()
    const hour = Math.min(Math.max(now.getHours(), START_H), END_H - 2)
    setPopup({ room: rooms[0], date: new Date(selDay), startHour: hour })
    setForm({ title: '', attendees: 1, endHour: hour + 1 })
    setErr('')
  }

  async function submit() {
    if (!form.title.trim()) { setErr('Meeting title is required.'); return }
    if (form.endHour <= popup.startHour) { setErr('End time must be after start time.'); return }
    if (!profile?.full_name) { setErr('Session expired. Please log in again.'); return }
    setBusy(true); setErr('')
    const st = new Date(popup.date); st.setHours(popup.startHour, 0, 0, 0)
    const en = new Date(popup.date); en.setHours(form.endHour, 0, 0, 0)
    const { error } = await supabase.from('bookings').insert({
      room_id: popup.room.id, title: form.title.trim(),
      attendees_count: Number(form.attendees) || 1,
      start_time: st.toISOString(), end_time: en.toISOString(),
      status: isSmall(popup.room.name) ? 'confirmed' : 'pending',
      requester_name: profile.full_name,
      requester_mobile: profile.mobile || null,
      requester_dept: profile.department_name || null,
      ...(profile.source === 'supabase_auth' ? { booked_by: profile.id } : {}),
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setPopup(null); fetchBk()
  }

  const closePopup = () => { setPopup(null); setErr('') }

  const PopupContent = () => popup && (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: rc(popup.room.name), flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{popup.room.name}</span>
        {isSmall(popup.room.name) && <span className="badge badge-confirmed" style={{ fontSize: 11 }}>Auto Confirm</span>}
      </div>
      <div className="meta-row">
        <span className="meta-chip">📅 {format(popup.date, 'EEE, dd MMM')}</span>
        <span className="meta-chip">🕐 {String(popup.startHour).padStart(2,'0')}:00</span>
      </div>
      <div className="req-block">
        <div className="req-row"><span className="req-label">Booking for</span><span className="req-val">{profile?.full_name}</span></div>
        {profile?.department_name && <div className="req-row"><span className="req-label">Department</span><span className="req-val">{profile.department_name}</span></div>}
      </div>
      <div className="field">
        <label>Meeting Title <span className="field-req">*</span></label>
        <input type="text" placeholder="e.g. Weekly Department Meeting" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label>End Time</label>
          <select value={form.endHour} onChange={e => setForm(f => ({ ...f, endHour: Number(e.target.value) }))}>
            {Array.from({ length: END_H - popup.startHour }, (_, i) => popup.startHour + 1 + i).map(h => (
              <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Attendees</label>
          <input type="number" value={form.attendees} min={1} max={popup.room.capacity || 50}
            onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} />
        </div>
      </div>
      {err && <div className="err-msg">{err}</div>}
      {!isSmall(popup.room.name) && (
        <div style={{ fontSize: 12, color: 'var(--pending)', background: 'var(--pending-bg)', borderRadius: 8, padding: '8px 12px' }}>
          ⏳ Requires approval from Smita Hule
        </div>
      )}
    </>
  )

  const EventBlock = ({ b }) => (
    <div className="cal-event" style={{ top: topPx(b), height: htPx(b), background: ec(b) }} onClick={e => e.stopPropagation()}>
      <span className="cal-event-title">{canSee(b) ? b.title : '🔒 Booked'}</span>
      <span className="cal-event-time">{format(parseISO(b.start_time), 'h:mm a')} – {format(parseISO(b.end_time), 'h:mm a')}</span>
      <span className="cal-event-who">{b.requester_name}</span>
      {b.status === 'pending' && <span className="cal-event-tag">Pending</span>}
    </div>
  )

  return (
    <div>
      <div className="cal-wrap">
        <div className="cal-toolbar">
          <div>
            <div className="cal-date-label">{format(selDay, 'EEE, dd MMM yyyy')}</div>
            <div className="cal-date-sub">{format(weekStart, 'dd MMM')} – {format(addDays(weekStart, 6), 'dd MMM yyyy')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setWeekStart(w => addDays(w, -7))}>←</button>
            <button className="btn btn-outline btn-sm" onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelDay(new Date()) }}>Today</button>
            <button className="btn btn-outline btn-sm" onClick={() => setWeekStart(w => addDays(w, 7))}>→</button>
            <button className="btn btn-primary btn-sm" onClick={openQuickBook}>+ Book</button>
          </div>
        </div>

        <div className="cal-scroll-hint">← Swipe left/right to see all rooms →</div>

        <div className="day-strip">
          {days.map(d => (
            <button key={d.toISOString()} className={`day-chip${isSameDay(d, selDay) ? ' selected' : ''}${isSameDay(d, new Date()) ? ' today' : ''}`} onClick={() => setSelDay(d)}>
              <span className="chip-dow">{format(d, 'EEE')}</span>
              <span className="chip-num">{format(d, 'd')}</span>
            </button>
          ))}
        </div>

        <div className="cal-grid">
          <div className="cal-grid-inner">
            <div className="cal-time-col">
              <div className="cal-time-header" />
              {HOURS.map(h => <div key={h} className="cal-time-cell" style={{ height: HOUR_H }}>{format(new Date(2000,0,1,h), 'h a')}</div>)}
            </div>
            <div className="cal-rooms">
              {rooms.map(room => (
                <div key={room.id} className="cal-room-col">
                  <div className="cal-room-header">
                    <div className="cal-room-dot" style={{ background: rc(room.name) }} />
                    <div className="cal-room-name">{room.name}</div>
                    <div className="cal-room-cap">Cap: {room.capacity}</div>
                  </div>
                  <div className="cal-room-body" style={{ height: HOURS.length * HOUR_H }} onClick={e => slotClick(room, selDay, e)}>
                    {HOURS.map(h => <div key={h} className="cal-hr" style={{ top: (h - START_H) * HOUR_H, height: HOUR_H }} />)}
                    {bkForDay(selDay, room.id).map(b => <EventBlock key={b.id} b={b} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="cal-legend">
          {rooms.map(r => <div key={r.id} className="legend-item"><span className="legend-dot" style={{ background: rc(r.name) }} />{r.name}</div>)}
          <div className="legend-item"><span className="legend-dot" style={{ background: '#b45309' }} />Pending</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#0f766e' }} />Confirmed</div>
        </div>
      </div>

      {popup && (mob ? (
        <>
          <div className="sheet-ov" onClick={closePopup} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-head"><span className="sheet-title">New Booking</span><button className="modal-close" onClick={closePopup}>✕</button></div>
            <div className="sheet-body"><PopupContent /></div>
            <div className="sheet-foot">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={closePopup}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
                {busy ? 'Booking...' : isSmall(popup.room.name) ? '✓ Confirm' : 'Submit'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="modal-ov" onClick={closePopup}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><span className="modal-title">New Booking</span><button className="modal-close" onClick={closePopup}>✕</button></div>
            <div className="modal-body"><PopupContent /></div>
            <div className="modal-foot">
              <button className="btn btn-outline" onClick={closePopup}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Booking...' : isSmall(popup.room.name) ? '✓ Confirm Booking' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
