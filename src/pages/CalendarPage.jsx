import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInMinutes } from 'date-fns'

const SLOT_H = 32        // height per 30-min slot in px
const START_H = 8
const END_H = 21
const TIME_COL_W = 56

// Generate 30-min slots
const SLOTS = []
for (let h = START_H; h < END_H; h++) {
  SLOTS.push({ h, m: 0, label: format(new Date(2000, 0, 1, h, 0), 'h:mm a') })
  SLOTS.push({ h, m: 30, label: '' })
}

const COLORS = {
  'Conference Room 1 (BIG)': '#4f46e5',
  'Conference Room 1': '#4f46e5',
  'Conference Room 2 (SMALL)': '#0891b2',
  'Conference Room 2': '#0891b2',
  'Onco Conference Room': '#059669',
}
const SMALL = ['Conference Room 2 (SMALL)', 'Conference Room 2']
const rc = name => COLORS[name] ?? '#6366f1'
const isSmall = name => SMALL.includes(name)

function eventColor(b) {
  if (b.status === 'pending') return '#b45309'
  if (b.status === 'cancelled') return '#9ca3af'
  return rc(b.rooms?.name)
}

function minutesToPx(mins) {
  return (mins / 30) * SLOT_H
}

function topPx(b) {
  const s = parseISO(b.start_time)
  const minsFromStart = (s.getHours() - START_H) * 60 + s.getMinutes()
  return minutesToPx(minsFromStart)
}

function htPx(b) {
  const mins = differenceInMinutes(parseISO(b.end_time), parseISO(b.start_time))
  return Math.max(minutesToPx(mins), SLOT_H)
}

const TOTAL_H = SLOTS.length * SLOT_H
const HEADER_H = 54

export default function CalendarPage() {
  const { profile } = useAuth()
  const isOwner = profile?.source === 'supabase_auth'
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selDay, setSelDay] = useState(new Date())
  const [popup, setPopup] = useState(null)
  const [form, setForm] = useState({ title: '', attendees: 1, endHour: 10, endMin: 0 })
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
    supabase.from('rooms').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setRooms(data || []))
  }, [])

  useEffect(() => { fetchBk() }, [weekStart])

  async function fetchBk() {
    const { data } = await supabase.from('bookings').select('*, rooms(name)')
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', addDays(weekStart, 7).toISOString())
    setBookings(data || [])
  }

  const bkForDay = (day, rid) =>
    bookings.filter(b => b.room_id === rid && isSameDay(parseISO(b.start_time), day))

  const canSee = b =>
    isOwner || (profile?.mobile && b.requester_mobile === profile.mobile)

  function slotClick(room, day, e) {
    const now = new Date()
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const slotIndex = Math.floor(y / SLOT_H)
    const slot = SLOTS[slotIndex]
    if (!slot) return
    const st = new Date(day); st.setHours(slot.h, slot.m, 0, 0)
    if (st < now) return

    // Check conflict
    const endSt = new Date(st.getTime() + 30 * 60000)
    const conflict = bookings.find(b => {
      if (b.room_id !== room.id) return false
      const bs = parseISO(b.start_time), be = parseISO(b.end_time)
      return isSameDay(bs, day) && bs < endSt && be > st
    })
    if (conflict) return

    // Default end = start + 1 hour
    const endH = slot.m === 30 ? slot.h + 1 : slot.h + 1
    const endM = slot.m === 30 ? 0 : 0

    setPopup({ room, date: new Date(day), startHour: slot.h, startMin: slot.m })
    setForm({ title: '', attendees: 1, endHour: Math.min(endH, END_H), endMin: endM })
    setErr('')
  }

  function openQuickBook() {
    if (!rooms.length) return
    const now = new Date()
    const h = Math.min(Math.max(now.getHours(), START_H), END_H - 2)
    const m = now.getMinutes() < 30 ? 0 : 30
    setPopup({ room: rooms[0], date: new Date(selDay), startHour: h, startMin: m })
    setForm({ title: '', attendees: 1, endHour: h + 1, endMin: m })
    setErr('')
  }

  async function submit() {
    if (!form.title.trim()) { setErr('Meeting title is required.'); return }
    if (!profile?.full_name) { setErr('Session expired. Please log in again.'); return }
    const st = new Date(popup.date); st.setHours(popup.startHour, popup.startMin, 0, 0)
    const en = new Date(popup.date); en.setHours(form.endHour, form.endMin, 0, 0)
    if (en <= st) { setErr('End time must be after start time.'); return }

    setBusy(true); setErr('')
    const { error } = await supabase.from('bookings').insert({
      room_id: popup.room.id,
      title: form.title.trim(),
      attendees_count: Number(form.attendees) || 1,
      start_time: st.toISOString(),
      end_time: en.toISOString(),
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

  // Generate end time options in 30-min increments after start
  function endTimeOptions() {
    const opts = []
    if (!popup) return opts
    let h = popup.startHour, m = popup.startMin
    // Advance by 30 mins to get first valid end time
    m += 30; if (m >= 60) { h++; m = 0 }
    while (h < END_H || (h === END_H && m === 0)) {
      opts.push({ h, m, label: `${String(h).padStart(2,'0')}:${m === 0 ? '00' : '30'}` })
      m += 30; if (m >= 60) { h++; m = 0 }
    }
    return opts
  }

  const PopupContent = () => popup && (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: rc(popup.room.name), flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{popup.room.name}</span>
        {isSmall(popup.room.name) && <span className="badge badge-confirmed" style={{ fontSize: 11 }}>Auto Confirm</span>}
      </div>
      <div className="meta-row">
        <span className="meta-chip">📅 {format(popup.date, 'EEE, dd MMM')}</span>
        <span className="meta-chip">🕐 {String(popup.startHour).padStart(2,'0')}:{popup.startMin === 0 ? '00' : '30'}</span>
      </div>
      <div className="req-block">
        <div className="req-row"><span className="req-label">Booking for</span><span className="req-val">{profile?.full_name}</span></div>
        {profile?.department_name && <div className="req-row"><span className="req-label">Department</span><span className="req-val">{profile.department_name}</span></div>}
      </div>
      <div className="field">
        <label>Meeting Title <span className="field-req">*</span></label>
        <input type="text" placeholder="e.g. Weekly Department Meeting"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label>End Time</label>
          <select value={`${form.endHour}:${form.endMin}`}
            onChange={e => {
              const [h, m] = e.target.value.split(':').map(Number)
              setForm(f => ({ ...f, endHour: h, endMin: m }))
            }}>
            {endTimeOptions().map(o => (
              <option key={o.label} value={`${o.h}:${o.m}`}>{o.label}</option>
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
    <div className="cal-event"
      style={{ top: topPx(b), height: htPx(b), background: eventColor(b) }}
      onClick={e => e.stopPropagation()}>
      <span className="cal-event-title">{canSee(b) ? b.title : '🔒 Booked'}</span>
      <span className="cal-event-time">
        {format(parseISO(b.start_time), 'h:mm a')} – {format(parseISO(b.end_time), 'h:mm a')}
      </span>
      <span className="cal-event-who">{b.requester_name}</span>
      {b.status === 'pending' && <span className="cal-event-tag">Pending</span>}
    </div>
  )

  return (
    <div>
      <div className="cal-wrap">
        {/* Toolbar */}
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

        {/* Swipe hint on mobile */}
        <div className="cal-scroll-hint">← Swipe left / right to see all rooms →</div>

        {/* Day strip */}
        <div className="day-strip">
          {days.map(d => (
            <button key={d.toISOString()}
              className={`day-chip${isSameDay(d, selDay) ? ' selected' : ''}${isSameDay(d, new Date()) ? ' today' : ''}`}
              onClick={() => setSelDay(d)}>
              <span className="chip-dow">{format(d, 'EEE')}</span>
              <span className="chip-num">{format(d, 'd')}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="cal-grid">
          <div className="cal-grid-inner">

            {/* Time column — fixed left */}
            <div style={{ flexShrink: 0, width: TIME_COL_W, position: 'sticky', left: 0, zIndex: 3, background: 'var(--surface)' }}>
              {/* Header spacer — same height as room headers */}
              <div style={{ height: HEADER_H, borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface-2)' }} />
              {/* Time labels — one per slot, only show on hour */}
              {SLOTS.map((slot, i) => (
                <div key={i} style={{
                  height: SLOT_H,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  paddingTop: slot.m === 0 ? 0 : undefined,
                  transform: slot.m === 0 ? 'translateY(-7px)' : undefined,
                  fontSize: 11,
                  color: slot.m === 0 ? 'var(--text-3)' : 'transparent',
                  fontFamily: "'JetBrains Mono', monospace",
                  borderTop: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxSizing: 'border-box',
                }}>
                  {slot.m === 0 ? format(new Date(2000, 0, 1, slot.h, 0), 'h a') : ''}
                </div>
              ))}
            </div>

            {/* Room columns */}
            <div style={{ display: 'flex', flex: 1 }}>
              {rooms.map(room => (
                <div key={room.id} style={{ flex: 1, minWidth: 160, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  {/* Room header — same height as time col header */}
                  <div style={{
                    height: HEADER_H,
                    padding: '8px 10px',
                    background: 'var(--surface-2)',
                    borderBottom: '2px solid var(--border)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    flexShrink: 0, position: 'sticky', top: 0, zIndex: 2,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc(room.name), marginBottom: 3 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Cap: {room.capacity}</div>
                  </div>

                  {/* Slot body */}
                  <div style={{ position: 'relative', height: TOTAL_H, cursor: 'pointer' }}
                    onClick={e => slotClick(room, selDay, e)}>
                    {/* Grid lines — one per 30-min slot */}
                    {SLOTS.map((slot, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: 0, right: 0,
                        top: i * SLOT_H, height: SLOT_H,
                        borderTop: `1px solid ${slot.m === 0 ? 'var(--border)' : 'var(--border)'}`,
                        background: slot.m === 0 ? 'transparent' : 'rgba(0,0,0,.008)',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                      }} />
                    ))}
                    {/* Events */}
                    {bkForDay(selDay, room.id).map(b => <EventBlock key={b.id} b={b} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="cal-legend">
          {rooms.map(r => (
            <div key={r.id} className="legend-item">
              <span className="legend-dot" style={{ background: rc(r.name) }} />{r.name}
            </div>
          ))}
          <div className="legend-item"><span className="legend-dot" style={{ background: '#b45309' }} />Pending</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#0f766e' }} />Confirmed</div>
        </div>
      </div>

      {/* Booking popup */}
      {popup && (mob ? (
        <>
          <div className="sheet-ov" onClick={closePopup} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-head">
              <span className="sheet-title">New Booking</span>
              <button className="modal-close" onClick={closePopup}>✕</button>
            </div>
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
            <div className="modal-head">
              <span className="modal-title">New Booking</span>
              <button className="modal-close" onClick={closePopup}>✕</button>
            </div>
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
