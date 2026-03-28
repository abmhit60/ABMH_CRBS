import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInMinutes } from 'date-fns'

const HOUR_H = 60
const START_H = 8
const END_H = 21
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => i + START_H)

const ROOM_COLORS = {
  'Conference Room 1':    '#4f46e5',
  'Conference Room 2':    '#0891b2',
  'Onco Conference Room': '#059669',
}
const STATUS_COLORS = { pending: '#f59e0b', confirmed: null }

function getColor(b) {
  if (b.status === 'pending') return '#f59e0b'
  return ROOM_COLORS[b.rooms?.name] ?? '#6366f1'
}

export default function CalendarPage() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [view, setView] = useState('day')
  const navigate = useNavigate()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    supabase.from('rooms').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setRooms(data || []))
  }, [])

  useEffect(() => {
    supabase.from('bookings').select('*, rooms(name)')
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', addDays(weekStart, 7).toISOString())
      .then(({ data }) => setBookings(data || []))
  }, [weekStart])

  function dayRoomBookings(day, roomId) {
    return bookings.filter(b =>
      b.room_id === roomId && isSameDay(parseISO(b.start_time), day)
    )
  }

  function topPx(b) {
    const s = parseISO(b.start_time)
    return ((s.getHours() - START_H) * 60 + s.getMinutes()) / 60 * HOUR_H
  }

  function heightPx(b) {
    return Math.max(differenceInMinutes(parseISO(b.end_time), parseISO(b.start_time)) / 60 * HOUR_H, 28)
  }

  function isRoomBooked(day, roomId, hour) {
    return bookings.some(b => {
      if (b.room_id !== roomId) return false
      const s = parseISO(b.start_time), e = parseISO(b.end_time)
      const slotS = new Date(day); slotS.setHours(hour, 0, 0, 0)
      const slotE = new Date(day); slotE.setHours(hour + 1, 0, 0, 0)
      return isSameDay(s, day) && s < slotE && e > slotS
    })
  }

  function handleRoomColClick(day, roomId, e) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const hour = Math.floor(y / HOUR_H) + START_H
    if (isRoomBooked(day, roomId, hour)) { alert('This slot is already booked.'); return }
    const room = rooms.find(r => r.id === roomId)
    navigate(`/book?date=${format(day, 'yyyy-MM-dd')}&hour=${hour}&room=${roomId}`)
  }

  const EventBlock = ({ b }) => (
    <div style={{
      position: 'absolute', left: 2, right: 2,
      top: topPx(b), height: heightPx(b),
      background: getColor(b),
      borderRadius: 6, padding: '4px 6px', color: '#fff',
      overflow: 'hidden', zIndex: 2, boxSizing: 'border-box',
      boxShadow: '0 1px 4px rgba(0,0,0,.2)', cursor: 'default',
    }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
      <div style={{ fontSize: 10, opacity: .85 }}>{format(parseISO(b.start_time), 'h:mm a')} – {format(parseISO(b.end_time), 'h:mm a')}</div>
      <div style={{ fontSize: 10, opacity: .75 }}>{b.requester_name}</div>
      {b.status === 'pending' && <div style={{ fontSize: 9, background: 'rgba(0,0,0,.2)', borderRadius: 3, padding: '1px 4px', display: 'inline-block', marginTop: 2 }}>Pending</div>}
    </div>
  )

  const RoomGrid = ({ day }) => {
    const scrollRef = React.useRef(null)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Single scrollable container with sticky time column */}
        <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'inline-flex', minWidth: '100%' }}>

            {/* Time column — sticky left */}
            <div style={{ flexShrink: 0, width: 52, position: 'sticky', left: 0, zIndex: 3, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
              {/* Corner spacer matching room header height */}
              <div style={{ height: 64, background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }} />
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', borderTop: '0.5px solid var(--border)', boxSizing: 'border-box' }}>
                  {format(new Date(2000, 0, 1, h), 'h a')}
                </div>
              ))}
            </div>

            {/* Room columns */}
            {rooms.map(room => (
              <div key={room.id} style={{ flex: 1, minWidth: 160, borderLeft: '0.5px solid var(--border)' }}>
                {/* Room header — sticky top */}
                <div style={{ height: 64, position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', padding: '8px', textAlign: 'center', boxSizing: 'border-box' }}>
                  <div style={{ width: 10, height: 10, background: ROOM_COLORS[room.name] ?? '#6366f1', borderRadius: '50%', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Cap: {room.capacity}</div>
                </div>
                {/* Events */}
                <div style={{ position: 'relative', height: HOURS.length * HOUR_H, cursor: 'pointer' }}
                  onClick={e => handleRoomColClick(day, room.id, e)}>
                  {HOURS.map(h => (
                    <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: '0.5px solid var(--border)', height: HOUR_H, pointerEvents: 'none' }} />
                  ))}
                  {dayRoomBookings(day, room.id).map(b => <EventBlock key={b.id} b={b} />)}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Room Calendar</h1>
          <p className="page-sub">{format(weekStart, 'dd MMM')} – {format(addDays(weekStart, 6), 'dd MMM yyyy')}</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" onClick={() => setWeekStart(w => addDays(w, -7))}>←</button>
          <button className="btn-outline" onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDay(new Date()) }}>Today</button>
          <button className="btn-outline" onClick={() => setWeekStart(w => addDays(w, 7))}>→</button>
          <button className={view === 'day' ? 'btn-primary' : 'btn-outline'} onClick={() => setView('day')}>Day</button>
          <button className={view === 'week' ? 'btn-primary' : 'btn-outline'} onClick={() => setView('week')}>Week</button>
          <button className="btn-primary" onClick={() => navigate('/book')}>+ Book</button>
        </div>
      </div>

      {/* Day view — room columns */}
      {view === 'day' && (
        <div className="cal-wrap">
          {/* Day strip */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 12px 8px', borderBottom: '0.5px solid var(--border)', scrollbarWidth: 'none' }}>
            {days.map(day => (
              <button key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: 46, padding: '8px 4px', borderRadius: 12, border: '1px solid',
                  borderColor: isSameDay(day, selectedDay) ? 'var(--brand)' : 'var(--border)',
                  background: isSameDay(day, selectedDay) ? 'var(--brand)' : 'var(--surface)',
                  color: isSameDay(day, selectedDay) ? '#fff' : isSameDay(day, new Date()) ? 'var(--brand)' : 'var(--text-2)',
                  cursor: 'pointer', fontFamily: 'inherit', gap: 2,
                }}>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{format(day, 'EEE')}</span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{format(day, 'd')}</span>
              </button>
            ))}
          </div>
          {/* Room columns */}
          <RoomGrid day={selectedDay} />
        </div>
      )}

      {/* Week view — one column per day */}
      {view === 'week' && (
        <div className="cal-wrap" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 600 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length}, 1fr)`, background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
              <div />
              {days.map(day => (
                <div key={day.toISOString()} style={{ padding: '10px 6px', textAlign: 'center', borderLeft: '0.5px solid var(--border)', background: isSameDay(day, new Date()) ? 'var(--brand-light)' : 'transparent' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{format(day, 'EEE')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isSameDay(day, new Date()) ? 'var(--brand)' : 'var(--text-1)', marginTop: 2 }}>{format(day, 'd')}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length}, 1fr)`, overflowY: 'auto', maxHeight: '65vh' }}>
              <div style={{ borderRight: '0.5px solid var(--border)' }}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', borderTop: '0.5px solid var(--border)', boxSizing: 'border-box' }}>
                    {format(new Date(2000, 0, 1, h), 'h a')}
                  </div>
                ))}
              </div>
              {days.map(day => (
                <div key={day.toISOString()}
                  style={{ position: 'relative', height: HOURS.length * HOUR_H, borderLeft: '0.5px solid var(--border)', cursor: 'pointer' }}
                  onClick={e => {
                    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                    const hour = Math.floor(y / HOUR_H) + START_H
                    navigate(`/book?date=${format(day, 'yyyy-MM-dd')}&hour=${hour}`)
                  }}>
                  {HOURS.map(h => <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: '0.5px solid var(--border)', height: HOUR_H, pointerEvents: 'none' }} />)}
                  {bookings.filter(b => isSameDay(parseISO(b.start_time), day)).map(b => (
                    <div key={b.id} style={{
                      position: 'absolute', left: 2, right: 2,
                      top: topPx(b), height: heightPx(b),
                      background: getColor(b),
                      borderRadius: 6, padding: '3px 5px', color: '#fff',
                      overflow: 'hidden', zIndex: 2, boxSizing: 'border-box',
                    }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <div style={{ fontSize: 9, opacity: .85 }}>{b.rooms?.name}</div>
                      <div style={{ fontSize: 9, opacity: .8 }}>{format(parseISO(b.start_time), 'h:mm a')} – {format(parseISO(b.end_time), 'h:mm a')}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="cal-legend" style={{ marginTop: 12 }}>
        {rooms.map(r => (
          <div key={r.id} className="legend-item">
            <span className="legend-dot" style={{ background: ROOM_COLORS[r.name] ?? '#6366f1' }} />{r.name}
          </div>
        ))}
        <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }} />Pending</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} />Confirmed</div>
      </div>
    </div>
  )
}
