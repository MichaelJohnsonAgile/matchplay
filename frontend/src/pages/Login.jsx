import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { user, signInWithMagicLink, loading, DEV_MODE } = useAuth()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [devLoggedIn, setDevLoggedIn] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  if (user || devLoggedIn) return <Navigate to="/matchmaking" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError(null)
    const { error, devMode } = await signInWithMagicLink(email.trim().toLowerCase())
    setSending(false)
    if (error) {
      setError(error.message)
    } else if (devMode) {
      setDevLoggedIn(true)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎾</div>
          <h1 className="text-2xl font-bold text-gray-900">MatchPlay</h1>
          <p className="text-gray-500 text-sm mt-1">Find your next padel partner</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">📬</div>
            <h2 className="text-lg font-semibold text-gray-800">Check your inbox</h2>
            <p className="text-gray-500 text-sm">
              We sent a magic link to <span className="font-medium text-gray-800">{email}</span>.<br />
              Click the link to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSubmitted(false); setEmail('') }}
              className="text-sm text-green-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {sending ? 'Sending…' : 'Send magic link'}
            </button>

            {DEV_MODE && (
              <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Dev mode — enter any email to log in instantly without a real Supabase project.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
