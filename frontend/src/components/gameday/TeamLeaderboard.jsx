import { useState, useEffect } from 'react'
import { teamsAPI } from '../../services/api'

const TEAM_COLORS = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    progressBar: 'bg-blue-500'
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-900',
    progressBar: 'bg-red-500'
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-900',
    progressBar: 'bg-green-500'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-900',
    progressBar: 'bg-yellow-500'
  }
}

export function TeamLeaderboard({ gameDayId }) {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadStandings()
    
    // Refresh every 10 seconds during active game
    const interval = setInterval(loadStandings, 10000)
    return () => clearInterval(interval)
  }, [gameDayId])
  
  async function loadStandings() {
    try {
      const data = await teamsAPI.getStandings(gameDayId)
      setStandings(data)
    } catch (err) {
      console.error('Failed to load standings:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading standings...</div>
      </div>
    )
  }
  
  if (standings.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-8 text-center rounded">
        <p className="text-gray-600">No team standings yet. Complete some matches to see team performance.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Team Standings</h2>
      
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
  )
}

