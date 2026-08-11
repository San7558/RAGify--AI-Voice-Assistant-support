import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Mic, MicOff } from 'lucide-react'
import MessageBubble from './MessageBubble'
import VoiceMode from './VoiceMode'
import { transcribeAudio } from '../../services/api'

export default function ChatBox({ messages, isLoading, onSend, documentId }) {
  const [input, setInput] = useState('')
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const [speechError, setSpeechError] = useState(null)
  
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
  }

  // Adapter function so VoiceMode uses the existing RAG pipeline
  const handleVoiceSendQuestion = async (queryText) => {
    return await onSend(queryText)
  }

  return (
    <div className="flex flex-col h-full bg-surface-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Full-Screen / Centered Voice Mode Overlay */}
      <VoiceMode
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        documentId={documentId}
        onSendQuestion={handleVoiceSendQuestion}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Hello there!</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              I've read through your document. Ask me any questions you have about it!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="bg-brand-500/10 border border-brand-500/20 text-brand-300 rounded-2xl p-4 text-sm shadow-md animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-surface-800">
        {speechError && (
          <p className="text-xs text-rose-400 mb-2 px-1">{speechError}</p>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="w-full bg-surface-700 border border-white/10 rounded-xl pl-3.5 pr-28 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all disabled:opacity-50"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Dedicated Voice Mode Button */}
            <button
              type="button"
              onClick={() => setIsVoiceModeOpen(true)}
              disabled={isLoading}
              title="Open ChatGPT-style Voice Mode"
              className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 transition-all"
              aria-label="Open Voice Mode"
            >
              <Mic className="w-4 h-4 text-brand-400" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-400 active:scale-95 text-white disabled:opacity-50 disabled:hover:bg-brand-500 transition-all"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
