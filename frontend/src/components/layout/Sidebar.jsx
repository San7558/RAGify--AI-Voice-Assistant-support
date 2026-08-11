import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Upload, FileText, User, LogOut, Zap, Menu, X
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/upload',    label: 'Upload',      icon: Upload },
  { to: '/documents', label: 'Documents',   icon: FileText },
]

const activeStyle = {
  background: 'rgba(99,102,241,0.2)',
  color: '#a5b4fc',
  border: '1px solid rgba(99,102,241,0.3)',
}
const inactiveStyle = {
  color: '#94a3b8',
  border: '1px solid transparent',
  background: 'transparent',
}
const itemBase = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.625rem 0.75rem',
  borderRadius: '0.75rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  transition: 'all 0.15s',
  textDecoration: 'none',
}

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    if (setIsOpen) setIsOpen(false)
  }, [location.pathname, setIsOpen])

  const handleLogout = async () => {
    await logout()
    if (setIsOpen) setIsOpen(false)
    navigate('/')
  }

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen && setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer Container */}
      <aside
        className={`fixed top-0 left-0 h-full flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: '16rem',
          background: '#111118',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo & Close header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 0 12px rgba(99,102,241,0.35)' }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base gradient-text">RAGify AI</span>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen && setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              id={`sidebar-${label.toLowerCase().replace(/\s/g, '-')}`}
              style={({ isActive }) => ({ ...itemBase, ...(isActive ? activeStyle : inactiveStyle) })}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <NavLink
            to="/profile"
            id="sidebar-profile"
            style={({ isActive }) => ({ ...itemBase, ...(isActive ? activeStyle : inactiveStyle) })}
          >
            {user?.photoURL
              ? <img src={user.photoURL} alt="avatar" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full flex-shrink-0 object-cover" />
              : <User className="w-4 h-4 flex-shrink-0" />
            }
            <span className="truncate">{user?.displayName?.split(' ')[0] ?? 'Profile'}</span>
          </NavLink>

          <button
            onClick={handleLogout}
            id="sidebar-logout"
            style={{
              ...itemBase,
              width: '100%',
              color: '#94a3b8',
              cursor: 'pointer',
              border: '1px solid transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
