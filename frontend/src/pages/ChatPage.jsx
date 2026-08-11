import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, FileText, AlertCircle } from 'lucide-react'
import ChatBox from '../components/chat/ChatBox'
import api from '../services/api'

export default function ChatPage() {
  const { documentId: id } = useParams()
  const [messages, setMessages] = useState([])
  const [document, setDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initChat = async () => {
      try {
        setIsLoading(true)
        // 1. Fetch document details
        const docRes = await api.get(`/documents/${id}`)
        setDocument(docRes.data)
        
        // 2. Fetch chat history
        const histRes = await api.get(`/chat/${id}/history`)
        setMessages(histRes.data.messages || [])
        
      } catch (err) {
        console.error(err)
        setError('Failed to load chat. The document may not exist or is not ready.')
      } finally {
        setIsLoading(false)
      }
    }
    
    initChat()
  }, [id])

  const handleSendMessage = async (text) => {
    // Optimistic UI update
    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setIsSending(true)

    try {
      const res = await api.post(`/chat/${id}`, { query: text })
      const aiMsg = { 
        role: 'assistant', 
        content: res.data.answer, 
        sources: res.data.sources,
        created_at: new Date().toISOString() 
      }
      setMessages(prev => [...prev, aiMsg])
      return res.data
    } catch (err) {
      console.error(err)
      // Display error as a system message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `**Error:** ${err.response?.data?.detail || err.message}`, 
        sources: [],
        created_at: new Date().toISOString() 
      }])
      throw err
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link to="/dashboard" className="btn-primary">Return to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-4rem)] lg:h-[calc(100vh-4rem)] p-2 sm:p-6 max-w-6xl mx-auto flex flex-col w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 border-b border-white/10 pb-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Link to="/dashboard" className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white flex-shrink-0 mt-0.5" title="Back to Dashboard">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          
          <div className="min-w-0 flex-1">
            <h1 
              className="text-sm sm:text-base font-bold text-white flex items-start gap-2 leading-snug"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}
            >
              <FileText className="w-4 h-4 text-brand-400 flex-shrink-0 mt-1" />
              <span className="min-w-0 flex-1">{document?.title || document?.file_name || 'Document Chat'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {document?.chunk_count ? `${document.chunk_count} indexed chunks` : 'Ready'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <ChatBox 
          messages={messages} 
          isLoading={isSending} 
          onSend={handleSendMessage} 
          documentId={id}
        />
      </div>
    </div>
  )
}
