import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
    : '/api',
  timeout: 30_000,
})

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  try {
    if (auth) {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady()
      }
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken()
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
  } catch (err) {
    console.error('Failed to attach Firebase ID token:', err)
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    if (err.response?.status === 401 && originalRequest && !originalRequest._retry && auth?.currentUser) {
      originalRequest._retry = true
      try {
        const freshToken = await auth.currentUser.getIdToken(true)
        originalRequest.headers['Authorization'] = `Bearer ${freshToken}`
        return api(originalRequest)
      } catch (refreshErr) {
        console.error('Failed to refresh Firebase ID token:', refreshErr)
      }
    }
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
