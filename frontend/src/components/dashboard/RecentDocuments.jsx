import { FileText, ChevronRight, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function RecentDocuments({ documents = [] }) {
  return (
    <div className="card h-full flex flex-col">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-400" />
          Recent Documents
        </h3>
        <Link to="/documents" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center">
          View all <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>
      
      <div className="p-2 flex-1 overflow-y-auto no-scrollbar">
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <FileText className="w-8 h-8 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">No documents yet.</p>
            <Link to="/upload" className="text-sm text-brand-400 hover:text-brand-300 mt-1">Upload your first file</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <Link
                key={doc._id || doc.id}
                to={`/chat/${doc._id || doc.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                  <FileText className="w-5 h-5 text-slate-400 group-hover:text-brand-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                    {doc.title || doc.file_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {doc.chunk_count ? `${doc.chunk_count} chunks` : 'Processing...'} • {doc.source_type}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
