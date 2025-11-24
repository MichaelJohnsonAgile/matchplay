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
                      <span className="text-green-700 font-semibold">Goal reached! Excellent performance!</span>
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
  )
}

