import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'
import api, { warmupBackend } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)

  const loginInFlight = useRef(false)
  const syncedUidRef = useRef(null)

  useEffect(() => {
    // Non-blocking single warmup request on app initialization
    warmupBackend()

    if (!auth) {
      console.warn('Firebase auth not initialized (missing config?)')
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Firebase onAuthStateChanged - currentUser:', currentUser ? {
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        uid: currentUser.uid,
        providerData: currentUser.providerData
      } : null)
      setUser(currentUser)

      if (currentUser) {
        // Prevent duplicate /auth/sync requests if already synced for this UID
        if (syncedUidRef.current === currentUser.uid) {
          setLoading(false)
          return
        }

        try {
          setSyncError(null)
          const token = await currentUser.getIdToken()
          await api.post('/auth/sync', {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
          syncedUidRef.current = currentUser.uid
        } catch (e) {
          console.error('Backend auth sync failed', e)
          setSyncError('Failed to sync account with server. Please refresh.')
        } finally {
          setLoading(false)
        }
      } else {
        syncedUidRef.current = null
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async () => {
    if (!auth) return alert('Firebase is not configured yet.')

    // Bug 1 fix: guard against concurrent popup calls.
    // signInWithPopup throws auth/cancelled-popup-request when called a second
    // time before the first popup resolves. This can happen from:
    //   a) rapid clicks (no debounce on the button in LoginPage)
    //   b) React 18 StrictMode double-invoking effects in dev mode
    // We use a ref rather than state so the check is synchronous and doesn't
    // trigger an extra render cycle that could itself cause a second invocation.
    if (loginInFlight.current) {
      console.warn('Login already in progress — ignoring extra call')
      return
    }

    loginInFlight.current = true
    try {
      const result = await signInWithPopup(auth, googleProvider)
      console.log('Firebase signInWithPopup result user:', result.user ? {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      } : null)
    } catch (error) {
      // auth/cancelled-popup-request: a second popup was opened before this one
      // resolved — our guard above prevents this in normal use, but Firebase can
      // still emit it when the user explicitly closes the popup window.
      // auth/popup-closed-by-user: user dismissed the popup — not an error.
      const ignoredCodes = ['auth/cancelled-popup-request', 'auth/popup-closed-by-user']
      if (!ignoredCodes.includes(error.code)) {
        console.error('Login failed', error)
        alert('Login failed: ' + error.message)
      }
    } finally {
      loginInFlight.current = false
    }
  }

  const logout = async () => {
    if (auth) await signOut(auth)
  }

  const getIdToken = async () => user?.getIdToken() ?? null

  return (
    <AuthContext.Provider value={{ user, currentUser: user, loading, syncError, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
