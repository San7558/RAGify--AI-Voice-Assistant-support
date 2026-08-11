import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'

import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import DashboardPage  from './pages/DashboardPage'
import UploadPage     from './pages/UploadPage'
import ChatPage       from './pages/ChatPage'
import DocumentsPage  from './pages/DocumentsPage'
import ProfilePage    from './pages/ProfilePage'

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"      element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard"         element={<DashboardPage />} />
        <Route path="/upload"            element={<UploadPage />} />
        <Route path="/chat/:documentId"  element={<ChatPage />} />
        <Route path="/documents"         element={<DocumentsPage />} />
        <Route path="/profile"           element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
