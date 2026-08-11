import { BookOpen, ExternalLink, FileText } from 'lucide-react'

export default function SourceCard({ source, index }) {
  const isWeb = source.source?.startsWith('http')
  
  return (
    <div className="group relative flex items-center gap-2 bg-surface-800 hover:bg-surface-700 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 transition-colors cursor-help">
      {/* Icon */}
      {isWeb ? <ExternalLink className="w-3.5 h-3.5 text-brand-400" /> : <FileText className="w-3.5 h-3.5 text-brand-400" />}
      
      {/* Label */}
      <span className="font-medium truncate max-w-[150px]">
        [{index}] {isWeb ? new URL(source.source).hostname : source.source?.split('/').pop()}
      </span>
      {source.page && <span className="text-slate-500">p.{source.page}</span>}
      
      {/* Tooltip content on hover */}
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface-800 border border-white/10 rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
          <BookOpen className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-white truncate">{source.source}</span>
        </div>
        <p className="text-slate-300 line-clamp-6 leading-relaxed">
          {source.page_content}
        </p>
      </div>
    </div>
  )
}
