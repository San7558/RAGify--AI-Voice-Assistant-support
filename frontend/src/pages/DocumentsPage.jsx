import { useState, useEffect } from 'react'
import { FileText, Trash2, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Bug 2 fix: track which document IDs are currently being deleted so we can
  // disable/show spinner on the specific row's delete button, preventing
  // double-click from firing two concurrent DELETE requests for the same doc.
  const [deletingIds, setDeletingIds] = useState(new Set())

  const fetchDocs = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const res = await api.get('/documents')
      setDocuments(res.data)
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    await fetchDocs(true)
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document and all its chat history?')) return

    // Bug 2 fix: prevent double-delete of the same document (e.g. double-click
    // on the trash icon before the first request completes).
    if (deletingIds.has(id)) return
    setDeletingIds(prev => new Set(prev).add(id))

    try {
      await api.delete(`/documents/${id}`)
      // Remove from local state immediately on success
      setDocuments(docs => docs.filter(d => d.id !== id))
    } catch (err) {
      // Bug 2 fix: a 404 means the document no longer exists in the backend
      // (stale frontend list — could have been purged by the cleanup service
      // or deleted in another tab/session). Treat this as "already gone":
      // silently remove it from the list so the UI stays consistent.
      const isNotFound = err.message?.toLowerCase().includes('not found') ||
                         err.response?.status === 404

      if (isNotFound) {
        console.warn(`Document ${id} was already deleted — removing from list.`)
        setDocuments(docs => docs.filter(d => d.id !== id))
      } else {
        console.error('Delete failed:', err)
        alert('Failed to delete document: ' + err.message)
      }
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="w-6 h-6 text-brand-400 flex-shrink-0" />
          My Documents
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-all px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-white/10 disabled:opacity-50"
            title="Refresh document list"
            aria-label="Refresh document list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link to="/upload" className="btn-primary">New Upload</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No documents found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map(doc => {
              const isDeleting = deletingIds.has(doc.id)
              return (
                <div key={doc.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                      ${doc.source_type === 'website' ? 'bg-accent-500/10 text-accent-400' : 'bg-brand-500/10 text-brand-400'}
                    `}>
                      {doc.source_type === 'website' ? <ExternalLink className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link 
                        to={`/chat/${doc.id}`} 
                        className="font-semibold text-white hover:text-brand-400 transition-colors block text-sm sm:text-base leading-snug"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {doc.title || doc.file_name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <span className={`font-medium ${doc.status === 'ready' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {doc.status}
                        </span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto justify-end">
                    <Link
                      to={`/chat/${doc.id}`}
                      className="px-3 py-1.5 bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      Open Chat
                    </Link>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeleting}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors disabled:pointer-events-none"
                      title="Delete document"
                      aria-label="Delete document"
                    >
                      {isDeleting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
