import { useState, useEffect } from 'react'
import { SkeletonText } from '../Skeleton'
import Modal from '../Modal'
import { AlertModal } from '../Alert'
import { matchAPI, athleteAPI, gameDayAPI } from '../../services/api'

export default function MatchesTab({ gameDayId, gameDay, isAdminMode = false }) {
  const [selectedRound, setSelectedRound] = useState('1')
  const [selectedGroup, setSelectedGroup] = useState('1')
  const [matches, setMatches] = useState([])
  const [athletes, setAthletes] = useState({}) // Map of athleteId -> athlete object
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGeneratingRound, setIsGeneratingRound] = useState(false)
  
  // Alert modal
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' })
  
  // Check if draw has been generated
  const hasMatches = gameDay?.matchCount > 0
  
  useEffect(() => {
    console.log('MatchesTab useEffect - hasMatches:', hasMatches, 'gameDayId:', gameDayId)
    if (hasMatches) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [gameDayId, hasMatches])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [matchesData, athletesData] = await Promise.all([
        matchAPI.getForGameDay(gameDayId),
        athleteAPI.getForGameDay(gameDayId)
      ])
      
      console.log('Loaded matches:', matchesData)
      console.log('Loaded athletes:', athletesData)
      
      setMatches(matchesData)
      
      // Create a map for quick athlete lookup
      const athleteMap = {}
      athletesData.forEach(athlete => {
        athleteMap[athlete.id] = athlete
      })
      setAthletes(athleteMap)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }
  
  const loadMatches = async () => {
    try {
      const data = await matchAPI.getForGameDay(gameDayId)
      setMatches(data)
    } catch (err) {
      console.error('Failed to load matches:', err)
    }
  }
  
  // Helper to get athlete name
  const getAthleteName = (athleteId) => {
    return athletes[athleteId]?.name || 'Unknown'
  }
  
  const rounds = []
  for (let i = 1; i <= (gameDay?.settings?.numberOfRounds || 3); i++) {
    rounds.push({ value: String(i), label: `Round ${i}` })
  }
  
  // Calculate number of groups based on matches
  const numGroups = matches.length > 0
    ? Math.max(...matches.map(m => m.group))
    : 3
    
  const groupOptions = []
  for (let i = 1; i <= numGroups; i++) {
    groupOptions.push({ value: String(i), label: `Group ${i}` })
  }
  
  // Get matches for selected round and group
  const filteredMatches = matches.filter(m => 
    m.round === parseInt(selectedRound) && 
    m.group === parseInt(selectedGroup)
  )
  
  // Calculate group leaderboard for selected round and group
  const calculateGroupLeaderboard = () => {
    const groupMatches = filteredMatches
    
    if (groupMatches.length === 0) return []
    
    // Get all athletes in this group
    const athleteIds = new Set()
    groupMatches.forEach(match => {
      match.teamA.players.forEach(id => athleteIds.add(id))
      match.teamB.players.forEach(id => athleteIds.add(id))
      if (match.bye) athleteIds.add(match.bye)
    })
    
    // Calculate stats for each athlete
    const stats = {}
    athleteIds.forEach(athleteId => {
      stats[athleteId] = {
        id: athleteId,
        name: getAthleteName(athleteId),
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        matchesPlayed: 0
      }
    })
    
    // Calculate from completed matches
    groupMatches.forEach(match => {
      if (match.teamA.score !== null && match.teamB.score !== null) {
        const scoreA = match.teamA.score
        const scoreB = match.teamB.score
        
        // Team A players
        match.teamA.players.forEach(playerId => {
          stats[playerId].pointsFor += scoreA
          stats[playerId].pointsAgainst += scoreB
          stats[playerId].matchesPlayed += 1
          if (match.winner === 'teamA') {
            stats[playerId].wins += 1
          } else if (match.winner === 'teamB') {
            stats[playerId].losses += 1
          }
        })
        
        // Team B players
        match.teamB.players.forEach(playerId => {
          stats[playerId].pointsFor += scoreB
          stats[playerId].pointsAgainst += scoreA
          stats[playerId].matchesPlayed += 1
          if (match.winner === 'teamB') {
            stats[playerId].wins += 1
          } else if (match.winner === 'teamA') {
            stats[playerId].losses += 1
          }
        })
      }
    })
    
    // Convert to array and sort
    const leaderboard = Object.values(stats)
    
    // Sort by: 1) Wins (desc), 2) Point differential (desc), 3) Points for (desc)
    leaderboard.sort((a, b) => {
      const diffA = a.pointsFor - a.pointsAgainst
      const diffB = b.pointsFor - b.pointsAgainst
      
      if (b.wins !== a.wins) return b.wins - a.wins
      if (diffB !== diffA) return diffB - diffA
      return b.pointsFor - a.pointsFor
    })
    
    return leaderboard
  }
  
  const groupLeaderboard = calculateGroupLeaderboard()
  
  // Check if any matches have scores
  const hasAnyScores = filteredMatches.some(m => m.teamA.score !== null && m.teamB.score !== null)
  
  // Check if all matches are complete
  const allMatchesComplete = filteredMatches.length > 0 && 
    filteredMatches.every(m => m.teamA.score !== null && m.teamB.score !== null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [tempScores, setTempScores] = useState({ teamA: '', teamB: '' })
  
  const openScoreModal = (match) => {
    setSelectedMatch(match)
    setTempScores({
      teamA: match.teamA.score || '',
      teamB: match.teamB.score || ''
    })
    setIsModalOpen(true)
  }
  
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedMatch(null)
    setTempScores({ teamA: '', teamB: '' })
  }
  
  const saveScore = async () => {
    if (!selectedMatch) return
    
    try {
      await matchAPI.updateScore(selectedMatch.id, {
        teamA: tempScores.teamA ? parseInt(tempScores.teamA) : null,
        teamB: tempScores.teamB ? parseInt(tempScores.teamB) : null
      })
      
      // Reload matches
      await loadMatches()
      closeModal()
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Score saved successfully',
        type: 'success'
      })
    } catch (err) {
      console.error('Failed to save score:', err)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save score. Please try again.',
        type: 'error'
      })
    }
  }
  
  // Check if there are more rounds to generate
  const currentMaxRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0
  const maxRounds = gameDay?.settings?.numberOfRounds || 3
  const hasMoreRounds = currentMaxRound < maxRounds
  
  // Check if all matches in current round are complete
  const currentRoundMatches = matches.filter(m => m.round === currentMaxRound)
  const allCurrentRoundComplete = currentRoundMatches.length > 0 && 
    currentRoundMatches.every(m => m.teamA.score !== null && m.teamB.score !== null)
  
  const canGenerateNextRound = hasMoreRounds && allCurrentRoundComplete
  
  const handleGenerateNextRound = async () => {
    setIsGeneratingRound(true)
    try {
      const result = await gameDayAPI.generateNextRound(gameDayId)
      await loadData() // Reload all data
      
      // Switch to the newly generated round
      setSelectedRound(String(result.round))
      setSelectedGroup('1')
      
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: `Round ${result.round} generated successfully! ${result.matchesGenerated} matches created.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Failed to generate next round:', err)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to generate next round. Please try again.',
        type: 'error'
      })
    } finally {
      setIsGeneratingRound(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-red-500 bg-red-50 p-4 text-red-800 text-sm">
          Error: {error}
        </div>
      )}
      
      {!hasMatches ? (
        <div className="border border-gray-200 p-8 text-center text-gray-600">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-lg font-semibold mb-2">Draw Not Generated</p>
          <p className="text-sm">Generate the match draw from the Athletes tab to view matches.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Match Draw</h2>
        
        {/* Round and Group Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            id="group-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="border border-gray-200 px-4 py-2 text-sm font-medium min-w-[120px]"
          >
            {groupOptions.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
          
          <select
            id="round-select"
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="border border-gray-200 px-4 py-2 text-sm font-medium min-w-[120px]"
          >
            {rounds.map((round) => (
              <option key={round.value} value={round.value}>
                {round.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Generate Next Round Button */}
      {canGenerateNextRound && (
        <div className="bg-green-50 border border-green-500 p-4 rounded">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-green-800 mb-1">
                Round {currentMaxRound} Complete!
              </p>
              <p className="text-sm text-green-700">
                {isAdminMode 
                  ? `All matches are complete. Generate Round ${currentMaxRound + 1} to continue.`
                  : `All matches are complete. Round ${currentMaxRound + 1} will be generated by an admin.`
                }
              </p>
            </div>
            {isAdminMode && (
              <button
                onClick={handleGenerateNextRound}
                disabled={isGeneratingRound}
                className="bg-green-600 text-white px-6 py-3 text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {isGeneratingRound ? 'Generating...' : `Generate Round ${currentMaxRound + 1}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Group Matches */}
      <div className="space-y-6">
        <div className="p-4">
          <h4 className="text-md font-semibold mb-3">Round {selectedRound} - Group {selectedGroup}</h4>
          
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-32"></div>
              <div className="skeleton h-32"></div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center text-gray-500">
              No matches generated yet. Generate the draw from the Athletes tab.
            </div>
          ) : (
            <>
              {/* Group Leaderboard */}
              {groupLeaderboard.length > 0 && (
                <div className="mb-6 overflow-x-auto">
                  <h5 className="text-sm font-semibold mb-2">Group Standings</h5>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="p-2 text-center font-semibold">Pos</th>
                        <th className="p-2 text-left font-semibold">Athlete</th>
                        <th className="p-2 text-center font-semibold">W</th>
                        <th className="p-2 text-center font-semibold">L</th>
                        <th className="p-2 text-center font-semibold">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupLeaderboard.map((athlete, index) => {
                        const position = index + 1
                        const differential = athlete.pointsFor - athlete.pointsAgainst
                        
                        // Determine background color
                        let bgColor = ''
                        if (position === 1) {
                          if (allMatchesComplete) {
                            bgColor = 'bg-green-500 text-white' // Solid green when complete
                          } else if (hasAnyScores) {
                            bgColor = 'bg-green-100' // Light green when scores being entered
                          }
                        } else if (position === groupLeaderboard.length) {
                          // Last position (4th or 5th)
                          if (allMatchesComplete) {
                            bgColor = 'bg-red-500 text-white' // Solid red when complete
                          } else if (hasAnyScores) {
                            bgColor = 'bg-red-100' // Light red when scores being entered
                          }
                        }
                        
                        // Determine movement arrow (when round is complete)
                        let movementArrow = null
                        if (allMatchesComplete) {
                          // Top 2 move up (or top 1 for 4-player groups can be simplified to top 2)
                          if (position <= 2) {
                            movementArrow = (
                              <svg className="w-4 h-4 text-green-600 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )
                          }
                          // Bottom 2 move down
                          else if (position >= groupLeaderboard.length - 1) {
                            movementArrow = (
                              <svg className="w-4 h-4 text-red-600 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )
                          }
                        }
                        
                        return (
                          <tr key={athlete.id} className={`border-b border-gray-200 ${bgColor}`}>
                            <td className="p-2 text-center font-semibold">
                              {position}
                            </td>
                            <td className="p-2">
                              {athlete.name}
                              {movementArrow}
                            </td>
                            <td className="p-2 text-center">{athlete.wins}</td>
                            <td className="p-2 text-center">{athlete.losses}</td>
                            <td className="p-2 text-center">
                              {differential > 0 ? '+' : ''}{differential}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <h5 className="text-sm font-semibold mb-2">Matches</h5>
              
              <div className="space-y-4">
              {filteredMatches.map((match, index) => {
                const hasScores = match.teamA.score !== null && match.teamB.score !== null
                const teamAWins = hasScores && match.winner === 'teamA'
                const teamBWins = hasScores && match.winner === 'teamB'
                
                return (
                  <div 
                    key={match.id}
                    className="border border-gray-200 rounded p-3"
                  >
                    <div className="text-xs text-gray-600 mb-3 flex justify-between items-center">
                      <span>Match {index + 1} <span className="text-gray-400">({match.id.substring(match.id.length - 8)})</span></span>
                      {match.bye && (
                        <span className="text-orange-600 font-medium">
                          Bye: {getAthleteName(match.bye)}
                        </span>
                      )}
                    </div>
                    
                    <div 
                      onClick={() => openScoreModal(match)}
                      className="cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors p-2 -m-2 rounded"
                    >
                      {/* Team A */}
                      <div className="mb-3">
                        <div className={`flex justify-between items-center gap-3 p-2 rounded transition-colors ${
                          teamAWins ? 'bg-green-100' : teamBWins ? 'bg-red-100' : ''
                        }`}>
                          <div className="flex gap-2 items-center flex-1">
                            <span className="text-sm font-medium">
                              {getAthleteName(match.teamA.players[0])}
                            </span>
                            <span className="text-gray-400">&</span>
                            <span className="text-sm font-medium">
                              {getAthleteName(match.teamA.players[1])}
                            </span>
                          </div>
                          <div className="h-8 w-16 rounded border border-gray-200 bg-gray-100 flex items-center justify-center font-semibold flex-shrink-0">
                            {match.teamA.score !== null ? match.teamA.score : '-'}
                          </div>
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="text-center text-sm font-bold text-gray-400 my-3">
                        VS
                      </div>

                      {/* Team B */}
                      <div>
                        <div className={`flex justify-between items-center gap-3 p-2 rounded transition-colors ${
                          teamBWins ? 'bg-green-100' : teamAWins ? 'bg-red-100' : ''
                        }`}>
                          <div className="flex gap-2 items-center flex-1">
                            <span className="text-sm font-medium">
                              {getAthleteName(match.teamB.players[0])}
                            </span>
                            <span className="text-gray-400">&</span>
                            <span className="text-sm font-medium">
                              {getAthleteName(match.teamB.players[1])}
                            </span>
                          </div>
                          <div className="h-8 w-16 rounded border border-gray-200 bg-gray-100 flex items-center justify-center font-semibold flex-shrink-0">
                            {match.teamB.score !== null ? match.teamB.score : '-'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="mt-3 pt-3 border-t border-gray-200 text-center text-sm text-gray-500">
                        {hasScores ? 'Tap to edit score' : 'Tap to enter score'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </>
          )}
        </div>
      </div>
        </>
      )}
      
      {/* Score Entry Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h3 className="text-xl font-semibold mb-4">Enter Score</h3>
        
        {selectedMatch && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Round {selectedMatch.round} - Group {selectedMatch.group}
            </div>
            
            {/* Team A Score */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {getAthleteName(selectedMatch.teamA.players[0])} & {getAthleteName(selectedMatch.teamA.players[1])}
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={tempScores.teamA}
                onChange={(e) => setTempScores(prev => ({ ...prev, teamA: e.target.value }))}
                className="w-full h-12 rounded border border-gray-200 bg-gray-100 text-center text-2xl font-semibold focus:outline-none focus:border-gray-200 focus:bg-white"
                placeholder="0"
                autoFocus
              />
            </div>
            
            <div className="text-center text-sm font-bold text-gray-400">VS</div>
            
            {/* Team B Score */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {getAthleteName(selectedMatch.teamB.players[0])} & {getAthleteName(selectedMatch.teamB.players[1])}
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={tempScores.teamB}
                onChange={(e) => setTempScores(prev => ({ ...prev, teamB: e.target.value }))}
                className="w-full h-12 rounded border border-gray-200 bg-gray-100 text-center text-2xl font-semibold focus:outline-none focus:border-gray-200 focus:bg-white"
                placeholder="0"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button 
                onClick={closeModal}
                className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={saveScore}
                className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium"
              >
                Save Score
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  )
}

