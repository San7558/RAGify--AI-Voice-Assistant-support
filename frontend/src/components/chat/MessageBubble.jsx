import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { User, Sparkles, Volume2, VolumeX } from 'lucide-react'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Cleanup speech synthesis on unmount or response change
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      window.speechSynthesis.cancel() // stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(message.content)
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div 
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
          ${isUser ? 'bg-surface-700 border border-white/10' : 'bg-gradient-to-br from-brand-500 to-accent-500'}
        `}
      >
        {isUser ? <User className="w-5 h-5 text-slate-300" /> : <Sparkles className="w-5 h-5 text-white" />}
      </div>
      
      {/* Bubble */}
      <div 
        className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[80%] ${isUser ? 'text-right' : ''}`}
      >
        <div 
          className={`inline-block rounded-2xl p-4 text-sm text-left shadow-md relative group max-w-full overflow-hidden break-words
            ${isUser ? 'bg-surface-700 text-white border border-white/10' : 'bg-brand-500/10 border border-brand-500/20 text-slate-200'}
          `}
          style={{ overflowWrap: 'anywhere' }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <>
              <div className="prose prose-invert prose-sm max-w-none prose-a:text-brand-400 prose-p:leading-relaxed pr-8 break-words" style={{ overflowWrap: 'anywhere' }}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>

              {/* TTS Speaker Button */}
              <button
                type="button"
                onClick={handleToggleSpeak}
                title={isSpeaking ? 'Stop reading' : 'Read answer aloud'}
                className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors
                  ${isSpeaking 
                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-white/10'}
                `}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
        
      </div>
    </div>
  )
}
