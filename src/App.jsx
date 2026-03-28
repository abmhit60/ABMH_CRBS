import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './components/auth/ProtectedRoute'
import { AuthProvider, NotificationsProvider } from './components/auth/ProtectedRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import BookingPage from './pages/BookingPage'
import MyBookingsPage from './pages/MyBookingsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import AdminPage from './pages/AdminPage'
import ReportsPage from './pages/ReportsPage'

function HomeRedirect() {
  const { profile } = useAuth()
  if (!profile) return null
  return profile.role === 'owner' || profile.role === 'admin'
    ? <DashboardPage />
    : <CalendarPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<HomeRedirect />} />
              <Route path="dashboard" element={<ProtectedRoute requiredRole="owner"><DashboardPage /></ProtectedRoute>} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="book" element={<BookingPage />} />
              <Route path="my-bookings" element={<MyBookingsPage />} />
              <Route path="approvals" element={<ProtectedRoute requiredRole="owner"><ApprovalsPage /></ProtectedRoute>} />
              <Route path="admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute requiredRole="owner"><ReportsPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
