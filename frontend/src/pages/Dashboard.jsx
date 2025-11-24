import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { ConfirmModal, AlertModal } from '../components/Alert'
import Skeleton from '../components/Skeleton'
import { gameDayAPI, leaderboardAPI, athleteAPI } from '../services/api'
import { formatGameDayDate } from '../utils/dateFormat'
import { useAdminMode, useNavigateWithAdmin } from '../hooks/useAdminMode'

export default function Dashboard() {
  const navigate = useNavigateWithAdmin()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [gameDays, setGameDays] = useState([])
  const [showAllGameDays, setShowAllGameDays] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true)
  const [error, setError] = useState(null)
  
  // Check if admin mode is enabled via URL parameter
  const isAdminMode = useAdminMode()
  
  // Alert and confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  
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
      // Sort all game days with most recent first
      return [...gameDays].sort((a, b) => new Date(b.date) - new Date(a.date))
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

    return [...upcomingGameDays, ...pastGameDays]
  }

  const filteredGameDays = getFilteredGameDays()

  const handleCreateGameDay = () => {
    setIsCreateModalOpen(true)
  }

  const handleGameDayClick = (gameDayId) => {
    navigate(`/gameday/${gameDayId}`)
  }

  const handleDeleteGameDay = (e, gameDayId, gameDay) => {
    e.stopPropagation() // Prevent card click
    
    const hasMatches = gameDay.matchCount > 0
    const warningMessage = hasMatches
      ? `Are you sure you want to delete this game day?\n\nThis will permanently delete ${gameDay.matchCount} match(es) and all associated data.\n\nThis action cannot be undone.`
      : `Are you sure you want to delete this game day?\n\nThis action cannot be undone.`
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Game Day',
      message: warningMessage,
      onConfirm: () => confirmDeleteGameDay(gameDayId),
      confirmText: 'Delete',
      confirmColor: 'red'
    })
  }

  const confirmDeleteGameDay = async (gameDayId) => {
    try {
      await gameDayAPI.delete(gameDayId)
      await loadGameDays() // Reload game days
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Game day deleted successfully',
        type: 'success'
      })
    } catch (err) {
      console.error('Failed to delete game day:', err)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to delete game day. Please try again.',
        type: 'error'
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-green-100 text-green-800 border-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-800'
      case 'upcoming':
      default:
        return 'bg-white text-[#377850] border-gray-200'
    }
  }

  const getStatusText = (status, date) => {
    // Check status first - completed takes priority
    if (status === 'completed') {
      return 'Completed'
    }
    
    if (status === 'in-progress') {
      return 'In Progress'
    }
    
    // For upcoming, check if it's today
    if (status === 'upcoming') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const gameDate = new Date(date)
      gameDate.setHours(0, 0, 0, 0)
      
      if (gameDate.getTime() === today.getTime()) {
        return 'Today'
      }
      
      return 'Upcoming'
    }
    
    return 'Upcoming'
  }

  const shouldHighlight = (gameDay) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const gameDate = new Date(gameDay.date)
    gameDate.setHours(0, 0, 0, 0)
    
    // Highlight if it's today
    if (gameDate.getTime() === today.getTime()) {
      return true
    }
    
    // Highlight if it's the soonest upcoming game day
    const upcomingGameDays = filteredGameDays.filter(gd => {
      const d = new Date(gd.date)
      d.setHours(0, 0, 0, 0)
      return d >= today && gd.status === 'upcoming'
    })
    
    if (upcomingGameDays.length > 0) {
      const soonest = upcomingGameDays.reduce((earliest, current) => {
        return new Date(current.date) < new Date(earliest.date) ? current : earliest
      })
      return soonest.id === gameDay.id
    }
    
    return false
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4">
        <img 
          src="/logo.svg" 
          alt="MatchPlay" 
          className="h-12 w-auto"
        />
      </header>

      <main className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Game Days</h2>
          {isAdminMode && (
            <button
              onClick={handleCreateGameDay}
              className="bg-[#377850] text-white w-10 h-10 flex items-center justify-center text-2xl font-light hover:bg-[#2d5f40] transition-colors rounded leading-none"
              title="Create Game Day"
            >
              +
            </button>
          )}
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
          <div className="border border-gray-200 p-8 text-center mb-6">
            <p className="text-gray-600 mb-4">No game days scheduled yet</p>
            {isAdminMode && (
              <button
                onClick={handleCreateGameDay}
                className="bg-[#377850] text-white px-6 py-3 text-sm font-medium"
              >
                Create Your First Game Day
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {filteredGameDays.map((gameDay) => {
              const isHighlighted = shouldHighlight(gameDay)
              return (
              <div
                key={gameDay.id}
                onClick={() => handleGameDayClick(gameDay.id)}
                className={`border p-4 cursor-pointer transition-colors relative group ${
                  isHighlighted 
                    ? 'border-[#377850] border-2 bg-green-50 hover:bg-green-100' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {/* Delete button */}
                {isAdminMode && (
                  <button
                    onClick={(e) => handleDeleteGameDay(e, gameDay.id, gameDay)}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete game day"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                
                <div className="flex justify-between items-start mb-2 pr-10">
                  <div>
                    <h3 className="font-semibold text-base">{formatGameDayDate(gameDay.date)}</h3>
                    <p className="text-sm text-gray-600">{gameDay.venue}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium border ${getStatusColor(gameDay.status)}`}>
                    {getStatusText(gameDay.status, gameDay.date)}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mb-3">
                  <span>{gameDay.athleteCount} Athletes</span>
                  <span>•</span>
                  <span>{gameDay.matchCount} Matches</span>
                  <span>•</span>
                  <span>{gameDay.rounds} Rounds</span>
                </div>
                {isHighlighted && (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center text-sm font-medium text-[#377850]">
                      Go to Game Day
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            )
            })}
            
            {!showAllGameDays && gameDays.length > filteredGameDays.length && (
              <button
                onClick={() => setShowAllGameDays(true)}
                className="w-full border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                See All Game Days ({gameDays.length})
              </button>
            )}
            
            {showAllGameDays && (
              <button
                onClick={() => setShowAllGameDays(false)}
                className="w-full border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Show Less
              </button>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            {isAdminMode && (
              <button
                onClick={() => setIsAthleteModalOpen(true)}
                className="bg-[#377850] text-white w-10 h-10 flex items-center justify-center text-2xl font-light hover:bg-[#2d5f40] transition-colors rounded leading-none"
                title="Add Athlete"
              >
                +
              </button>
            )}
          </div>
          
          {isLoadingLeaderboard ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No leaderboard data yet. Complete some matches to see rankings!</p>
            </div>
          ) : (
            <div className="border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
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

      <Modal
        isOpen={isAthleteModalOpen}
        onClose={() => setIsAthleteModalOpen(false)}
        title="Add Athlete"
      >
        <CreateAthleteForm 
          onClose={() => setIsAthleteModalOpen(false)}
          onSuccess={loadLeaderboard}
        />
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || 'Confirm'}
        confirmColor={confirmModal.confirmColor || 'black'}
      />
    </div>
  )
}

function CreateGameDayForm({ onClose, onSuccess }) {
  const navigate = useNavigateWithAdmin()
  const [formData, setFormData] = useState({
    date: '',
    venue: 'Evolve North Narrabeen',
    format: 'group', // 'group' or 'teams'
    pointsToWin: 11,
    winByMargin: 2,
    rounds: 3,
    movementRule: 'auto', // auto, 1, or 2
    numberOfTeams: 2 // 2 or 4
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
          className="w-full border border-gray-200 px-3 py-2 text-sm"
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
          className="w-full border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="font-semibold mb-3">Game Format</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Format
          </label>
          <select
            name="format"
            value={formData.format}
            onChange={handleChange}
            className="w-full border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="group">Group (Courts)</option>
            <option value="teams">Teams</option>
          </select>
        </div>

        {formData.format === 'teams' && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Number of Teams
            </label>
            <select
              name="numberOfTeams"
              value={formData.numberOfTeams}
              onChange={handleChange}
              className="w-full border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="2">2 Teams (Blue vs Red)</option>
              <option value="4">4 Teams (Blue vs Red vs Green vs Yellow)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Min 4 players per team, max 5 players per team
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
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
              className="w-full border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="7">7</option>
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
              className="w-full border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>
      </div>

      {formData.format === 'group' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">
              Number of Rounds
            </label>
            <select
              name="rounds"
              value={formData.rounds}
              onChange={handleChange}
              className="w-full border border-gray-200 px-3 py-2 text-sm"
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
              className="w-full border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="auto">Auto (2 if any 5-player group, else 1)</option>
              <option value="1">1 up, 1 down</option>
              <option value="2">2 up, 2 down</option>
            </select>
          </div>
        </>
      )}

      {formData.format === 'teams' && (
        <div className="bg-blue-50 border border-blue-200 p-3 text-sm">
          <p className="text-blue-800">
            Teams mode: Athletes will be split into balanced teams. Each person partners with their teammates against other teams.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  )
}

function CreateAthleteForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Athlete name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      const newAthlete = await athleteAPI.create({
        name: formData.name.trim(),
        email: formData.email.trim()
      })
      
      console.log('Created athlete:', newAthlete)
      
      // Notify parent to refresh list
      if (onSuccess) {
        await onSuccess()
      }
      
      // Close modal
      onClose()
    } catch (err) {
      console.error('Failed to create athlete:', err)
      setError('Failed to create athlete. Please try again.')
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
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., John Smith"
          className="w-full border border-gray-200 px-3 py-2 text-sm"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Email <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g., john@example.com"
          className="w-full border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-gray-200 pt-4 text-xs text-gray-600">
        <p>The athlete will be automatically assigned the next available rank.</p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400 hover:bg-[#2d5f40]"
        >
          {isSubmitting ? 'Adding...' : 'Add Athlete'}
        </button>
      </div>
    </form>
  )
}

