import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/AuthContext'
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInMinutes } from 'date-fns'

// ===== RESPONSIVE CONSTANTS =====
const START_H = 8
const END_H = 21

// Generate slots
const SLOTS = []
for (let h = START_H; h < END_H; h++) {
  SLOTS.push({ h, m: 0 })
  SLOTS.push({ h, m: 30 })
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selDay, setSelDay] = useState(new Date())
  const [mob, setMob] = useState(window.innerWidth < 768)

  const SLOT_H = mob ? 32 : 36
  const TIME_COL_W = mob ? 60 : 70
  const HEADER_H = mob ? 50 : 56
  const TOTAL_H = SLOTS.length * SLOT_H

  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    supabase.from('rooms').select('*').eq('is_active', true).then(({ data }) => setRooms(data || []))
  }, [])

  useEffect(() => { fetchBk() }, [weekStart])

  async function fetchBk() {
    const { data } = await supabase.from('bookings')
      .select('*')
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', addDays(weekStart, 7).toISOString())
    setBookings(data || [])
  }

  function minutesToPx(mins) {
    return Math.round((mins / 30) * SLOT_H)
  }

  const bkForDay = (day, rid) =>
    bookings.filter(b => b.room_id === rid && isSameDay(parseISO(b.start_time), day))

  function slotClick(room, day, e) {
    console.log('slot clicked', room.name, day)
  }

  const EventBlock = ({ b }) => {
    const start = parseISO(b.start_time)
    const end = parseISO(b.end_time)

    const top = minutesToPx((start.getHours() - START_H) * 60 + start.getMinutes())
    const height = minutesToPx(differenceInMinutes(end, start))

    return (
      <div
        style={{
          position: 'absolute',
          top,
          height,
          left: 4,
          right: 4,
          background: '#4f46e5',
          borderRadius: 6,
          color: '#fff',
          fontSize: 10,
          padding: 4
        }}
      >
        {b.title}
      </div>
    )
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: rooms.length * 180
        }}
      >

        {/* TIME COLUMN */}
        <div
          style={{
            width: TIME_COL_W,
            minWidth: TIME_COL_W,
            position: 'sticky',
            left: 0,
            zIndex: 10,
            background: '#fff'
          }}
        >
          <div style={{ height: HEADER_H }} />

          {SLOTS.map((slot, i) => (
            <div
              key={i}
              style={{
                height: SLOT_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 8,
                fontSize: 11,
                borderTop: slot.m === 0 ? '1.5px solid #ddd' : '1px solid #eee'
              }}
            >
              {slot.m === 0 && format(new Date(2000, 0, 1, slot.h), 'h a')}
            </div>
          ))}
        </div>

        {/* ROOMS */}
        <div style={{ display: 'flex' }}>
          {rooms.map(room => (
            <div
              key={room.id}
              style={{
                minWidth: mob ? 140 : 180,
                flexShrink: 0,
                borderLeft: '1px solid #eee'
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  height: HEADER_H,
                  padding: 8,
                  background: '#f9fafb',
                  borderBottom: '2px solid #ddd',
                  position: 'sticky',
                  top: 0
                }}
              >
                <div style={{ fontWeight: 600 }}>{room.name}</div>
                <div style={{ fontSize: 10 }}>Cap: {room.capacity}</div>
              </div>

              {/* GRID */}
              <div
                style={{ position: 'relative', height: TOTAL_H }}
                onClick={e => slotClick(room, selDay, e)}
              >
                {SLOTS.map((slot, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * SLOT_H,
                      left: 0,
                      right: 0,
                      height: SLOT_H,
                      borderTop: slot.m === 0 ? '1.5px solid #ddd' : '1px solid #eee',
                      background: slot.m === 30 ? '#fafafa' : 'transparent'
                    }}
                  />
                ))}

                {bkForDay(selDay, room.id).map(b => (
                  <EventBlock key={b.id} b={b} />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
