import React, { useState, useEffect, useRef } from 'react'
import { X, Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { transcribeAudio } from '../../services/api'

// Centralized helper to check exact control "stop" commands
const isStopCommand = (text) => {
  if (!text || typeof text !== 'string') return false
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[.!?,]/g, '')
    .replace(/\s+/g, ' ')

  return (
    normalized === 'stop' ||
    normalized === 'stop please' ||
    normalized === 'please stop' ||
    normalized === 'okay stop'
  )
}

export default function VoiceMode({ isOpen, onClose, documentId, onSendQuestion }) {
  // Voice UI states: 'listening', 'thinking', 'speaking', 'error'
  const [modeState, setModeState] = useState('listening') 
  const [transcript, setTranscript] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [ttsBlocked, setTtsBlocked] = useState(false)

  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const silenceTimerRef = useRef(null)
  const isComponentMounted = useRef(true)
  const voicesRef = useRef([])

  // Single Session AudioContext & Turn Tracking
  const turnIdRef = useRef(0)
  const ttsGenerationRef = useRef(0)
  const ttsSpeakingRef = useRef(false)
  const recognitionRunningRef = useRef(false)
  const audioContextRef = useRef(null)

  // State refs for safe usage in async callbacks
  const stateRef = useRef(modeState)
  stateRef.current = modeState

  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  const transcriptRef = useRef(transcript)
  transcriptRef.current = transcript

  useEffect(() => {
    isComponentMounted.current = true

    // Pre-load Web Speech API voices
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices()
      }
      updateVoices()
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = updateVoices
      }
    }

    return () => {
      isComponentMounted.current = false
      cleanupAllAudio()
    }
  }, [])

  // Manage open/close audio cycles
  useEffect(() => {
    if (isOpen) {
      turnIdRef.current += 1
      setTranscript('')
      setAiAnswer('')
      setErrorMessage(null)
      setTtsBlocked(false)
      startListeningCycle()
    } else {
      cleanupAllAudio()
    }
  }, [isOpen])

  // Centralized, safe AudioContext cleanup
  const closeAudioContextSafely = async () => {
    const ctx = audioContextRef.current
    if (!ctx) return
    audioContextRef.current = null

    try {
      if (ctx.state !== 'closed') {
        await ctx.close()
      }
    } catch (error) {
      console.warn('AudioContext cleanup warning:', error)
    }
  }

  // Centralized, safe TTS stop
  const stopSpeaking = () => {
    ttsGenerationRef.current++
    ttsSpeakingRef.current = false

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } catch (error) {
      console.warn('TTS stop warning:', error)
    }
  }

  const cleanupAllAudio = () => {
    turnIdRef.current += 1 // Invalidate previous callbacks
    stopSpeaking()
    closeAudioContextSafely()

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    recognitionRunningRef.current = false

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
      mediaRecorderRef.current = null
    }
  }

  const startListeningCycle = async () => {
    if (!isOpenRef.current) return
    const currentTurn = turnIdRef.current

    // Stop speaking safely without recreating AudioContext
    stopSpeaking()

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    setModeState('listening')
    setErrorMessage(null)
    setTranscript('')
    audioChunksRef.current = []

    // 1. Initialize Browser SpeechRecognition using ONLY final results
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition && !recognitionRunningRef.current) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = false // Stop automatically when user pauses
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event) => {
          if (turnIdRef.current !== currentTurn) return

          let interimText = ''
          let finalText = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const resultText = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalText += resultText
            } else {
              interimText += resultText
            }
          }

          const currentText = finalText || interimText
          if (currentText.trim() && isComponentMounted.current) {
            setTranscript(currentText)
            transcriptRef.current = currentText

            // Reset silence timer on speech activity
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = setTimeout(() => {
              handleAutoSpeechEnd(currentTurn)
            }, 1500)
          }

          // If we received an explicit final transcript, process immediately
          if (finalText.trim()) {
            handleFinalTranscript(finalText.trim(), currentTurn)
          }
        }

        recognition.onend = () => {
          recognitionRunningRef.current = false
          if (stateRef.current === 'listening' && isOpenRef.current && turnIdRef.current === currentTurn) {
            handleAutoSpeechEnd(currentTurn)
          }
        }

        recognition.onerror = (err) => {
          if (err.error === 'no-speech') {
            console.debug('Speech recognition: no speech detected')
          } else {
            console.warn('SpeechRecognition notice:', err.error)
          }
        }

        recognition.start()
        recognitionRunningRef.current = true
        recognitionRef.current = recognition
      } catch (err) {
        console.warn('Browser STT start exception:', err)
      }
    }

    // 2. Hardware-filtered MediaRecorder (Echo Cancellation + Noise Suppression + Auto Gain Control)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (stateRef.current !== 'listening' || turnIdRef.current !== currentTurn) return

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        processCapturedQuestion(audioBlob, currentTurn)
      }

      mediaRecorder.start()
    } catch (err) {
      console.error('Microphone hardware permission error:', err)
      if (isComponentMounted.current && turnIdRef.current === currentTurn) {
        setErrorMessage('Microphone access denied or unavailable. Check browser permissions.')
        setModeState('error')
      }
    }
  }

  const handleAutoSpeechEnd = (currentTurn = turnIdRef.current) => {
    if (turnIdRef.current !== currentTurn) return

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (stateRef.current !== 'listening') return

    // Stop recording and process final audio
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const processCapturedQuestion = async (audioBlob, currentTurn) => {
    if (turnIdRef.current !== currentTurn) return
    let finalQuery = transcriptRef.current.trim()

    // Fallback to Groq Whisper if live browser STT was empty
    if (!finalQuery && audioBlob && audioBlob.size > 0) {
      if (isComponentMounted.current) setModeState('thinking')
      try {
        finalQuery = await transcribeAudio(audioBlob)
        if (finalQuery.trim() && isComponentMounted.current && turnIdRef.current === currentTurn) {
          setTranscript(finalQuery)
        }
      } catch (e) {
        console.error('Whisper STT fallback failed:', e)
      }
    }

    if (!finalQuery || !finalQuery.trim()) {
      if (isComponentMounted.current && isOpenRef.current && turnIdRef.current === currentTurn) {
        setErrorMessage("Didn't catch that. Tap below to speak again.")
        setModeState('error')
      }
      return
    }

    handleFinalTranscript(finalQuery, currentTurn)
  }

  // CENTRALIZED HANDLER FOR ALL FINAL TRANSCRIPTS
  const handleFinalTranscript = async (text, currentTurn) => {
    if (turnIdRef.current !== currentTurn) return
    const cleanText = text.trim()
    if (!cleanText) return

    console.log('Final user speech:', cleanText)

    // 1. Control Command check for "STOP" (Stops TTS, does NOT call RAG)
    if (isStopCommand(cleanText)) {
      console.log('Voice Stop Command recognized:', cleanText)
      stopSpeaking()
      turnIdRef.current += 1
      if (isOpenRef.current) {
        startListeningCycle()
      }
      return
    }

    // 2. Accept ALL other user speech and send directly to RAG
    submitQuestionToRAG(cleanText, currentTurn)
  }

  const submitQuestionToRAG = async (queryText, currentTurn) => {
    if (turnIdRef.current !== currentTurn) return
    if (isComponentMounted.current) setModeState('thinking')

    try {
      const response = await onSendQuestion(queryText)
      if (turnIdRef.current !== currentTurn) return

      const answerText = response?.answer || "I couldn't find information about that in this document."

      if (isComponentMounted.current) {
        setAiAnswer(answerText)
        speakAnswer(answerText, currentTurn)
      }
    } catch (err) {
      console.error('RAG Pipeline Error:', err)
      if (isComponentMounted.current && turnIdRef.current === currentTurn) {
        setErrorMessage('Failed to retrieve answer. Tap to try again.')
        setModeState('error')
      }
    }
  }

  const getPreferredVoice = () => {
    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices()
    return (
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] ||
      null
    )
  }

  const speakAnswer = (text, currentTurn) => {
    if (turnIdRef.current !== currentTurn) return

    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis unavailable on browser')
      setTimeout(() => {
        if (isComponentMounted.current && isOpenRef.current && turnIdRef.current === currentTurn) startListeningCycle()
      }, 4000)
      return
    }

    stopSpeaking()
    const generation = ++ttsGenerationRef.current
    setModeState('speaking')
    ttsSpeakingRef.current = true

    // Clean plain text for natural TTS output
    const cleanText = text.replace(/[*#_`~]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)

    const voice = getPreferredVoice()
    if (voice) utterance.voice = voice

    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      if (generation !== ttsGenerationRef.current) return
      setTtsBlocked(false)
      console.log('TTS started speaking:', cleanText.slice(0, 40))
    }

    utterance.onend = () => {
      ttsSpeakingRef.current = false
      if (generation !== ttsGenerationRef.current) return

      if (isComponentMounted.current && isOpenRef.current && turnIdRef.current === currentTurn) {
        setTimeout(() => {
          if (isComponentMounted.current && isOpenRef.current && turnIdRef.current === currentTurn) {
            startListeningCycle()
          }
        }, 400)
      }
    }

    utterance.onerror = (event) => {
      ttsSpeakingRef.current = false
      console.warn('Speech synthesis event:', {
        error: event.error,
        charIndex: event.charIndex,
        elapsedTime: event.elapsedTime
      })

      // Canceled / interrupted are expected during user speech interruption
      if (event.error === 'canceled' || event.error === 'interrupted') {
        return
      }

      if (event.error === 'not-allowed') {
        setTtsBlocked(true)
      } else if (isComponentMounted.current && isOpenRef.current && turnIdRef.current === currentTurn) {
        startListeningCycle()
      }
    }

    setTimeout(() => {
      if (generation === ttsGenerationRef.current && turnIdRef.current === currentTurn) {
        window.speechSynthesis.speak(utterance)
      }
    }, 100)
  }

  const manualEnableTts = () => {
    setTtsBlocked(false)
    if (aiAnswer && turnIdRef.current) {
      speakAnswer(aiAnswer, turnIdRef.current)
    }
  }

  const stopSpeakingAndAskNew = () => {
    stopSpeaking()
    turnIdRef.current += 1
    if (isOpenRef.current) {
      startListeningCycle()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface-900 border border-white/10 rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-between min-h-[460px] max-h-[92dvh] shadow-2xl overflow-hidden">
        
        {/* Header / Close button */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-white text-base">RAGify Voice Assistant</span>
          </div>
          <button
            onClick={() => {
              cleanupAllAudio()
              onClose()
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Voice Mode"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Center Visualizer & State Indicator */}
        <div className="flex-1 flex flex-col items-center justify-center my-6 space-y-6 w-full text-center px-4">
          
          {/* Main Pulsing Orb / Icon */}
          <div className="relative flex items-center justify-center">
            {modeState === 'listening' && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-rose-500/20 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full bg-rose-500/30 animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg z-10">
                  <Mic className="w-10 h-10 animate-bounce" />
                </div>
              </>
            )}

            {modeState === 'thinking' && (
              <div className="w-20 h-20 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 z-10">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            )}

            {modeState === 'speaking' && (
              <>
                <div className="absolute w-32 h-32 rounded-full bg-brand-500/20 animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white shadow-lg z-10">
                  <Volume2 className="w-10 h-10 animate-pulse" />
                </div>
              </>
            )}

            {modeState === 'error' && (
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 z-10">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Status Label */}
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              {modeState === 'listening' && 'Listening...'}
              {modeState === 'thinking' && 'Thinking...'}
              {modeState === 'speaking' && 'Speaking answer...'}
              {modeState === 'error' && 'Notice'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {modeState === 'listening' && 'Speak naturally — say "stop" at any time'}
              {modeState === 'thinking' && 'Retrieving document context via RAG & Groq'}
              {modeState === 'speaking' && 'Say "stop" or ask a question to interrupt'}
            </p>
          </div>

          {/* Dynamic Transcript & Answer Display Box */}
          <div className="w-full max-h-44 overflow-y-auto bg-surface-800/80 border border-white/10 rounded-2xl p-4 text-left no-scrollbar">
            {transcript && (
              <div className="mb-2">
                <span className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider">You Said:</span>
                <p className="text-sm text-slate-200 mt-0.5">{transcript}</p>
              </div>
            )}
            
            {aiAnswer && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase font-semibold text-brand-400 tracking-wider">AI Answer:</span>
                <p className="text-sm text-white mt-0.5 leading-relaxed">{aiAnswer}</p>
              </div>
            )}

            {!transcript && !aiAnswer && !errorMessage && (
              <p className="text-sm text-slate-500 text-center italic py-2">
                Speak naturally. Pausing will automatically send your question...
              </p>
            )}

            {errorMessage && (
              <p className="text-sm text-rose-400 text-center py-1">{errorMessage}</p>
            )}

            {ttsBlocked && (
              <div className="mt-2 text-center">
                <button
                  onClick={manualEnableTts}
                  className="px-4 py-1.5 bg-brand-500 text-white rounded-full text-xs font-medium flex items-center gap-1.5 mx-auto"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Enable Voice Playback
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Controls */}
        <div className="w-full flex items-center justify-center gap-4 pt-4 border-t border-white/10">
          {modeState === 'listening' && (
            <button
              onClick={() => handleAutoSpeechEnd(turnIdRef.current)}
              className="btn-primary bg-rose-500 hover:bg-rose-600 border-none px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              <MicOff className="w-4 h-4" />
              Finish Speaking Now
            </button>
          )}

          {modeState === 'speaking' && (
            <button
              onClick={stopSpeakingAndAskNew}
              className="btn-secondary px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              <VolumeX className="w-4 h-4" />
              Interrupt & Ask Next Question
            </button>
          )}

          {(modeState === 'error' || modeState === 'thinking') && (
            <button
              onClick={startListeningCycle}
              disabled={modeState === 'thinking'}
              className="btn-secondary px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Mic className="w-4 h-4 text-brand-400" />
              Tap to Speak Again
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
