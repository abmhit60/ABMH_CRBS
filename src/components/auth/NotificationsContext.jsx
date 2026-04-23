import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
const NC = createContext({ notifications: [], unreadCount: 0, markAllRead: () => {} })
export const useNotifications = () => useContext(NC)
export function NotificationsProvider({ children }) {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  useEffect(() => {
    if (!profile?.id || profile.id === 'admin-session') return
    supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => setNotifications(data || []))
  }, [profile?.id])
  function markAllRead() { setNotifications(n => n.map(x => ({ ...x, is_read: true }))) }
  return <NC.Provider value={{ notifications, unreadCount: notifications.filter(n => !n.is_read).length, markAllRead }}>{children}</NC.Provider>
}
