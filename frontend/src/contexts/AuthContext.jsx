import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, DEV_MODE } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Send a magic link to the given email.
   * In dev mode (no Supabase configured) this simulates login by storing a
   * fake session in localStorage.
   */
  async function signInWithMagicLink(email) {
    if (DEV_MODE) {
      // Simulate receiving and clicking the magic link
      const fakeUser = {
        id: 'dev-' + email.replace(/[^a-z0-9]/gi, ''),
        email,
        user_metadata: {},
      }
      const fakeSession = {
        access_token: `dev:${fakeUser.id}:${email}`,
        user: fakeUser,
      }
      localStorage.setItem('dev_session', JSON.stringify(fakeSession))
      setSession(fakeSession)
      setUser(fakeUser)
      return { error: null, devMode: true }
    }
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  /** Authorization header value to attach to backend API requests. */
  function authHeader() {
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithMagicLink, signOut, authHeader, DEV_MODE }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
