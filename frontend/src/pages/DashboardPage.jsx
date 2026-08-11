import { useState, useEffect } from 'react'
import { FileText, MessageSquare, Database, LayoutDashboard, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import StatCard from '../components/dashboard/StatCard'
import RecentDocuments from '../components/dashboard/RecentDocuments'
import UsageCard from '../components/dashboard/UsageCard'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    document_count: 0,
    question_count: 0,
    total_chunks: 0,
    recent_documents: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Phase 4+: Fetch real stats from backend
    // For now, we simulate a fetch
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats')
        setStats(res.data)
      } catch (e) {
        // Fallback dummy data while backend is not ready
        console.debug('Using dummy stats since backend is not ready')
        setStats({
          document_count: 0,
          question_count: 0,
          total_chunks: 0,
          recent_documents: []
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-brand-400" />
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.displayName?.split(' ')[0] || 'User'}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/upload" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Document
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          label="Total Documents" 
          value={loading ? '...' : stats.document_count} 
          icon={FileText} 
          gradient="linear-gradient(135deg, #6366f1, #4f46e5)" 
        />
        <StatCard 
          label="Questions Asked" 
          value={loading ? '...' : stats.question_count} 
          icon={MessageSquare} 
          gradient="linear-gradient(135deg, #a855f7, #9333ea)" 
        />
        <StatCard 
          label="Indexed Chunks" 
          value={loading ? '...' : stats.total_chunks} 
          icon={Database} 
          gradient="linear-gradient(135deg, #10b981, #0d9488)" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentDocuments documents={stats.recent_documents} />
        </div>
        <div className="space-y-6">
          <UsageCard used={stats.question_count} limit={100} label="Free Tier Q&A" />
          
          {/* Quick Tips */}
          <div className="card p-5 border-brand-500/30 bg-brand-500/5">
            <h3 className="font-semibold text-brand-300 text-sm mb-2">Pro Tip</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              When querying large documents, try to be specific in your questions. RAGify will retrieve the top 4 most relevant chunks to generate your answer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
