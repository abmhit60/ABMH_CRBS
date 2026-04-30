import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'

const SLOT_H = 32
const START_H = 8
const END_H = 21
const TIME_COL_W = 56

const SLOTS = []
for (let h = START_H; h < END_H; h++) {
  SLOTS.push({ h, m: 0 })
  SLOTS.push({ h, m: 30 })
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

function topPx(b) {
  const s = new Date(b.start_time)
  const minsFromStart = (s.getHours() - START_H) * 60 + s.getMinutes()
  return Math.max((minsFromStart / 30) * SLOT_H, 0)
}

function htPx(b) {
  const mins = (new Date(b.end_time) - new Date(b.start_time)) / 60000
  return Math.max((mins / 30) * SLOT_H, 10)
}

const TOTAL_H = SLOTS.length * SLOT_H
const HEADER_H = 72

const EventBlock = ({ b, canSee }) => {
  const [tooltip, setTooltip] = useState(false)
  return (
    <div className="cal-event"
      style={{ top: topPx(b), height: htPx(b), background: eventColor(b) }}
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
      onTouchStart={e => { e.stopPropagation(); setTooltip(v => !v) }}
    >
      <span className="cal-event-title">{canSee(b) ? b.title : '🔒 Booked'}</span>
      <span className="cal-event-time">
        {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
      </span>
      <span className="cal-event-who">{b.requester_name}</span>
      {b.status === 'pending' && <span className="cal-event-tag">Pending</span>}

      {tooltip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          background: '#0d1b2a', color: '#fff', borderRadius: 10,
          padding: '10px 14px', zIndex: 50, minWidth: 200, maxWidth: 260,
          boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          fontSize: 12, lineHeight: 1.6, pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            {canSee(b) ? b.title : '🔒 Booked'}
          </div>
          <div>🕐 {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}</div>
          <div>👤 {b.requester_name}</div>
          {b.requester_dept && <div>🏢 {b.requester_dept}</div>}
          {b.attendees_count && <div>👥 {b.attendees_count} attendee{b.attendees_count > 1 ? 's' : ''}</div>}
          {b.attendee_names && canSee(b) && <div>📋 {b.attendee_names}</div>}
          <div style={{
            marginTop: 6, fontSize: 11, fontWeight: 600,
            color: b.status === 'pending' ? '#fbbf24' : b.status === 'confirmed' ? '#34d399' : '#9ca3af'
          }}>
            {b.status === 'pending' ? '⏳ Pending approval' : b.status === 'confirmed' ? '✓ Confirmed' : '✕ Cancelled'}
          </div>
          <div style={{
            position: 'absolute', bottom: -6, left: 16,
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #0d1b2a',
          }} />
        </div>
      )}
    </div>
  )
}

const PopupContent = ({ popup, form, setForm, err, profile, startTimeOptions, endTimeOptions }) => {
  if (!popup) return null
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: rc(popup.room.name), flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{popup.room.name}</span>
        {isSmall(popup.room.name) && <span className="badge badge-confirmed" style={{ fontSize: 11 }}>Auto Confirm</span>}
      </div>
      <div className="meta-row">
        <span className="meta-chip">📅 {format(popup.date, 'EEE, dd MMM')}</span>
        <span className="meta-chip">🕐 {String(form.startHour).padStart(2, '0')}:{String(form.startMin).padStart(2, '0')}</span>
      </div>
      <div className="req-block">
        <div className="req-row"><span className="req-label">Booking for</span><span className="req-val">{profile?.full_name}</span></div>
        {profile?.department_name && <div className="req-row"><span className="req-label">Department</span><span className="req-val">{profile.department_name}</span></div>}
      </div>
      <div className="field">
        <label>Meeting Title <span className="field-req">*</span></label>
        <input type="text" placeholder="e.g. Weekly Department Meeting"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start Time</label>
          <select value={`${form.startHour}:${form.startMin}`}
            onChange={e => {
              const [h, m] = e.target.value.split(':').map(Number)
              const newEndH = h + 1 <= END_H ? h + 1 : END_H
              setForm(f => ({ ...f, startHour: h, startMin: m, endHour: newEndH, endMin: m }))
            }}>
            {startTimeOptions().map(o => (
              <option key={o.label} value={`${o.h}:${o.m}`}>{o.label}</option>
            ))}
          </select>
        </div>
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
      </div>
      <div className="field">
        <label>Attendees Count</label>
        <input type="number" value={form.attendees} min={1} max={popup.room.capacity || 50}
          onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} />
      </div>
      <div className="field">
        <label>Attendee Names <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
        <textarea
          placeholder="e.g. Dr. Sharma, Rani K, Naval M"
          value={form.attendeeNames}
          onChange={e => setForm(f => ({ ...f, attendeeNames: e.target.value }))}
          rows={2}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
      {err && <div className="err-msg">{err}</div>}
      {!isSmall(popup.room.name) && (
        <div style={{ fontSize: 12, color: 'var(--pending)', background: 'var(--pending-bg)', borderRadius: 8, padding: '8px 12px' }}>
          ⏳ Requires approval from Smita Hule
        </div>
      )}
    </>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const isOwner = profile?.source === 'supabase_auth'
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selDay, setSelDay] = useState(new Date())
  const [popup, setPopup] = useState(null)
  const [form, setForm] = useState({ title: '', attendees: 1, attendeeNames: '', startHour: 9, startMin: 0, endHour: 10, endMin: 0 })
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
    const from = new Date(weekStart); from.setHours(0, 0, 0, 0)
    const to = new Date(addDays(weekStart, 7)); to.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('bookings').select('*, rooms(name)')
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', from.toISOString())
      .lt('start_time', to.toISOString())
    setBookings(data || [])
  }

  const bkForDay = (day, rid) =>
    bookings.filter(b => b.room_id === rid && isSameDay(new Date(b.start_time), day))

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

    const endSt = new Date(st.getTime() + 30 * 60000)
    const conflict = bookings.find(b => {
      if (b.room_id !== room.id) return false
      const bs = new Date(b.start_time), be = new Date(b.end_time)
      return isSameDay(bs, day) && bs < endSt && be > st
    })
    if (conflict) return

    const endH = slot.h + 1 <= END_H ? slot.h + 1 : END_H
    setPopup({ room, date: new Date(day), startHour: slot.h, startMin: slot.m })
    setForm({ title: '', attendees: 1, attendeeNames: '', startHour: slot.h, startMin: slot.m, endHour: endH, endMin: slot.m })
    setErr('')
  }

  function openQuickBook() {
    if (!rooms.length) return
    const now = new Date()
    const h = Math.min(Math.max(now.getHours(), START_H), END_H - 2)
    const m = now.getMinutes() < 30 ? 0 : 30
    setPopup({ room: rooms[0], date: new Date(selDay), startHour: h, startMin: m })
    setForm({ title: '', attendees: 1, attendeeNames: '', startHour: h, startMin: m, endHour: h + 1, endMin: m })
    setErr('')
  }

  async function submit() {
    if (!form.title.trim()) { setErr('Meeting title is required.'); return }
    if (!profile?.full_name) { setErr('Session expired. Please log in again.'); return }
    const st = new Date(popup.date); st.setHours(form.startHour, form.startMin, 0, 0)
    const en = new Date(popup.date); en.setHours(form.endHour, form.endMin, 0, 0)
    if (en <= st) { setErr('End time must be after start time.'); return }

    setBusy(true); setErr('')
    const { error } = await supabase.from('bookings').insert({
      room_id: popup.room.id,
      title: form.title.trim(),
      attendees_count: Number(form.attendees) || 1,
      attendee_names: form.attendeeNames.trim() || null,
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

  function startTimeOptions() {
    const opts = []
    for (let h = START_H; h < END_H; h++) {
      for (let m = 0; m < 60; m += 15) {
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        opts.push({ h, m, label })
      }
    }
    return opts
  }

  function endTimeOptions() {
    const opts = []
    if (!popup) return opts
    let h = form.startHour, m = form.startMin
    m += 15; if (m >= 60) { h++; m = m - 60 }
    while (h < END_H || (h === END_H && m === 0)) {
      const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      opts.push({ h, m, label })
      m += 15; if (m >= 60) { h++; m = m - 60 }
    }
    return opts
  }

  const popupProps = { popup, form, setForm, err, profile, startTimeOptions, endTimeOptions }

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

        <div className="cal-scroll-hint">← Swipe left / right to see all rooms →</div>

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

        <div className="cal-grid" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', overflowX: 'auto' }}>
          <div className="cal-grid-inner" style={{ display: 'flex', minWidth: 'max-content' }}>

            <div style={{ flexShrink: 0, width: TIME_COL_W, position: 'sticky', left: 0, zIndex: 4, background: 'var(--surface)' }}>
              <div style={{ height: HEADER_H, borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 4 }} />
              {SLOTS.map((slot, i) => (
                <div key={i} style={{
                  height: SLOT_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  paddingRight: 8, paddingTop: 2, fontSize: 11,
                  color: slot.m === 0 ? 'var(--text-3)' : 'transparent',
                  fontFamily: "'JetBrains Mono', monospace",
                  borderTop: slot.m === 0 ? '1px solid var(--border)' : '1px solid transparent',
                  borderRight: '1px solid var(--border)', background: 'var(--surface)', boxSizing: 'border-box',
                }}>
                  {slot.m === 0 ? format(new Date(2000, 0, 1, slot.h, 0), 'h a') : ''}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flex: 1 }}>
              {rooms.map(room => (
                <div key={room.id} style={{ flex: 1, minWidth: 160, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    height: HEADER_H, padding: '8px 10px', background: 'var(--surface-2)',
                    borderBottom: '2px solid var(--border)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', flexShrink: 0, position: 'sticky', top: 0, zIndex: 3,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc(room.name), marginBottom: 3 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Cap: {room.capacity}</div>
                  </div>

                  <div style={{ position: 'relative', height: TOTAL_H, cursor: 'pointer' }}
                    onClick={e => slotClick(room, selDay, e)}>
                    {SLOTS.map((slot, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: 0, right: 0, top: i * SLOT_H, height: SLOT_H,
                        borderTop: slot.m === 0 ? '1px solid var(--border)' : '1px solid transparent',
                        background: slot.m === 0 ? 'transparent' : 'rgba(0,0,0,.008)',
                        boxSizing: 'border-box', pointerEvents: 'none',
                      }} />
                    ))}
                    {bkForDay(selDay, room.id).map(b => <EventBlock key={b.id} b={b} canSee={canSee} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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

      {popup && (mob ? (
        <>
          <div className="sheet-ov" onClick={closePopup} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-head">
              <span className="sheet-title">New Booking</span>
              <button className="modal-close" onClick={closePopup}>✕</button>
            </div>
            <div className="sheet-body"><PopupContent {...popupProps} /></div>
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
            <div className="modal-body"><PopupContent {...popupProps} /></div>
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
