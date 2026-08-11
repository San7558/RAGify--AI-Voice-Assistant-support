import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  // Bug 1 fix: local in-flight state so the button is disabled while the popup
  // is open. This is the UI-layer complement to the loginInFlight ref guard in
  // AuthContext — belt-and-suspenders: the ref prevents double invocation in
  // logic, this disables the DOM element so the user gets visual feedback too.
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  const handleLogin = async () => {
    if (loggingIn || loading) return
    setLoggingIn(true)
    try {
      await login()
    } finally {
      // Reset even if login() threw — AuthContext's ref guard also resets, but
      // keeping these in sync prevents the button staying permanently disabled
      // if an unexpected error path bypasses the context's finally block.
      setLoggingIn(false)
    }
  }

  const busy = loading || loggingIn

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Orbs */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full animate-pulse-slow"
          style={{
            top: '33%', left: '25%', width: '20rem', height: '20rem',
            background: 'rgba(99,102,241,0.2)', filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute rounded-full animate-pulse-slow delay-1000"
          style={{
            bottom: '33%', right: '25%', width: '16rem', height: '16rem',
            background: 'rgba(168,85,247,0.15)', filter: 'blur(80px)',
          }}
        />
      </div>
      <div aria-hidden className="absolute inset-0 bg-grid pointer-events-none" style={{ opacity: 0.3 }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
          >
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">RAGify AI</h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Your AI knowledge assistant</p>
        </div>

        {/* Card */}
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#f1f5f9' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: '#94a3b8' }}>
            Sign in to upload documents, ask questions, and get cited answers.
          </p>

          <button
            id="google-signin-btn"
            onClick={handleLogin}
            disabled={busy}
            aria-disabled={busy}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors"
            style={{
              background: 'white',
              color: '#1f2937',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#f9fafb' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
          >
            {loggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loggingIn ? 'Signing in…' : 'Continue with Google'}
          </button>

          <p className="mt-6 text-xs" style={{ color: '#334155' }}>
            By signing in you agree to our Terms of Service.
            Your documents are private and only accessible to you.
          </p>
        </div>

      </div>
    </div>
  )
}
