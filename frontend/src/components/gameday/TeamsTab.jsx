import { useState, useEffect } from 'react'
import { teamsAPI, gameDayAPI, matchAPI } from '../../services/api'

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
      
      // Load standings if matches exist
      if (matchesData.length > 0) {
        const standingsData = await teamsAPI.getStandings(gameDayId)
        setStandings(standingsData)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load teams')
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
  
  async function handleClearDraw() {
    // Confirm before clearing
    const message = hasScores 
      ? 'WARNING: This will DELETE ALL MATCHES including entered scores!\n\nAre you sure you want to clear the draw?'
      : 'This will clear the current draw so you can modify teams and regenerate.\n\nContinue?'
    
    if (!window.confirm(message)) {
      return
    }
    
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          {teams.length > 0 && !hasMatches && (
            <p className="text-sm text-gray-600 mt-1">Teams are ready. Generate the draw to create matches.</p>
          )}
          {teams.length > 0 && hasMatches && !hasScores && (
            <p className="text-sm text-gray-600 mt-1">Draw generated. Clear the draw to modify teams.</p>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Admin-only: Generate Teams button (when no teams exist) */}
          {isAdminMode && teams.length === 0 && (
            <button
              onClick={handleGenerateTeams}
              disabled={generating}
              className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
            >
              {generating ? 'Generating...' : 'Generate Teams'}
            </button>
          )}
          
          {/* Admin-only: Regenerate Teams, Swap Players, and Generate Draw buttons */}
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
          
          {/* Admin-only: Clear Draw button (when matches exist) */}
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
          
          {/* Refresh button - available to everyone */}
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
        <div className="border border-blue-500 bg-blue-50 p-4 text-blue-800 rounded">
          <p className="font-semibold mb-2">{isAdminMode ? 'Get Started' : 'Teams Not Generated'}</p>
          <p>
            {isAdminMode 
              ? 'Add athletes first, then generate teams. Teams will be balanced using a serpentine draft based on player rankings.'
              : 'Teams have not been generated yet. Please wait for the admin to set up teams.'}
          </p>
        </div>
      )}
      
      {/* Teams Display */}
      {teams.length > 0 && !hasMatches && (
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
      
      {/* Leaderboard View (when matches exist) */}
      {teams.length > 0 && hasMatches && standings.length > 0 && (
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
    </div>
  )
}
