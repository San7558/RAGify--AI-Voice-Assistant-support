import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import { Menu, Zap } from 'lucide-react'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0a0a0f' }}>
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '2px solid #6366f1', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-surface-900">
      {/* Mobile Top App Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-white/10 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
          aria-label="Open Sidebar Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm gradient-text">RAGify AI</span>
        </div>
        <div className="w-8" /> {/* spacer */}
      </header>

      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full lg:ml-64 min-h-[calc(100dvh-3.5rem)] lg:min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
