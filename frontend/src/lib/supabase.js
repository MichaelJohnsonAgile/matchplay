import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When env vars are missing we stub out a minimal client so the app loads
// in dev without a live Supabase project.
const DEV_MODE = !supabaseUrl || !supabaseAnonKey

let supabase

if (DEV_MODE) {
  console.warn('[auth] Supabase env vars not set — running in dev mock mode')
  // Stub client: magic link just records the email locally for UI testing
  supabase = {
    auth: {
      signInWithOtp: async ({ email }) => {
        console.log('[dev auth] magic link requested for', email)
        return { error: null }
      },
      getSession: async () => {
        const raw = localStorage.getItem('dev_session')
        if (!raw) return { data: { session: null }, error: null }
        return { data: { session: JSON.parse(raw) }, error: null }
      },
      getUser: async () => {
        const raw = localStorage.getItem('dev_session')
        if (!raw) return { data: { user: null }, error: null }
        return { data: { user: JSON.parse(raw).user }, error: null }
      },
      signOut: async () => {
        localStorage.removeItem('dev_session')
        return { error: null }
      },
      onAuthStateChange: (callback) => {
        // fire once on mount with current state
        const raw = localStorage.getItem('dev_session')
        const session = raw ? JSON.parse(raw) : null
        setTimeout(() => callback('INITIAL_SESSION', session), 0)
        // return unsubscribe handle
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase, DEV_MODE }
