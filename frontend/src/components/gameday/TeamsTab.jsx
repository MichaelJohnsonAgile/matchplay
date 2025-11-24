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

export function TeamsTab({ gameDayId, settings, onUpdate }) {
  const [teams, setTeams] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatingDraw, setGeneratingDraw] = useState(false)
  const [hasMatches, setHasMatches] = useState(false)
  
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
        </div>
        
        <div className="flex gap-2">
          {teams.length === 0 && (
            <button
              onClick={handleGenerateTeams}
              disabled={generating}
              className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
            >
              {generating ? 'Generating...' : 'Generate Teams'}
            </button>
          )}
          
          {teams.length > 0 && !hasMatches && (
            <>
              <button
                onClick={handleGenerateTeams}
                disabled={generating}
                className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100"
              >
                {generating ? 'Regenerating...' : 'Regenerate Teams'}
              </button>
              <button
                onClick={handleGenerateDraw}
                disabled={generatingDraw}
                className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
              >
                {generatingDraw ? 'Generating...' : 'Generate Draw'}
              </button>
            </>
          )}
          
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
      
      {teams.length === 0 && !error && (
        <div className="border border-blue-500 bg-blue-50 p-4 text-blue-800 rounded">
          <p className="font-semibold mb-2">Get Started</p>
          <p>Add athletes first, then generate teams. Teams will be balanced using a serpentine draft based on player rankings.</p>
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
                  {team.members.map((member, idx) => (
                    <div 
                      key={member.id} 
                      className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500">Rank {member.rank}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${colorScheme.badge}`}>
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
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
                            {team.wins}-{team.losses}
                          </div>
                          <div className="text-sm opacity-90">
                            {team.winRate.toFixed(1)}% Win Rate
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Win Rate Progress Bar (Bullet Chart Style) */}
                  {hasPlayed && (
                    <div className={`${colorScheme.bgLight} p-4`}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold">Win Rate Progress to 50% Goal</span>
                        <span className="font-bold">{team.winRate.toFixed(1)}%</span>
                      </div>
                      
                      <div className="relative h-10 bg-gray-200 rounded-lg overflow-hidden">
                        {/* Goal marker at 50% */}
                        <div 
                          className="absolute h-full w-0.5 bg-gray-600 z-20"
                          style={{ left: '50%' }}
                        >
                          <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                            Goal: 50%
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div 
                          className={`h-full transition-all duration-500 ${
                            team.winRate >= 50 ? 'bg-green-500' : colorScheme.progressBar
                          }`}
                          style={{ width: `${Math.min(team.winRate, 100)}%` }}
                        />
                        
                        {/* Current value marker */}
                        <div 
                          className="absolute h-full w-1 bg-black z-10"
                          style={{ left: `${Math.min(team.winRate, 100)}%` }}
                        />
                      </div>
                      
                      {/* Progress message */}
                      <div className="mt-2 text-xs text-gray-600">
                        {team.winRate >= 50 ? (
                          <span className="text-green-700 font-semibold">✓ Goal reached! Excellent performance!</span>
                        ) : team.winRate >= 40 ? (
                          <span className="text-blue-700">Close to goal - keep it up!</span>
                        ) : (
                          <span>Working towards the 50% win rate goal</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-white">
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
