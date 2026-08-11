export default function StatCard({ label, value, icon: Icon, gradient }) {
  return (
    <div className="card p-5 group transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="text-slate-400 text-sm font-medium">{label}</div>
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-card transition-transform group-hover:scale-110"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value ?? '—'}</div>
    </div>
  )
}
