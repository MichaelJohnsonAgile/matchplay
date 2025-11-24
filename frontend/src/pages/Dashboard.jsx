import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import Skeleton from '../components/Skeleton'
import { gameDayAPI, leaderboardAPI } from '../services/api'
import { formatGameDayDate } from '../utils/dateFormat'

export default function Dashboard() {
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [gameDays, setGameDays] = useState([])
  const [showAllGameDays, setShowAllGameDays] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    loadGameDays()
    loadLeaderboard()
  }, [])

  const loadGameDays = async () => {
    try {
      setIsLoading(true)
      const data = await gameDayAPI.getAll()
      setGameDays(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load game days:', err)
      setError('Failed to load game days. Make sure the backend server is running.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    try {
      setIsLoadingLeaderboard(true)
      const data = await leaderboardAPI.getOverall()
      setLeaderboard(data)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }

  // Filter game days to show last 2 previous + upcoming
  const getFilteredGameDays = () => {
    if (showAllGameDays) {
      return gameDays
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Split into past and upcoming
    const pastGameDays = gameDays
      .filter(gd => new Date(gd.date) < today)
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Most recent first
      .slice(0, 2)

    const upcomingGameDays = gameDays
      .filter(gd => new Date(gd.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date)) // Earliest first
      .slice(0, 2)

    return [...pastGameDays, ...upcomingGameDays]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const filteredGameDays = getFilteredGameDays()

  const handleCreateGameDay = () => {
    setIsCreateModalOpen(true)
  }

  const handleGameDayClick = (gameDayId) => {
    navigate(`/gameday/${gameDayId}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-green-100 text-green-800 border-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-800'
      case 'upcoming':
      default:
        return 'bg-white text-[#377850] border-[#377850]'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'in-progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'upcoming':
      default:
        return 'Upcoming'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#377850] p-4">
        <img 
          src="/logo.svg" 
          alt="MatchPlay" 
          className="h-12 w-auto"
        />
      </header>

      <main className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Game Days</h2>
          <button
            onClick={handleCreateGameDay}
            className="bg-[#377850] text-white w-10 h-10 flex items-center justify-center text-2xl font-light hover:bg-[#2d5f40] transition-colors rounded leading-none"
            title="Create Game Day"
          >
            +
          </button>
        </div>

        {error && (
          <div className="border border-red-500 bg-red-50 p-4 mb-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : gameDays.length === 0 ? (
          <div className="border border-[#377850] p-8 text-center mb-6">
            <p className="text-gray-600 mb-4">No game days scheduled yet</p>
            <button
              onClick={handleCreateGameDay}
              className="bg-[#377850] text-white px-6 py-3 text-sm font-medium"
            >
              Create Your First Game Day
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {filteredGameDays.map((gameDay) => (
              <div
                key={gameDay.id}
                onClick={() => handleGameDayClick(gameDay.id)}
                className="border border-[#377850] p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{formatGameDayDate(gameDay.date)}</h3>
                    <p className="text-sm text-gray-600">{gameDay.venue}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium border ${getStatusColor(gameDay.status)}`}>
                    {getStatusText(gameDay.status)}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{gameDay.athleteCount} Athletes</span>
                  <span>•</span>
                  <span>{gameDay.matchCount} Matches</span>
                  <span>•</span>
                  <span>{gameDay.rounds} Rounds</span>
                </div>
              </div>
            ))}
            
            {!showAllGameDays && gameDays.length > filteredGameDays.length && (
              <button
                onClick={() => setShowAllGameDays(true)}
                className="w-full border border-[#377850] px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                See All Game Days ({gameDays.length})
              </button>
            )}
            
            {showAllGameDays && (
              <button
                onClick={() => setShowAllGameDays(false)}
                className="w-full border border-[#377850] px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Show Less
              </button>
            )}
          </div>
        )}

        {/* Overall Season Leaderboard */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Overall Season Leaderboard</h2>
          
          {isLoadingLeaderboard ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="border border-[#377850] p-8 text-center">
              <p className="text-gray-600">No leaderboard data yet. Complete some matches to see rankings!</p>
            </div>
          ) : (
            <div className="border border-[#377850] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#377850] bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Rank</th>
                    <th className="text-left p-3 font-semibold">Athlete</th>
                    <th className="text-center p-3 font-semibold">Games</th>
                    <th className="text-center p-3 font-semibold">W</th>
                    <th className="text-center p-3 font-semibold">L</th>
                    <th className="text-center p-3 font-semibold">Win %</th>
                    <th className="text-center p-3 font-semibold">+</th>
                    <th className="text-center p-3 font-semibold">-</th>
                    <th className="text-center p-3 font-semibold">+/-</th>
                  </tr>
                </thead>
                 <tbody>
                   {leaderboard.map((athlete, index) => {
                     const stats = athlete.stats || {}
                     const matchesPlayed = stats.matchesPlayed || 0
                     const wins = stats.wins || 0
                     const losses = stats.losses || 0
                     const winPercentage = stats.winPercentage || 0
                     const pointsFor = stats.pointsFor || 0
                     const pointsAgainst = stats.pointsAgainst || 0
                     const pointDifferential = stats.pointsDiff || 0
                     
                     return (
                       <tr 
                         key={athlete.id} 
                         className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                       >
                         <td className="p-3 font-medium">{index + 1}</td>
                         <td className="p-3 font-medium">{athlete.name}</td>
                         <td className="p-3 text-center">{matchesPlayed}</td>
                         <td className="p-3 text-center">{wins}</td>
                         <td className="p-3 text-center">{losses}</td>
                         <td className="p-3 text-center">{winPercentage.toFixed(0)}%</td>
                         <td className="p-3 text-center">{pointsFor}</td>
                         <td className="p-3 text-center">{pointsAgainst}</td>
                         <td className={`p-3 text-center font-medium ${
                           pointDifferential > 0 ? 'text-green-600' : 
                           pointDifferential < 0 ? 'text-red-600' : ''
                         }`}>
                           {pointDifferential > 0 ? '+' : ''}{pointDifferential}
                         </td>
                       </tr>
                     )
                   })}
                 </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Game Day"
      >
        <CreateGameDayForm 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={loadGameDays}
        />
      </Modal>
    </div>
  )
}

function CreateGameDayForm({ onClose, onSuccess }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    date: '',
    venue: 'Evolve North Narrabeen',
    pointsToWin: 11,
    winByMargin: 2,
    rounds: 3,
    movementRule: 'auto' // auto, 1, or 2
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const newGameDay = await gameDayAPI.create(formData)
      console.log('Created game day:', newGameDay)
      
      // Notify parent to refresh list
      if (onSuccess) {
        onSuccess()
      }
      
      // Navigate to the new game day
      navigate(`/gameday/${newGameDay.id}`)
    } catch (err) {
      console.error('Failed to create game day:', err)
      setError('Failed to create game day. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Date
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="w-full border border-[#377850] px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Venue
        </label>
        <input
          type="text"
          name="venue"
          value={formData.venue}
          onChange={handleChange}
          required
          placeholder="e.g., Central Pickleball Courts"
          className="w-full border border-[#377850] px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-gray-300 pt-4">
        <h3 className="font-semibold mb-3">Scoring Rules</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Points to Win
            </label>
            <select
              name="pointsToWin"
              value={formData.pointsToWin}
              onChange={handleChange}
              className="w-full border border-[#377850] px-3 py-2 text-sm"
            >
              <option value="9">9</option>
              <option value="11">11</option>
              <option value="15">15</option>
              <option value="21">21</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Win by Margin
            </label>
            <select
              name="winByMargin"
              value={formData.winByMargin}
              onChange={handleChange}
              className="w-full border border-[#377850] px-3 py-2 text-sm"
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Number of Rounds
        </label>
        <select
          name="rounds"
          value={formData.rounds}
          onChange={handleChange}
          className="w-full border border-[#377850] px-3 py-2 text-sm"
        >
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Movement Between Rounds
        </label>
        <select
          name="movementRule"
          value={formData.movementRule}
          onChange={handleChange}
          className="w-full border border-[#377850] px-3 py-2 text-sm"
        >
          <option value="auto">Auto (2 if any 5-player group, else 1)</option>
          <option value="1">1 up, 1 down</option>
          <option value="2">2 up, 2 down</option>
        </select>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-[#377850] px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
        >
          {isSubmitting ? 'Creating...' : 'Create Game Day'}
        </button>
      </div>
    </form>
  )
}

