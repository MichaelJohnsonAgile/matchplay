import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import GameDay from './pages/GameDay'
import AthleteProfile from './pages/AthleteProfile'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gameday/:id" element={<GameDay />} />
        <Route path="/athlete/:id" element={<AthleteProfile />} />
      </Routes>
    </div>
  )
}

export default App

