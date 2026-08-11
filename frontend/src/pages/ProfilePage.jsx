import { User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>
      
      <div className="card max-w-2xl overflow-hidden">
        {/* Header gradient */}
        <div className="h-24" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }} />
        
        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="absolute -top-12 left-6">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-24 h-24 rounded-full border-4 border-surface-800 bg-surface-700 object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-surface-800 bg-surface-700 flex items-center justify-center">
                <User className="w-10 h-10 text-slate-400" />
              </div>
            )}
          </div>
          
          {/* Details */}
          <div className="pt-16 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white truncate">{user?.displayName || 'Unknown User'}</h2>
              <p className="text-sm text-slate-400 break-all">{user?.email}</p>
            </div>
            
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">User ID</p>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-1 break-all">{user?.uid}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Usage Stats</p>
                <p className="text-sm text-slate-400 mt-1">Free Tier: Active (100 Q&A)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
