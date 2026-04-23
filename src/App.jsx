import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ProtectedRoute, useAuth } from './components/auth/AuthContext'
import { NotificationsProvider } from './components/auth/NotificationsContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import MyBookingsPage from './pages/MyBookingsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import ReportsPage from './pages/ReportsPage'
import AdminPage from './pages/AdminPage'

function Home() {
  const { profile } = useAuth()
  if (!profile) return null
  return profile.source === 'supabase_auth' ? <DashboardPage /> : <CalendarPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Home />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="my-bookings" element={<MyBookingsPage />} />
              <Route path="approvals" element={<ProtectedRoute ownerOnly><ApprovalsPage /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute ownerOnly><ReportsPage /></ProtectedRoute>} />
              <Route path="admin" element={<ProtectedRoute ownerOnly><AdminPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
