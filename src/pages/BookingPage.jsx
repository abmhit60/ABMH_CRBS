import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/auth/ProtectedRoute'
import { format } from 'date-fns'

export default function BookingPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const defaultDate = params.get('date') || format(new Date(), 'yyyy-MM-dd')
  const defaultHour = params.get('hour') || '09'

  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState({
    room_id: '',
    title: '',
    purpose: '',
    attendees_count: 1,
    date: defaultDate,
    start_hour: String(defaultHour).padStart(2, '0') + ':00',
    end_hour: String(Number(defaultHour) + 1).padStart(2, '0') + ':00',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.from('rooms').select('*').eq('is_active', true)
      .then(({ data }) => {
        setRooms(data || [])
        if (data?.length) setForm(f => ({ ...f, room_id: data[0].id }))
      })
  }, [])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  // Check if selected room is small conference room (auto-confirm, no approval)
  const isSmallRoom = rooms.find(r => r.id === form.room_id)?.name?.toLowerCase().includes('small') ||
                      rooms.find(r => r.id === form.room_id)?.name === 'Conference Room 2'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Change 2: Enforce meeting title
    if (!form.title.trim()) {
      setError('Meeting Title is mandatory.')
      return
    }

    // Change 4: Validate that the logged-in session matches the booker
    if (!profile || !profile.full_name) {
      setError('Session expired or invalid. Please log out and log back in to make a booking.')
      return
    }

    setLoading(true)

    const start_time = new Date(`${form.date}T${form.start_hour}:00`)
    const end_time = new Date(`${form.date}T${form.end_hour}:00`)

    if (end_time <= start_time) {
      setError('End time must be after start time.')
      setLoading(false)
      return
    }

    // Change 1: Small conference room = auto confirmed, no approval needed
    const bookingStatus = isSmallRoom ? 'confirmed' : 'pending'

    const bookingData = {
      room_id: form.room_id,
      title: form.title.trim(),
      purpose: form.purpose,
      attendees_count: Number(form.attendees_count),
      start_time: start_time.toISOString(),
      end_time: end_time.toISOString(),
      status: bookingStatus,
      requester_name: profile?.full_name,
      requester_mobile: profile?.mobile,
      requester_dept: profile?.department_name,
    }

    if (profile?.source === 'supabase_auth') {
      bookingData.booked_by = profile.id
    }

    // Check for conflicts before inserting
    const { data: conflicts } = await supabase.from('bookings')
      .select('id, title, requester_name')
      .eq('room_id', form.room_id)
      .in('status', ['pending', 'confirmed'])
      .lt('start_time', end_time.toISOString())
      .gt('end_time', start_time.toISOString())

    if (conflicts && conflicts.length > 0) {
      setError(`This room is already booked during that time by ${conflicts[0].requester_name}. Please choose a different time or room.`)
      setLoading(false)
      return
    }

    const { error } = await supabase.from('bookings').insert(bookingData)

    setLoading(false)
    if (error) setError(error.message)
    else setSuccess(true)
  }

  const selectedRoom = rooms.find(r => r.id === form.room_id)

  if (success) return (
    <div className="page">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h2>Booking Submitted!</h2>
        <p>{isSmallRoom ? 'Your booking is confirmed! Conference Room 2 does not require approval.' : "Your request has been sent to Smita Hule for approval. You'll be notified once it's reviewed."}</p>
        <div className="success-actions">
          <button className="btn-primary" onClick={() => navigate('/')}>View Calendar</button>
          <button className="btn-outline" onClick={() => { setSuccess(false); setForm(f => ({ ...f, title: '', purpose: '' })) }}>
            Book Another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Booking</h1>
          <p className="page-sub">Fill in the details below to book a conference room.</p>
        </div>
      </div>

      <div className="form-layout">
        <form className="booking-form card" onSubmit={handleSubmit}>
          <div className="requester-info">
            <div className="requester-row">
              <span className="requester-label">Requested by</span>
              <span className="requester-value">{profile?.full_name}</span>
            </div>
            <div className="requester-row">
              <span className="requester-label">Mobile</span>
              <span className="requester-value">{profile?.mobile}</span>
            </div>
            <div className="requester-row">
              <span className="requester-label">Department</span>
              <span className="requester-value">{profile?.department_name ?? '—'}</span>
            </div>
          </div>

          <div className="field">
            <label>Room</label>
            <select className="select" value={form.room_id} onChange={set('room_id')} required>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} (capacity: {r.capacity})</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Meeting Title <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" value={form.title} onChange={set('title')}
              placeholder="e.g. Weekly Department Meeting" required />
          </div>

          <div className="field">
            <label>Purpose / Agenda</label>
            <textarea value={form.purpose} onChange={set('purpose')}
              placeholder="Brief description of the meeting..." rows={3} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={set('date')}
                min={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            <div className="field">
              <label>Number of Attendees</label>
              <input type="number" value={form.attendees_count} onChange={set('attendees_count')}
                min={1} max={selectedRoom?.capacity ?? 100} required />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Start Time</label>
              <input type="time" value={form.start_hour} onChange={set('start_hour')} required />
            </div>
            <div className="field">
              <label>End Time</label>
              <input type="time" value={form.end_hour} onChange={set('end_hour')} required />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : isSmallRoom ? 'Confirm Booking' : 'Submit for Approval'}
            </button>
          </div>
        </form>

        {selectedRoom && (
          <div className="room-info-card card">
            <h3>{selectedRoom.name}</h3>
            <div className="room-detail">
              <span>Location</span><span>{selectedRoom.location}</span>
            </div>
            <div className="room-detail">
              <span>Capacity</span><span>{selectedRoom.capacity} people</span>
            </div>
            <div className="room-detail">
              <span>Amenities</span>
              <div className="amenities">
                {selectedRoom.amenities?.map(a => (
                  <span key={a} className="tag">{a}</span>
                ))}
              </div>
            </div>
            <div className="room-detail">
              <span>Approval</span>
              <span style={{ color: isSmallRoom ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                {isSmallRoom ? '✓ Auto Confirmed' : 'Smita Hule'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
