import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'

const LandingPage   = lazy(() => import('./pages/LandingPage'))
const LoginPage     = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UploadPage    = lazy(() => import('./pages/UploadPage'))
const ChatPage      = lazy(() => import('./pages/ChatPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const ProfilePage   = lazy(() => import('./pages/ProfilePage'))

const RouteSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 rounded-full animate-spin border-2 border-brand-500 border-t-transparent" />
  </div>
)

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteSpinner />}>
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
    </Suspense>
  )
}
