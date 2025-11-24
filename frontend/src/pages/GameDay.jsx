import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import AthletesTab from '../components/gameday/AthletesTab'
import MatchesTab from '../components/gameday/MatchesTab'
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
  
  const tabs = [
    {
      label: `Athletes (${gameDay.athleteCount || 0})`,
      content: <AthletesTab gameDayId={id} gameDay={gameDay} onUpdate={loadGameDay} isAdminMode={isAdminMode} />,
      disabled: false
    },
    {
      label: 'Matches',
      content: <MatchesTab gameDayId={id} gameDay={gameDay} isAdminMode={isAdminMode} />,
      disabled: !hasMatches
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4">
        <img 
          src="/logo.svg" 
          alt="MatchPlay" 
          className="h-12 w-auto"
        />
        <div className="text-sm text-gray-600 mt-2">
          {formatGameDayDate(gameDay.date)} • {gameDay.venue}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => navigate('/')}
            className="border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ← Back to Dashboard
          </button>
          {isAdminMode && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="border border-red-500 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Delete Game Day
            </button>
          )}
        </div>
      </header>
      <main className="p-4">
        <Tabs tabs={tabs} />
      </main>

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

