import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import GameDay from './pages/GameDay'
import Login from './pages/Login'
import Matchmaking from './pages/Matchmaking'
import Courts from './pages/Courts'

// Redirect unauthenticated users to /login
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Existing league routes (public for now) */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/gameday/:id" element={<GameDay />} />

        {/* New authenticated routes */}
        <Route path="/matchmaking" element={<RequireAuth><Matchmaking /></RequireAuth>} />
        <Route path="/courts" element={<RequireAuth><Courts /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
