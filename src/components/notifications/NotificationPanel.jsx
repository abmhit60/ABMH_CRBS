import { useNotifications } from '../auth/ProtectedRoute'
import { format } from 'date-fns'

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead } = useNotifications()

  const typeIcon = {
    booking_request: '📋',
    booking_confirmed: '✅',
    booking_rejected: '❌',
    booking_cancelled: '🚫',
  }

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-header">
          <h3>Notifications</h3>
          <button className="mark-read-btn" onClick={markAllRead}>Mark all read</button>
        </div>
        <div className="notif-list">
          {notifications.length === 0 && (
            <div className="notif-empty">No notifications yet</div>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
              <span className="notif-icon">{typeIcon[n.type] ?? '🔔'}</span>
              <div className="notif-body">
                <p>{n.message}</p>
                <span className="notif-time">
                  {format(new Date(n.created_at), 'dd MMM, hh:mm a')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
