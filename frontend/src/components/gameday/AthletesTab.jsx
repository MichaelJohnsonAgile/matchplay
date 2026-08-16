import { useState, useEffect } from 'react'
import Modal from '../Modal'
import CreateAthleteForm from '../CreateAthleteForm'
import { AlertModal, ConfirmModal } from '../Alert'
import { athleteAPI, gameDayAPI, matchAPI } from '../../services/api'

export default function AthletesTab({ gameDayId, gameDay, onUpdate, isAdminMode = false }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreateAthleteModalOpen, setIsCreateAthleteModalOpen] = useState(false)
  const [selectedAthletes, setSelectedAthletes] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [allAthletes, setAllAthletes] = useState([])
  const [gameDayAthletes, setGameDayAthletes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [matches, setMatches] = useState([])
  const [addModalSearch, setAddModalSearch] = useState('')
  const [divideStatus, setDivideStatus] = useState(null)
  const [swapMode, setSwapMode] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [swapping, setSwapping] = useState(false)
  
  const isDivideMode = gameDay?.settings?.format === 'divide'
  const athleteCountValidForDivide = gameDayAthletes.length >= 4 && gameDayAthletes.length % 4 === 0
  // Alert and confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [deleteAthleteId, setDeleteAthleteId] = useState(null)
  
  useEffect(() => {
    loadData()
  }, [gameDayId, gameDay?.settings?.divideCurrentRound])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [all, gameDayAthletesData, matchesData] = await Promise.all([
        athleteAPI.getAll(),
        athleteAPI.getForGameDay(gameDayId),
        matchAPI.getForGameDay(gameDayId)
      ])
      setAllAthletes(all)
      setGameDayAthletes(gameDayAthletesData)
      setMatches(matchesData)

      if (gameDay?.settings?.format === 'divide') {
        try {
          const status = await gameDayAPI.getDivideStatus(gameDayId)
          setDivideStatus(status)
        } catch {
          setDivideStatus(null)
        }
      } else {
        setDivideStatus(null)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleAddAthletes = async () => {
    try {
      await athleteAPI.addToGameDay(gameDayId, selectedAthletes)
      setSelectedAthletes([])
      setIsAddModalOpen(false)
      setAddModalSearch('')
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
  
  const handleAthleteCreated = async (newAthlete) => {
    const all = await athleteAPI.getAll()
    setAllAthletes(all)
    if (newAthlete?.id) {
      setSelectedAthletes((prev) =>
        prev.includes(newAthlete.id) ? prev : [...prev, newAthlete.id]
      )
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

  const handlePreviewRound1 = async () => {
    if (!athleteCountValidForDivide) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Preview Round 1',
        message: `Need a player count divisible by 4 (currently ${gameDayAthletes.length}). Add or remove athletes.`,
        type: 'warning',
      })
      return
    }

    setIsGenerating(true)
    try {
      await gameDayAPI.previewDivideRound1(gameDayId)
      await loadData()
      if (onUpdate) onUpdate()
      setAlertModal({
        isOpen: true,
        title: 'Round 1 Preview Ready',
        message: 'Adjust partners with swap mode, then click Start Round 1 when ready.',
        type: 'success',
      })
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to preview Round 1.',
        type: 'error',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartDivideRound = async (roundNumber) => {
    if (!athleteCountValidForDivide) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Start Round',
        message: `Need a player count divisible by 4 (currently ${gameDayAthletes.length}). Add or remove athletes.`,
        type: 'warning'
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await gameDayAPI.startDivideRound(gameDayId, roundNumber)
      await loadData()
      if (onUpdate) onUpdate()
      setAlertModal({
        isOpen: true,
        title: roundNumber === 1 ? 'Round 1 Started' : `Round ${roundNumber} Started`,
        message:
          roundNumber === 1
            ? 'Game 1 is live — switch to Matches to score.'
            : `Game 1 is ready on ${response.matchesGenerated} court(s). Switch to Matches to score.`,
        type: 'success',
      })
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to start round.',
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
  const hasMatchesWithScores = matches.length > 0 && 
    matches.some(m => m.teamA?.score !== null && m.teamB?.score !== null)

  const dividePreviewActive = isDivideMode && divideStatus?.round1Preview
  const divideRoundStarted = isDivideMode && (gameDay?.settings?.divideCurrentRound ?? 0) > 0

  const divideSessionStarted = isDivideMode && (
    divideRoundStarted || matches.length > 0
  )

  const canSwapRound1Partners = isDivideMode && divideStatus?.canSwapRound1Partners

  const round1PairGroups = (() => {
    if (!isDivideMode || (!dividePreviewActive && !canSwapRound1Partners)) return []

    return matches
      .filter((m) => m.round === 1 && m.group === 1)
      .sort((a, b) => (a.court || 0) - (b.court || 0))
      .map((match) => ({
        matchId: match.id,
        court: match.court,
        pairs: [
          {
            pairKey: `${match.id}:A`,
            label: 'Pair A',
            players: match.teamA.players.map((id) => ({
              id,
              name: gameDayAthletes.find((a) => a.id === id)?.name || 'Unknown',
              rank: gameDayAthletes.find((a) => a.id === id)?.rank,
            })),
          },
          {
            pairKey: `${match.id}:B`,
            label: 'Pair B',
            players: match.teamB.players.map((id) => ({
              id,
              name: gameDayAthletes.find((a) => a.id === id)?.name || 'Unknown',
              rank: gameDayAthletes.find((a) => a.id === id)?.rank,
            })),
          },
        ],
      }))
  })()

  function handleToggleSwapMode() {
    setSwapMode(!swapMode)
    setSelectedPlayer(null)
  }

  function handlePairPlayerClick(player, pairKey) {
    if (!swapMode || !isAdminMode || !canSwapRound1Partners) return

    if (!selectedPlayer) {
      setSelectedPlayer({
        playerId: player.id,
        playerName: player.name,
        pairKey,
      })
      return
    }

    if (selectedPlayer.playerId === player.id) {
      setSelectedPlayer(null)
      return
    }

    if (selectedPlayer.pairKey === pairKey) {
      setSelectedPlayer({
        playerId: player.id,
        playerName: player.name,
        pairKey,
      })
      return
    }

    confirmSwapPartners(selectedPlayer.playerId, player.id)
  }

  async function confirmSwapPartners(player1Id, player2Id) {
    setSwapping(true)
    try {
      await gameDayAPI.swapDividePartners(gameDayId, player1Id, player2Id)
      await loadData()
      if (onUpdate) onUpdate()
      setSelectedPlayer(null)
      setAlertModal({
        isOpen: true,
        title: 'Partners Updated',
        message: 'Round 1 partners have been swapped.',
        type: 'success',
      })
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to swap partners.',
        type: 'error',
      })
    } finally {
      setSwapping(false)
    }
  }

  const renderDivideAdminButtons = () => {
    if (!divideStatus) return null

    if (divideStatus.canPreviewRound1) {
      return (
        <button
          className="bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handlePreviewRound1}
          disabled={isGenerating || !athleteCountValidForDivide || swapMode}
          title={!athleteCountValidForDivide ? 'Need player count divisible by 4' : ''}
        >
          {isGenerating ? 'Previewing...' : 'Preview Round 1'}
        </button>
      )
    }

    if (divideStatus.canStartRound1) {
      return (
        <button
          className="bg-[#377850] text-white px-4 py-2 text-sm font-medium hover:bg-[#2a5f3c] disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={() => handleStartDivideRound(1)}
          disabled={isGenerating || swapMode}
        >
          {isGenerating ? 'Starting...' : 'Start Round 1'}
        </button>
      )
    }

    if (divideStatus.canStartRound2) {
      return (
        <button
          className="bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:bg-gray-400"
          onClick={() => handleStartDivideRound(2)}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Round 2'}
        </button>
      )
    }

    if (divideStatus.canStartRound3) {
      return (
        <button
          className="bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:bg-gray-400"
          onClick={() => handleStartDivideRound(3)}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Round 3'}
        </button>
      )
    }

    return null
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Athletes</h2>
        <div className="flex gap-2">
          {isAdminMode && (
            <>
              {isDivideMode ? (
                <>
                  {renderDivideAdminButtons()}
                  {canSwapRound1Partners && (
                    <button
                      onClick={handleToggleSwapMode}
                      disabled={swapping}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        swapMode
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'border border-amber-500 text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      {swapMode ? 'Exit Swap Mode' : 'Swap Partners'}
                    </button>
                  )}
                  {matches.length > 0 && (
                    <button 
                      className="bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      onClick={handleCancelDraw}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Cancelling...' : 'Cancel Session'}
                    </button>
                  )}
                </>
              ) : hasMatchesWithScores ? (
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
          {isAdminMode && !divideSessionStarted && (
            <button 
              className="bg-[#377850] text-white w-10 h-10 flex items-center justify-center text-2xl font-light hover:bg-[#2a5f3c] transition-colors rounded leading-none disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() => setIsAddModalOpen(true)}
              title={divideSessionStarted ? 'Cannot add athletes after Round 1 has started' : 'Add athletes to game day'}
              disabled={divideSessionStarted}
            >
              +
            </button>
          )}
        </div>
      </div>

      {dividePreviewActive && (
        <p className="text-sm text-gray-600">
          Round 1 preview — swap partners if needed, then click <strong>Start Round 1</strong> to begin scoring.
        </p>
      )}

      {canSwapRound1Partners && divideRoundStarted && (
        <p className="text-sm text-gray-600">
          Round 1 Game 1 is live. Use swap mode to adjust partners before any scores are entered.
        </p>
      )}

      {swapMode && canSwapRound1Partners && (
        <div className="border-2 border-amber-400 bg-amber-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-amber-800">Swap Mode Active</p>
              <p className="text-sm text-amber-700">
                {selectedPlayer
                  ? `${selectedPlayer.playerName} selected. Click a player in a different pair to swap them.`
                  : 'Click a player to select them, then click a player in a different pair to swap.'}
              </p>
            </div>
            {selectedPlayer && (
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-amber-600 hover:text-amber-800 text-sm underline"
              >
                Cancel selection
              </button>
            )}
          </div>
          {swapping && (
            <div className="mt-2 text-sm text-amber-700">Swapping partners...</div>
          )}
        </div>
      )}

      {round1PairGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {dividePreviewActive ? 'Round 1 Preview' : 'Round 1 Partners'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {round1PairGroups.map((group) => (
              <div key={group.matchId} className="border-2 border-orange-200 rounded-lg overflow-hidden">
                <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center">
                  <span className="font-semibold">Court {group.court}</span>
                  <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                    {dividePreviewActive ? 'Preview' : 'Game 1'}
                  </span>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {group.pairs.map((pair) => (
                    <div key={pair.pairKey}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {pair.label}
                      </p>
                      <div className="space-y-2">
                        {pair.players.map((player) => {
                          const isSelected = selectedPlayer?.playerId === player.id
                          const isSwappable =
                            swapMode && selectedPlayer && selectedPlayer.pairKey !== pair.pairKey
                          const isClickable = swapMode && isAdminMode && canSwapRound1Partners

                          return (
                            <div
                              key={player.id}
                              onClick={() => isClickable && handlePairPlayerClick(player, pair.pairKey)}
                              className={`flex justify-between items-center p-3 rounded border-2 transition-all ${
                                isSelected
                                  ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                                  : isSwappable
                                    ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400 cursor-pointer'
                                    : isClickable
                                      ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer'
                                      : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div>
                                <div className="font-medium">{player.name}</div>
                                {player.rank != null && (
                                  <div className="text-sm text-gray-500">Season rank {player.rank}</div>
                                )}
                              </div>
                              {isSwappable && (
                                <span className="text-xs text-green-600 font-medium">Click to swap</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-2 text-center font-semibold">Season Rank</th>
                  <th className="p-2 text-center font-semibold">Pos</th>
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
                      <div className="skeleton h-4 w-8 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="skeleton h-4 w-8 mx-auto"></div>
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
                      <div className="skeleton h-4 w-12 mx-auto"></div>
                    </td>
                    <td className="p-2 text-center"></td>
                  </tr>
                ))
              ) : gameDayAthletes.length === 0 ? (
                <tr>
                  <td colSpan={isAdminMode ? 9 : 8} className="p-8 text-center text-gray-500">
                    No players added yet.
                  </td>
                </tr>
              ) : (
                // Sort athletes by: 1) Wins DESC, 2) Point differential DESC, 3) Season rank ASC
                [...gameDayAthletes].sort((a, b) => {
                  const winsA = a.stats?.wins || 0
                  const winsB = b.stats?.wins || 0
                  const diffA = (a.stats?.pointsFor || 0) - (a.stats?.pointsAgainst || 0)
                  const diffB = (b.stats?.pointsFor || 0) - (b.stats?.pointsAgainst || 0)
                  
                  // 1. Sort by wins first
                  if (winsB !== winsA) return winsB - winsA
                  // 2. Then by point differential
                  if (diffB !== diffA) return diffB - diffA
                  // 3. Finally by season rank (lower rank number = better)
                  return a.rank - b.rank
                }).map((athlete, index) => (
                  <tr key={athlete.id} className="border-b border-gray-200">
                    <td className="p-2 text-center">{athlete.rank}</td>
                    <td className="p-2 text-center font-semibold">{index + 1}</td>
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
                            disabled={hasMatchesWithScores || divideSessionStarted}
                            title={
                              divideSessionStarted
                                ? 'Cannot remove athletes after Round 1 has started'
                                : hasMatchesWithScores
                                  ? 'Cannot remove athletes after scores are entered'
                                  : 'Remove athlete'
                            }
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
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setAddModalSearch(''); }}>
        <h3 className="text-xl font-semibold mb-4">Join This Game Day</h3>
        
        {/* Search bar */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Search athletes..."
            value={addModalSearch}
            onChange={(e) => setAddModalSearch(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#377850] focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setIsCreateAthleteModalOpen(true)}
            className="flex-shrink-0 border border-[#377850] text-[#377850] px-3 py-2 text-sm font-medium hover:bg-green-50 rounded whitespace-nowrap"
          >
            Add Athlete
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
          {allAthletes
            .filter(athlete => !gameDayAthletes.some(gda => gda.id === athlete.id))
            .filter(athlete => athlete.name.toLowerCase().includes(addModalSearch.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
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
          {allAthletes.filter(athlete => !gameDayAthletes.some(gda => gda.id === athlete.id)).length > 0 &&
           allAthletes.filter(athlete => !gameDayAthletes.some(gda => gda.id === athlete.id))
             .filter(athlete => athlete.name.toLowerCase().includes(addModalSearch.toLowerCase())).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No athletes match your search.
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={() => { setIsAddModalOpen(false); setAddModalSearch(''); }}
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

      <Modal
        isOpen={isCreateAthleteModalOpen}
        onClose={() => setIsCreateAthleteModalOpen(false)}
        title="Add Athlete"
      >
        <CreateAthleteForm
          onClose={() => setIsCreateAthleteModalOpen(false)}
          onSuccess={handleAthleteCreated}
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

