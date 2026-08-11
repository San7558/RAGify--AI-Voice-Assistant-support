import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Zap, LogIn } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: isLanding ? 'transparent' : 'rgba(17,17,24,0.8)',
        backdropFilter: isLanding ? 'none' : 'blur(20px)',
        borderBottom: isLanding ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" style={{ textDecoration: 'none' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-shadow"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 0 12px rgba(99,102,241,0.35)',
              }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">RAGify AI</span>
          </Link>

          {/* Nav links — landing only */}
          {isLanding && (
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="btn-ghost" style={{ color: '#94a3b8' }}>Features</a>
              <a href="#workflow" className="btn-ghost" style={{ color: '#94a3b8' }}>How it works</a>
            </nav>
          )}

          {/* Auth actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-ghost">Dashboard</Link>
                <button onClick={logout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Sign out</button>
              </>
            ) : (
              <Link to="/login" id="nav-login-btn" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
