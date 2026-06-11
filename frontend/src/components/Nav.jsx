import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'League', icon: '🏆' },
  { to: '/matchmaking', label: 'Matchmaking', icon: '🎾' },
  { to: '/courts', label: 'Courts', icon: '🏟️' },
]

export default function Nav() {
  const { user, signOut, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 flex items-center h-14 gap-6">
        {/* Brand */}
        <Link to="/" className="font-bold text-gray-900 text-base shrink-0">
          🏓 MatchPlay
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_LINKS.map(link => {
            const active = location.pathname === link.to ||
              (link.to !== '/' && location.pathname.startsWith(link.to))
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500 hidden sm:block truncate max-w-36">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-2.5 py-1 rounded-lg"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-medium text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
