import { useState, useEffect } from 'react'
import { teamsAPI, gameDayAPI, matchAPI } from '../../services/api'
import { ConfirmModal } from '../Alert'

const TEAM_COLORS = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    progressBar: 'bg-blue-500'
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800 border-red-200',
    progressBar: 'bg-red-500'
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-800 border-green-200',
    progressBar: 'bg-green-500'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    progressBar: 'bg-yellow-500'
  }
}

export function TeamsTab({ gameDayId, settings, onUpdate, isAdminMode = false }) {
  const [teams, setTeams] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatingDraw, setGeneratingDraw] = useState(false)
  const [clearingDraw, setClearingDraw] = useState(false)
  const [hasMatches, setHasMatches] = useState(false)
  const [hasScores, setHasScores] = useState(false) // Whether any matches have scores entered
  const [swapMode, setSwapMode] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null) // { playerId, playerName, teamId, teamName }
  const [swapping, setSwapping] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  
  // Pairs mode specific state
  const [showCreatePairModal, setShowCreatePairModal] = useState(false)
  const [availableAthletes, setAvailableAthletes] = useState([])
  const [selectedAthletes, setSelectedAthletes] = useState([]) // Array of 2 athlete IDs
  const [creatingPair, setCreatingPair] = useState(false)
  const [deletingPair, setDeletingPair] = useState(null)
  const [autoAllocating, setAutoAllocating] = useState(false)
  
  // Finals state (pairs mode)
  const [allRoundRobinComplete, setAllRoundRobinComplete] = useState(false)
  const [hasSemiFinals, setHasSemiFinals] = useState(false)
  const [allSemiFinalsComplete, setAllSemiFinalsComplete] = useState(false)
  const [hasFinals, setHasFinals] = useState(false)
  const [generatingSemiFinals, setGeneratingSemiFinals] = useState(false)
  const [generatingFinals, setGeneratingFinals] = useState(false)
  
  const isPairsMode = settings?.format === 'pairs'
  
  useEffect(() => {
    loadData()
  }, [gameDayId])
  
  async function loadData() {
    try {
      setLoading(true)
      const [teamsData, matchesData] = await Promise.all([
        teamsAPI.getForGameDay(gameDayId),
        matchAPI.getForGameDay(gameDayId)
      ])
      
      setTeams(teamsData)
      setHasMatches(matchesData.length > 0)
      setHasScores(matchesData.some(m => m.teamA?.score !== null || m.teamB?.score !== null))
      
      // Load standings if matches exist (use pairs endpoint for pairs mode)
      if (matchesData.length > 0) {
        const standingsData = isPairsMode 
          ? await teamsAPI.getPairStandings(gameDayId)
          : await teamsAPI.getStandings(gameDayId)
        setStandings(standingsData)
      }
      
      // Load available athletes for pairs mode
      if (isPairsMode) {
        const available = await teamsAPI.getAvailableAthletes(gameDayId)
        setAvailableAthletes(available)
        
        // Calculate finals status
        const roundRobinMatches = matchesData.filter(m => m.round > 0)
        const semiFinalMatches = matchesData.filter(m => m.round === -1)
        const finalMatches = matchesData.filter(m => m.round === -2)
        
        const allRRComplete = roundRobinMatches.length > 0 && 
          roundRobinMatches.every(m => m.winner !== null)
        setAllRoundRobinComplete(allRRComplete)
        
        setHasSemiFinals(semiFinalMatches.length > 0)
        const allSFComplete = semiFinalMatches.length > 0 && 
          semiFinalMatches.every(m => m.winner !== null)
        setAllSemiFinalsComplete(allSFComplete)
        
        setHasFinals(finalMatches.length > 0)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(isPairsMode ? 'Failed to load pairs' : 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }
  
  async function handleGenerateTeams() {
    setGenerating(true)
    setError(null)
    
    try {
      const data = await teamsAPI.generate(gameDayId)
      setTeams(data.teams)
      setHasMatches(false)
      setStandings([])
    } catch (err) {
      console.error('Error generating teams:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }
  
  async function handleGenerateDraw() {
    setGeneratingDraw(true)
    setError(null)
    
    try {
      await gameDayAPI.generateDraw(gameDayId)
      await loadData() // Reload to get matches and standings
      if (onUpdate) onUpdate() // Notify parent to reload
    } catch (err) {
      console.error('Error generating draw:', err)
      setError(err.message)
    } finally {
      setGeneratingDraw(false)
    }
  }
  
  function handleClearDraw() {
    const title = hasScores ? 'Delete All Matches?' : 'Clear Draw?'
    const message = hasScores 
      ? 'WARNING: This will DELETE ALL MATCHES including entered scores!\n\nAll match results will be permanently lost. You will be able to modify teams and generate a new draw.'
      : 'This will clear the current draw so you can modify teams and regenerate.\n\nNo scores have been entered yet, so no data will be lost.'
    
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: confirmClearDraw
    })
  }
  
  async function confirmClearDraw() {
    setClearingDraw(true)
    setError(null)
    
    try {
      await gameDayAPI.cancelDraw(gameDayId)
      await loadData() // Reload to reflect cleared state
      if (onUpdate) onUpdate() // Notify parent to reload
    } catch (err) {
      console.error('Error clearing draw:', err)
      setError(err.message)
    } finally {
      setClearingDraw(false)
    }
  }
  
  function handleToggleSwapMode() {
    setSwapMode(!swapMode)
    setSelectedPlayer(null)
  }
  
  function handlePlayerClick(player, team) {
    if (!swapMode) return
    
    // If no player is selected, select this one
    if (!selectedPlayer) {
      setSelectedPlayer({
        playerId: player.id,
        playerName: player.name,
        teamId: team.teamId,
        teamName: team.teamName
      })
      return
    }
    
    // If clicking the same player, deselect
    if (selectedPlayer.playerId === player.id) {
      setSelectedPlayer(null)
      return
    }
    
    // If clicking a player from the same team, select this player instead
    if (selectedPlayer.teamId === team.teamId) {
      setSelectedPlayer({
        playerId: player.id,
        playerName: player.name,
        teamId: team.teamId,
        teamName: team.teamName
      })
      return
    }
    
    // Swap players between different teams
    handleSwap(player, team)
  }
  
  async function handleSwap(player2, team2) {
    setSwapping(true)
    setError(null)
    
    try {
      const player1 = selectedPlayer
      
      // Remove both players from their current teams
      await teamsAPI.removeMember(player1.teamId, player1.playerId)
      await teamsAPI.removeMember(team2.teamId, player2.id)
      
      // Add each player to the other team
      await teamsAPI.addMember(team2.teamId, player1.playerId)
      await teamsAPI.addMember(player1.teamId, player2.id)
      
      // Reload teams to show updated assignments
      await loadData()
      
      // Reset selection but stay in swap mode
      setSelectedPlayer(null)
    } catch (err) {
      console.error('Error swapping players:', err)
      setError('Failed to swap players: ' + err.message)
      // Reload to ensure UI is consistent
      await loadData()
    } finally {
      setSwapping(false)
    }
  }
  
  // ============= PAIRS MODE FUNCTIONS =============
  
  function handleOpenCreatePairModal() {
    setSelectedAthletes([])
    setShowCreatePairModal(true)
  }
  
  function handleAthleteSelect(athleteId) {
    setSelectedAthletes(prev => {
      if (prev.includes(athleteId)) {
        // Deselect
        return prev.filter(id => id !== athleteId)
      } else if (prev.length < 2) {
        // Select (max 2)
        return [...prev, athleteId]
      }
      return prev
    })
  }
  
  async function handleCreatePair() {
    if (selectedAthletes.length !== 2) {
      setError('Please select exactly 2 athletes')
      return
    }
    
    setCreatingPair(true)
    setError(null)
    
    try {
      await teamsAPI.createPair(gameDayId, selectedAthletes[0], selectedAthletes[1])
      setShowCreatePairModal(false)
      setSelectedAthletes([])
      await loadData()
    } catch (err) {
      console.error('Error creating pair:', err)
      setError(err.message || 'Failed to create pair')
    } finally {
      setCreatingPair(false)
    }
  }
  
  async function handleDeletePair(pairId) {
    setDeletingPair(pairId)
    setError(null)
    
    try {
      await teamsAPI.deletePair(gameDayId, pairId)
      await loadData()
    } catch (err) {
      console.error('Error deleting pair:', err)
      setError(err.message || 'Failed to delete pair')
    } finally {
      setDeletingPair(null)
    }
  }
  
  async function handleAutoAllocate() {
    setAutoAllocating(true)
    setError(null)
    
    try {
      const result = await teamsAPI.autoAllocatePairs(gameDayId)
      if (result.oddAthlete) {
        setError(`${result.pairsCreated} pairs created. Note: ${result.oddAthlete.name} remains unpaired (odd number of athletes).`)
      }
      await loadData()
    } catch (err) {
      console.error('Error auto-allocating pairs:', err)
      setError(err.message || 'Failed to auto-allocate pairs')
    } finally {
      setAutoAllocating(false)
    }
  }
  
  async function handleGenerateSemiFinals() {
    setGeneratingSemiFinals(true)
    setError(null)
    
    try {
      await gameDayAPI.generateSemiFinals(gameDayId)
      await loadData()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error generating semi-finals:', err)
      setError(err.message || 'Failed to generate semi-finals')
    } finally {
      setGeneratingSemiFinals(false)
    }
  }
  
  async function handleGenerateFinals() {
    setGeneratingFinals(true)
    setError(null)
    
    try {
      await gameDayAPI.generateFinals(gameDayId)
      await loadData()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error generating finals:', err)
      setError(err.message || 'Failed to generate finals')
    } finally {
      setGeneratingFinals(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">{isPairsMode ? 'Pairs' : 'Teams'}</h2>
          
          {/* TEAMS MODE: Buttons on the right of header */}
          {!isPairsMode && (
            <div className="flex gap-2 flex-wrap justify-end">
              {/* Generate Teams button (when no teams exist) */}
              {isAdminMode && teams.length === 0 && (
                <button
                  onClick={handleGenerateTeams}
                  disabled={generating}
                  className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
                >
                  {generating ? 'Generating...' : 'Generate Teams'}
                </button>
              )}
              
              {/* Regenerate Teams, Swap Players, and Generate Draw buttons */}
              {isAdminMode && teams.length > 0 && !hasMatches && (
                <>
                  <button
                    onClick={handleGenerateTeams}
                    disabled={generating || swapMode}
                    className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {generating ? 'Regenerating...' : 'Regenerate Teams'}
                  </button>
                  <button
                    onClick={handleToggleSwapMode}
                    disabled={swapping}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      swapMode 
                        ? 'bg-amber-500 text-white hover:bg-amber-600' 
                        : 'border border-amber-500 text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    {swapMode ? 'Exit Swap Mode' : 'Swap Players'}
                  </button>
                  <button
                    onClick={handleGenerateDraw}
                    disabled={generatingDraw || swapMode}
                    className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
                  >
                    {generatingDraw ? 'Generating...' : 'Generate Draw'}
                  </button>
                </>
              )}
              
              {/* Clear Draw button (when matches exist) */}
              {isAdminMode && teams.length > 0 && hasMatches && (
                <button
                  onClick={handleClearDraw}
                  disabled={clearingDraw}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    hasScores
                      ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                      : 'border border-red-500 text-red-600 hover:bg-red-50 disabled:border-gray-300 disabled:text-gray-400'
                  }`}
                >
                  {clearingDraw ? 'Clearing...' : 'Clear Draw'}
                </button>
              )}
              
              {/* Refresh button */}
              {teams.length > 0 && hasMatches && (
                <button
                  onClick={loadData}
                  className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Status text */}
        {teams.length > 0 && !hasMatches && (
          <p className="text-sm text-gray-600">
            {isPairsMode 
              ? `${teams.length} pair${teams.length !== 1 ? 's' : ''} created. Generate the draw for round-robin matches.`
              : 'Teams are ready. Generate the draw to create matches.'}
          </p>
        )}
        {teams.length > 0 && hasMatches && !hasScores && (
          <p className="text-sm text-gray-600">
            {isPairsMode 
              ? 'Draw generated. Clear the draw to modify pairs.'
              : 'Draw generated. Clear the draw to modify teams.'}
          </p>
        )}
        
        {/* PAIRS MODE: Action buttons below header */}
        {isPairsMode && isAdminMode && !hasMatches && (
          <div className="flex gap-2 flex-wrap mt-4">
            {availableAthletes.length >= 2 && (
              <>
                <button
                  onClick={handleAutoAllocate}
                  disabled={autoAllocating}
                  className="bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {autoAllocating ? 'Allocating...' : 'Auto Allocate (Pro-Am)'}
                </button>
                <button
                  onClick={handleOpenCreatePairModal}
                  className="border border-purple-600 text-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-50"
                >
                  Create Pair
                </button>
              </>
            )}
            {teams.length >= 2 && (
              <button
                onClick={handleGenerateDraw}
                disabled={generatingDraw}
                className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
              >
                {generatingDraw ? 'Generating...' : 'Generate Draw'}
              </button>
            )}
          </div>
        )}
        
        {/* PAIRS MODE: Clear Draw and Refresh when matches exist */}
        {isPairsMode && hasMatches && (
          <div className="flex gap-2 flex-wrap mt-4">
            {isAdminMode && (
              <button
                onClick={handleClearDraw}
                disabled={clearingDraw}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  hasScores
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                    : 'border border-red-500 text-red-600 hover:bg-red-50 disabled:border-gray-300 disabled:text-gray-400'
                }`}
              >
                {clearingDraw ? 'Clearing...' : 'Clear Draw'}
              </button>
            )}
            <button
              onClick={loadData}
              className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            
            {/* Generate Semi-Finals button - show when round-robin complete, no semi-finals yet */}
            {isAdminMode && allRoundRobinComplete && !hasSemiFinals && teams.length >= 4 && (
              <button
                onClick={handleGenerateSemiFinals}
                disabled={generatingSemiFinals}
                className="bg-amber-500 text-white px-4 py-2 text-sm font-medium hover:bg-amber-600 disabled:bg-gray-400"
              >
                {generatingSemiFinals ? 'Generating...' : 'Generate Semi-Finals'}
              </button>
            )}
            
            {/* Generate Finals button - show when semi-finals complete, no finals yet */}
            {isAdminMode && allSemiFinalsComplete && !hasFinals && (
              <button
                onClick={handleGenerateFinals}
                disabled={generatingFinals}
                className="bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:bg-gray-400"
              >
                {generatingFinals ? 'Generating...' : 'Generate Finals'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <div className="border border-red-500 bg-red-50 p-4 text-red-800 rounded">
          {error}
        </div>
      )}
      
      {/* Swap Mode Instructions */}
      {swapMode && (
        <div className="border-2 border-amber-400 bg-amber-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-amber-800">Swap Mode Active</p>
              <p className="text-sm text-amber-700">
                {selectedPlayer 
                  ? `${selectedPlayer.playerName} selected. Click a player from another team to swap them.`
                  : 'Click on a player to select them, then click on a player from a different team to swap.'}
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
            <div className="mt-2 text-sm text-amber-700 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Swapping players...
            </div>
          )}
        </div>
      )}
      
      {teams.length === 0 && !error && (
        <div className={`border p-4 rounded ${isPairsMode ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-blue-500 bg-blue-50 text-blue-800'}`}>
          <p className="font-semibold mb-2">
            {isAdminMode 
              ? 'Get Started' 
              : isPairsMode ? 'Pairs Not Created' : 'Teams Not Generated'}
          </p>
          <p>
            {isPairsMode
              ? (isAdminMode 
                  ? 'Add athletes first, then create pairs manually. Each pair must have exactly 2 players.'
                  : 'Pairs have not been created yet. Please wait for the admin to set up pairs.')
              : (isAdminMode 
                  ? 'Add athletes first, then generate teams. Teams will be balanced using a serpentine draft based on player rankings.'
                  : 'Teams have not been generated yet. Please wait for the admin to set up teams.')}
          </p>
          {isPairsMode && availableAthletes.length > 0 && availableAthletes.length < 2 && (
            <p className="mt-2 text-sm">
              Need at least 2 available athletes to create a pair. Currently have {availableAthletes.length}.
            </p>
          )}
        </div>
      )}
      
      {/* Pairs Display */}
      {isPairsMode && teams.length > 0 && !hasMatches && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((pair) => (
            <div key={pair.teamId} className="border-2 border-purple-200 rounded-lg overflow-hidden bg-white">
              {/* Pair Header */}
              <div className="bg-purple-500 text-white p-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{pair.teamName}</h3>
                  {isAdminMode && (
                    <button
                      onClick={() => handleDeletePair(pair.teamId)}
                      disabled={deletingPair === pair.teamId}
                      className="text-white/70 hover:text-white p-1"
                      title="Delete pair"
                    >
                      {deletingPair === pair.teamId ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Pair Members */}
              <div className="p-3 space-y-2">
                {pair.members.map((member) => (
                  <div key={member.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-gray-500">Rank {member.rank}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Available Athletes Info */}
          {availableAthletes.length > 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500">
              <p className="text-sm mb-2">{availableAthletes.length} athlete{availableAthletes.length !== 1 ? 's' : ''} available</p>
              {isAdminMode && availableAthletes.length >= 2 && (
                <button
                  onClick={handleOpenCreatePairModal}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  + Create another pair
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teams Display (Teams Mode Only) */}
      {!isPairsMode && teams.length > 0 && !hasMatches && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const colorScheme = TEAM_COLORS[team.teamColor] || TEAM_COLORS.blue
            
            return (
              <div key={team.teamId} className={`border-2 ${colorScheme.border} rounded-lg overflow-hidden`}>
                {/* Team Header */}
                <div className={`${colorScheme.bg} text-white p-4`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">{team.teamName}</h3>
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                      {team.members.length} player{team.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                {/* Team Members */}
                <div className="p-4 space-y-2 bg-white">
                  {team.members.map((member, idx) => {
                    const isSelected = selectedPlayer?.playerId === member.id
                    const isSwappable = swapMode && selectedPlayer && selectedPlayer.teamId !== team.teamId
                    const isClickable = swapMode && isAdminMode
                    
                    return (
                      <div 
                        key={member.id} 
                        onClick={() => isClickable && handlePlayerClick(member, team)}
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
                        <div className="flex items-center gap-3">
                          {isSelected && (
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {isSwappable && !isSelected && (
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </span>
                          )}
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-gray-500">Rank {member.rank}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSwappable && (
                            <span className="text-xs text-green-600 font-medium">
                              Click to swap
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded border ${colorScheme.badge}`}>
                            #{idx + 1}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Team Stats */}
                <div className={`p-4 border-t-2 ${colorScheme.border} bg-white`}>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Avg Rank:</span>
                      <span className="ml-2 font-semibold">{team.avgRank}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Partnerships:</span>
                      <span className="ml-2 font-semibold">
                        {team.members.length >= 2 ? (team.members.length * (team.members.length - 1)) / 2 : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Pairs Leaderboard View (when matches exist) */}
      {isPairsMode && teams.length > 0 && hasMatches && standings.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Pair Standings</h3>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-semibold">#</th>
                  <th className="text-left p-3 font-semibold">Pair</th>
                  <th className="text-center p-3 font-semibold">Played</th>
                  <th className="text-center p-3 font-semibold">W</th>
                  <th className="text-center p-3 font-semibold">L</th>
                  <th className="text-center p-3 font-semibold">PF</th>
                  <th className="text-center p-3 font-semibold">PA</th>
                  <th className="text-center p-3 font-semibold">+/-</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((pair, index) => (
                  <tr key={pair.pairId || pair.teamId} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="p-3 font-bold text-purple-600">{index + 1}</td>
                    <td className="p-3">
                      <div className="font-medium">{pair.pairName || pair.teamName}</div>
                      <div className="text-xs text-gray-500">
                        {pair.members?.map(m => m.name).join(' & ')}
                      </div>
                    </td>
                    <td className="p-3 text-center">{pair.matchesPlayed}</td>
                    <td className="p-3 text-center font-medium text-green-600">{pair.wins}</td>
                    <td className="p-3 text-center font-medium text-red-600">{pair.losses}</td>
                    <td className="p-3 text-center">{pair.pointsFor}</td>
                    <td className="p-3 text-center">{pair.pointsAgainst}</td>
                    <td className={`p-3 text-center font-bold ${
                      pair.pointDiff > 0 ? 'text-green-600' : 
                      pair.pointDiff < 0 ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {pair.pointDiff > 0 ? '+' : ''}{pair.pointDiff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teams Leaderboard View (when matches exist) */}
      {!isPairsMode && teams.length > 0 && hasMatches && standings.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Team Standings</h3>
          
          <div className="grid gap-6">
            {standings.map((team, index) => {
              const colorScheme = TEAM_COLORS[team.teamColor] || TEAM_COLORS.blue
              const hasPlayed = team.matchesPlayed > 0
              
              return (
                <div key={team.teamId} className={`border-2 ${colorScheme.border} rounded-lg overflow-hidden`}>
                  {/* Header */}
                  <div className={`${colorScheme.bg} text-white p-4`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold opacity-70">#{index + 1}</span>
                        <div>
                          <h3 className="text-2xl font-bold">{team.teamName}</h3>
                          <p className="text-sm opacity-90 mt-1">
                            {team.members.map(m => m.name).join(', ')}
                          </p>
                        </div>
                      </div>
                      
                      {hasPlayed && (
                        <div className="text-right">
                          <div className="text-4xl font-bold">
                            {team.pointDiff > 0 ? '+' : ''}{team.pointDiff}
                          </div>
                          <div className="text-sm opacity-90">
                            Point Difference
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Point Difference Bar */}
                  {hasPlayed && (
                    <div className={`${colorScheme.bgLight} p-4`}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold">Point Difference</span>
                        <span className="font-bold">{team.pointDiff > 0 ? '+' : ''}{team.pointDiff} pts</span>
                      </div>
                      
                      {/* Horizontal bar showing positive/negative point diff */}
                      <div className="relative h-10 bg-gray-200 rounded-lg overflow-hidden">
                        {/* Centre line (zero point) */}
                        <div 
                          className="absolute h-full w-0.5 bg-gray-600 z-20"
                          style={{ left: '50%' }}
                        >
                          <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                            0
                          </div>
                        </div>
                        
                        {/* Point diff bar - grows from centre */}
                        {team.pointDiff !== 0 && (
                          <div 
                            className={`absolute h-full transition-all duration-500 ${
                              team.pointDiff > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              left: team.pointDiff > 0 ? '50%' : `${50 - Math.min(Math.abs(team.pointDiff), 50)}%`,
                              width: `${Math.min(Math.abs(team.pointDiff), 50)}%`
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Status message */}
                      <div className="mt-2 text-xs text-gray-600">
                        {team.pointDiff > 0 ? (
                          <span className="text-green-700 font-semibold">Leading on points!</span>
                        ) : team.pointDiff < 0 ? (
                          <span className="text-red-700">Behind on points - time to rally!</span>
                        ) : (
                          <span>Even on points</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-white">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        team.pointDiff > 0 ? 'text-green-600' : 
                        team.pointDiff < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {team.pointDiff > 0 ? '+' : ''}{team.pointDiff}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Point Diff</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{team.wins}</div>
                      <div className="text-xs text-gray-500 mt-1">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{team.losses}</div>
                      <div className="text-xs text-gray-500 mt-1">Losses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{team.pointsFor}</div>
                      <div className="text-xs text-gray-500 mt-1">Points For</div>
                    </div>
                  </div>
                  
                  {!hasPlayed && (
                    <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                      No matches played yet
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Confirm Modal for Clear Draw */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={hasScores ? 'Yes, Delete All Matches' : 'Clear Draw'}
        confirmColor={hasScores ? 'red' : 'black'}
      />

      {/* Create Pair Modal */}
      {showCreatePairModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Create Pair</h3>
              <p className="text-sm text-gray-600 mt-1">Select 2 athletes to form a pair</p>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {availableAthletes.length < 2 ? (
                <p className="text-gray-600 text-center py-4">
                  Not enough available athletes. Need at least 2 to create a pair.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableAthletes.map((athlete) => {
                    const isSelected = selectedAthletes.includes(athlete.id)
                    return (
                      <button
                        key={athlete.id}
                        onClick={() => handleAthleteSelect(athlete.id)}
                        disabled={!isSelected && selectedAthletes.length >= 2}
                        className={`w-full flex items-center justify-between p-3 rounded border-2 transition-all ${
                          isSelected
                            ? 'bg-purple-100 border-purple-400'
                            : selectedAthletes.length >= 2
                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">{athlete.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">Rank {athlete.rank}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  setShowCreatePairModal(false)
                  setSelectedAthletes([])
                }}
                disabled={creatingPair}
                className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePair}
                disabled={selectedAthletes.length !== 2 || creatingPair}
                className="flex-1 bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:bg-gray-400"
              >
                {creatingPair ? 'Creating...' : `Create Pair${selectedAthletes.length === 2 ? '' : ` (${selectedAthletes.length}/2)`}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
