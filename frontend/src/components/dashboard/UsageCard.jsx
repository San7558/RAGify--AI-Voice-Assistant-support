import { Activity } from 'lucide-react'

export default function UsageCard({ used = 0, limit = 100, label = 'Questions asked' }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  
  // Color based on usage
  let gradient = 'linear-gradient(to right, #6366f1, #a855f7)'
  if (pct > 80) gradient = 'linear-gradient(to right, #f59e0b, #f97316)'
  if (pct > 95) gradient = 'linear-gradient(to right, #f43f5e, #ec4899)'

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-brand-400" />
        <h3 className="font-semibold text-white text-sm">Usage</h3>
      </div>
      
      <div className="flex justify-between items-end mb-2">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className="text-right">
          <span className="text-white font-bold">{used}</span>
          <span className="text-slate-500 text-sm ml-1">/ {limit}</span>
        </div>
      </div>
      
      <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out rounded-full" 
          style={{ width: `${pct}%`, background: gradient }} 
        />
      </div>
      
      {pct > 80 && (
        <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          Approaching usage limit
        </p>
      )}
    </div>
  )
}
