import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
    : '/api',
  timeout: 30_000,
})

// Attach Firebase ID token to every request (Phase 2: real token)
api.interceptors.request.use(async (config) => {
  try {
    // Dynamically import to avoid circular deps; will be non-null after Phase 2
    const { auth } = await import('./firebase')
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken()
      config.headers['Authorization'] = `Bearer ${token}`
    }
  } catch {
    // no-op in Phase 1
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail || err.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData()
  const mimeType = audioBlob.type || 'audio/webm'
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm'
  formData.append('file', audioBlob, `speech.${ext}`)

  const response = await api.post('/speech/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data?.transcript || ''
}

api.transcribeAudio = transcribeAudio

export default api
