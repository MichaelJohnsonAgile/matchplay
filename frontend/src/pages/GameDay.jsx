import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import AthletesTab from '../components/gameday/AthletesTab'
import MatchesTab from '../components/gameday/MatchesTab'
import { TeamsTab } from '../components/gameday/TeamsTab'
import { TeamLeaderboard } from '../components/gameday/TeamLeaderboard'
import { gameDayAPI } from '../services/api'
import { formatGameDayDate } from '../utils/dateFormat'
import { useAdminMode, useNavigateWithAdmin } from '../hooks/useAdminMode'

export default function GameDay() {
  const { id } = useParams()
  const navigate = useNavigateWithAdmin()
  const [gameDay, setGameDay] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    date: '',
    venue: '',
    pointsToWin: 11,
    winByMargin: 2,
    rounds: 3,
    movementRule: 'auto'
  })
  
  // Check if admin mode is enabled via URL parameter
  const isAdminMode = useAdminMode()
  
  useEffect(() => {
    loadGameDay()
  }, [id])

  const loadGameDay = async () => {
    try {
      setIsLoading(true)
      const data = await gameDayAPI.getById(id)
      setGameDay(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load game day:', err)
      setError('Failed to load game day')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGameDay = async () => {
    try {
      setIsDeleting(true)
      await gameDayAPI.delete(id)
      // Navigate back to dashboard
      navigate('/')
    } catch (err) {
      console.error('Failed to delete game day:', err)
      setError('Failed to delete game day. Please try again.')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }
  
  const handleEditGameDay = () => {
    // Pre-populate form with current values
    setEditFormData({
      date: gameDay.date,
      venue: gameDay.venue,
      pointsToWin: gameDay.settings.pointsToWin,
      winByMargin: gameDay.settings.winByMargin,
      rounds: gameDay.settings.numberOfRounds,
      movementRule: gameDay.settings.movementRule || 'auto'
    })
    setError(null) // Clear any previous errors
    setShowEditModal(true)
  }
  
  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)
      await gameDayAPI.update(id, {
        date: editFormData.date,
        venue: editFormData.venue,
        pointsToWin: parseInt(editFormData.pointsToWin),
        winByMargin: parseInt(editFormData.winByMargin),
        numberOfRounds: parseInt(editFormData.rounds),
        movementRule: editFormData.movementRule
      })
      await loadGameDay() // Reload to show updated data
      setShowEditModal(false)
    } catch (err) {
      console.error('Failed to update game day:', err)
      setError('Failed to update game day. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 w-64"></div>
        </div>
      </div>
    )
  }

  if (error || !gameDay) {
    return (
      <div className="min-h-screen bg-white p-4">
        <button
          onClick={() => navigate('/')}
          className="text-sm mb-4 hover:underline"
        >
          ← Back to Dashboard
        </button>
        <div className="border border-red-500 bg-red-50 p-4 text-red-800">
          {error || 'Game day not found'}
        </div>
      </div>
    )
  }

  const hasMatches = gameDay.matchCount > 0
  const isTeamsMode = gameDay.settings.format === 'teams'
  
  // Build tabs dynamically based on game mode
  const tabs = [
    {
      label: `Athletes (${gameDay.athleteCount || 0})`,
      content: <AthletesTab gameDayId={id} gameDay={gameDay} onUpdate={loadGameDay} isAdminMode={isAdminMode} />,
      disabled: false
    }
  ]
  
  // Add Teams tab for teams mode
  if (isTeamsMode) {
    tabs.push({
      label: 'Teams',
      content: <TeamsTab gameDayId={id} settings={gameDay.settings} />,
      disabled: false
    })
  }
  
  // Add Matches tab
  tabs.push({
    label: 'Matches',
    content: <MatchesTab gameDayId={id} gameDay={gameDay} isAdminMode={isAdminMode} />,
    disabled: !hasMatches
  })
  
  // Add Leaderboard tab (different content for teams vs groups)
  if (isTeamsMode) {
    tabs.push({
      label: 'Leaderboard',
      content: <TeamLeaderboard gameDayId={id} />,
      disabled: !hasMatches
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4">
        <img 
          src="/logo.svg" 
          alt="MatchPlay" 
          className="h-12 w-auto"
        />
        <div className="flex items-center gap-2 mt-2">
          <div className="text-sm text-gray-600">
            {formatGameDayDate(gameDay.date)} • {gameDay.venue}
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
            isTeamsMode 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {isTeamsMode ? 'Teams' : 'Groups'}
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => navigate('/')}
            className="border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ← Back to Dashboard
          </button>
          {isAdminMode && (
            <>
              <button
                onClick={handleEditGameDay}
                className="border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="border border-red-500 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </header>
      <main className="p-4">
        <Tabs tabs={tabs} />
      </main>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Game Day"
      >
        <div className="space-y-4">
          {error && (
            <div className="border border-red-500 bg-red-50 p-3 text-red-800 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={editFormData.date}
              onChange={handleEditChange}
              className="w-full border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Venue</label>
            <input
              type="text"
              name="venue"
              value={editFormData.venue}
              onChange={handleEditChange}
              placeholder="Venue name"
              className="w-full border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Game Settings</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Points to Win</label>
                <input
                  type="number"
                  name="pointsToWin"
                  min="1"
                  value={editFormData.pointsToWin}
                  onChange={handleEditChange}
                  className="w-full border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Win by Margin</label>
                <input
                  type="number"
                  name="winByMargin"
                  min="1"
                  value={editFormData.winByMargin}
                  onChange={handleEditChange}
                  className="w-full border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Number of Rounds</label>
              <input
                type="number"
                name="rounds"
                min="1"
                max="5"
                value={editFormData.rounds}
                onChange={handleEditChange}
                className="w-full border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Movement Rule</label>
              <select
                name="movementRule"
                value={editFormData.movementRule}
                onChange={handleEditChange}
                className="w-full border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="auto">Auto (1 up/down per group)</option>
                <option value="1up1down">1 Up, 1 Down</option>
                <option value="2up2down">2 Up, 2 Down</option>
                <option value="none">No Movement</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={isSaving}
              className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium hover:bg-[#2d5f40] disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Game Day"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this game day?
          </p>
          <div className="bg-gray-50 border border-gray-200 p-3 text-sm">
            <div className="font-medium">{formatGameDayDate(gameDay.date)}</div>
            <div className="text-gray-600">{gameDay.venue}</div>
            {hasMatches && (
              <div className="text-orange-600 font-medium mt-2">
                ⚠️ {gameDay.matchCount} matches will be deleted
              </div>
            )}
          </div>
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ WARNING: This action cannot be undone.
            </p>
            {hasMatches && (
              <p className="text-sm text-red-700 mt-1">
                All matches, scores, and athlete registrations will be permanently deleted.
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteGameDay}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:bg-gray-400"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

