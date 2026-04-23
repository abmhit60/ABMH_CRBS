import { useNotifications } from '../auth/NotificationsContext'
export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead } = useNotifications()
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-head">
          <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all read</button>
        </div>
        <div className="notif-list">
          {notifications.length === 0
            ? <div className="empty-state" style={{ padding: 32 }}>No notifications yet</div>
            : notifications.map(n => (
                <div key={n.id} className={`notif-item${!n.is_read ? ' unread' : ''}`}>
                  <div style={{ fontSize: 18 }}>{n.type === 'approved' ? '✅' : n.type === 'rejected' ? '❌' : '📅'}</div>
                  <div><p style={{ fontSize: 13 }}>{n.message}</p><span className="notif-time">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span></div>
                </div>
              ))}
        </div>
      </div>
    </>
  )
}
