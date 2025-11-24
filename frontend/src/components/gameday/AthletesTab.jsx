import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { AlertModal, ConfirmModal } from '../Alert'
import { athleteAPI, gameDayAPI } from '../../services/api'

export default function AthletesTab({ gameDayId, gameDay, onUpdate, isAdminMode = false }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAthletes, setSelectedAthletes] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [allAthletes, setAllAthletes] = useState([])
  const [gameDayAthletes, setGameDayAthletes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Alert and confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [deleteAthleteId, setDeleteAthleteId] = useState(null)
  
  useEffect(() => {
    loadData()
  }, [gameDayId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [all, gameDay] = await Promise.all([
        athleteAPI.getAll(),
        athleteAPI.getForGameDay(gameDayId)
      ])
      setAllAthletes(all)
      setGameDayAthletes(gameDay)
    } catch (err) {
      console.error('Failed to load athletes:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleAddAthletes = async () => {
    try {
      await athleteAPI.addToGameDay(gameDayId, selectedAthletes)
      setSelectedAthletes([])
      setIsAddModalOpen(false)
      loadData()
      if (onUpdate) onUpdate()
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: `Successfully joined the game day! ${selectedAthletes.length > 1 ? `${selectedAthletes.length} players added.` : ''}`,
        type: 'success'
      })
    } catch (err) {
      console.error('Failed to add athletes:', err)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to add athletes. Please try again.',
        type: 'error'
      })
    }
  }
  
  const handleToggleAthlete = (athleteId) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    )
  }
  
  const handleEditAthlete = (athleteId) => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit athlete:', athleteId)
    alert(`Edit Athlete ${athleteId}`)
  }
  
  const handleDeleteAthlete = async (athleteId) => {
    setDeleteAthleteId(athleteId)
    setConfirmModal({
      isOpen: true,
      title: 'Remove Athlete',
      message: 'Remove this athlete from this game day?',
      onConfirm: () => confirmDeleteAthlete(athleteId)
    })
  }
  
  const confirmDeleteAthlete = async (athleteId) => {
    try {
      await athleteAPI.removeFromGameDay(gameDayId, athleteId)
      loadData()
      if (onUpdate) onUpdate()
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Athlete removed from game day',
        type: 'success'
      })
    } catch (err) {
      console.error('Failed to remove athlete:', err)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to remove athlete. Please try again.',
        type: 'error'
      })
    }
  }
  
  const handleGenerateDraw = async () => {
    if (gameDayAthletes.length < 8) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Generate Draw',
        message: 'At least 8 athletes required to generate draw',
        type: 'warning'
      })
      return
    }
    
    // Check if draw already exists
    if (gameDay?.matches && gameDay.matches.length > 0) {
      setAlertModal({
        isOpen: true,
        title: 'Draw Already Generated',
        message: 'Draw has already been generated for this game day',
        type: 'warning'
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await gameDayAPI.generateDraw(gameDayId)
      console.log('Generate draw response:', response)
      if (onUpdate) onUpdate()
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Match draw generated successfully! Switch to Matches tab to view.',
        type: 'success'
      })
    } catch (error) {
      console.error('Generate draw error:', error)
      
      // Try to extract error message from response
      let errorMessage = 'Error generating draw. Please try again.'
      
      if (error.message) {
        if (error.message.includes('Database connection failed')) {
          errorMessage = 'Database connection error. The service may be starting up. Please wait a moment and try again.'
        } else if (error.message.includes('Database not initialized')) {
          errorMessage = 'Database not initialized. Please contact the administrator.'
        } else if (error.message.includes('503')) {
          errorMessage = 'Service temporarily unavailable. The backend may be waking up. Please try again in a few seconds.'
        } else {
          errorMessage = error.message
        }
      }
      
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error'
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleCancelDraw = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Draw',
      message: 'WARNING: This will DELETE ALL MATCHES for this game day!\n\nAll match results and scores will be permanently lost.\n\nYou will be able to add/remove athletes and generate a new draw.\n\nAre you sure you want to cancel the draw?',
      onConfirm: confirmCancelDraw,
      confirmText: 'Yes, Delete All Matches',
      confirmColor: 'red'
    })
  }
  
  const confirmCancelDraw = async () => {
    try {
      setIsGenerating(true)
      await gameDayAPI.cancelDraw(gameDayId)
      if (onUpdate) onUpdate()
      // Reload data to reflect changes
      await loadData()
      setAlertModal({
        isOpen: true,
        title: 'Draw Cancelled',
        message: 'Draw cancelled. You can now modify athletes and generate a new draw.',
        type: 'success'
      })
    } catch (error) {
      console.error(error)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error cancelling draw. Please try again.',
        type: 'error'
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Check if draw has been generated AND any scores have been entered
  const hasMatchesWithScores = gameDay?.matches && gameDay.matches.length > 0 && 
    gameDay.matches.some(m => m.teamA?.score !== null && m.teamB?.score !== null)
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Athletes</h2>
        <div className="flex gap-2">
          {isAdminMode && (
            <>
              {hasMatchesWithScores ? (
                <button 
                  className="bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleCancelDraw}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Cancelling...' : 'Cancel Draw'}
                </button>
              ) : (
                <button 
                  className="bg-[#377850] text-white px-4 py-2 text-sm font-medium hover:bg-[#2a5f3c] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleGenerateDraw}
                  disabled={isGenerating || gameDayAthletes.length < 8}
                  title={gameDayAthletes.length < 8 ? 'Need at least 8 athletes to generate draw' : ''}
                >
                  {isGenerating ? 'Generating...' : 'Generate Draw'}
                </button>
              )}
            </>
          )}
          <button 
            className="bg-[#377850] text-white px-4 py-2 text-sm font-medium hover:bg-[#2a5f3c] disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => setIsAddModalOpen(true)}
            disabled={hasMatchesWithScores}
            title={hasMatchesWithScores ? 'Scores entered - cannot add athletes' : 'Add yourself to this game day'}
          >
            {hasMatchesWithScores ? 'Draw Locked' : 'Join Game Day'}
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-2 text-left font-semibold">Rank</th>
                  <th className="p-2 text-left font-semibold">Athlete</th>
                  <th className="p-2 text-center font-semibold">P</th>
                  <th className="p-2 text-center font-semibold">W</th>
                  <th className="p-2 text-center font-semibold">L</th>
                  <th className="p-2 text-center font-semibold">+</th>
                  <th className="p-2 text-center font-semibold">-</th>
                  <th className="p-2 text-center font-semibold">+/-</th>
                  {isAdminMode && <th className="p-2 text-center font-semibold">Actions</th>}
                </tr>
              </thead>
            <tbody>
              {isLoading ? (
                // Skeleton rows
                [1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <tr key={num} className="border-b border-gray-200">
                    <td className="p-2">
                      <div className="skeleton h-4 w-8"></div>
                    </td>
                    <td className="p-2">
                      <div className="skeleton h-4 w-32"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-8 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-8 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-8 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-8 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-8 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-12 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center"></td>
                  </tr>
                ))
              ) : gameDayAthletes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-gray-500">
                    No players signed up yet. Click "Join Game Day" to add yourself!
                  </td>
                </tr>
              ) : (
                // Sort athletes by rank before displaying
                [...gameDayAthletes].sort((a, b) => a.rank - b.rank).map((athlete, index) => (
                  <tr key={athlete.id} className="border-b border-gray-200">
                    <td className="p-2">{athlete.rank}</td>
                    <td className="p-2">{athlete.name}</td>
                    <td className="p-2 text-center">{athlete.stats.matchesPlayed}</td>
                    <td className="p-2 text-center">{athlete.stats.wins}</td>
                    <td className="p-2 text-center">{athlete.stats.losses}</td>
                    <td className="p-2 text-center">{athlete.stats.pointsFor}</td>
                    <td className="p-2 text-center">{athlete.stats.pointsAgainst}</td>
                    <td className="p-2 text-center">
                      {athlete.stats.pointsDiff > 0 ? '+' : ''}{athlete.stats.pointsDiff}
                    </td>
                    {isAdminMode && (
                      <td className="p-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => handleEditAthlete(athlete.id)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="Edit athlete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteAthlete(athlete.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            disabled={hasMatchesWithScores}
                            title={hasMatchesWithScores ? 'Cannot remove athletes after scores are entered' : 'Remove athlete'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Athletes Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <h3 className="text-xl font-semibold mb-4">Join This Game Day</h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
          {allAthletes
            .filter(athlete => !gameDayAthletes.some(gda => gda.id === athlete.id))
            .map((athlete) => (
            <label 
              key={athlete.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedAthletes.includes(athlete.id)}
                onChange={() => handleToggleAthlete(athlete.id)}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="flex-1">{athlete.name}</span>
              <span className="text-sm text-gray-500">Rank {athlete.rank}</span>
            </label>
          ))}
          {allAthletes.filter(athlete => !gameDayAthletes.some(gda => gda.id === athlete.id)).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Everyone is already signed up for this game day!
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={() => setIsAddModalOpen(false)}
            className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddAthletes}
            className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
            disabled={selectedAthletes.length === 0}
          >
            {selectedAthletes.length > 0 ? `Join (${selectedAthletes.length})` : 'Join'}
          </button>
        </div>
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

