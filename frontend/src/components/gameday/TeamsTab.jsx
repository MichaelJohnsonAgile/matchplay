import { useState, useEffect } from 'react'
import { teamsAPI } from '../../services/api'

const TEAM_COLORS = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800 border-red-200'
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-800 border-green-200'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
}

export function TeamsTab({ gameDayId, settings }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  useEffect(() => {
    loadTeams()
  }, [gameDayId])
  
  async function loadTeams() {
    try {
      setLoading(true)
      const data = await teamsAPI.getForGameDay(gameDayId)
      setTeams(data)
      setError(null)
    } catch (err) {
      console.error('Error loading teams:', err)
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
    } catch (err) {
      console.error('Error generating teams:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading teams...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teams</h2>
        {teams.length === 0 && (
          <button
            onClick={handleGenerateTeams}
            disabled={generating}
            className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
          >
            {generating ? 'Generating...' : 'Generate Teams'}
          </button>
        )}
        {teams.length > 0 && (
          <button
            onClick={handleGenerateTeams}
            disabled={generating}
            className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100"
          >
            {generating ? 'Regenerating...' : 'Regenerate Teams'}
          </button>
        )}
      </div>
      
      {error && (
        <div className="border border-red-500 bg-red-50 p-4 text-red-800 rounded">
          {error}
        </div>
      )}
      
      {teams.length === 0 && !error && (
        <div className="border border-blue-500 bg-blue-50 p-4 text-blue-800 rounded">
          No teams created yet. Add athletes first, then generate teams.
        </div>
      )}
      
      {/* Team Display */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const colorScheme = TEAM_COLORS[team.teamColor] || TEAM_COLORS.blue
            
            return (
              <div key={team.teamId} className={`border ${colorScheme.border} ${colorScheme.bgLight} rounded-lg overflow-hidden`}>
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
                <div className="p-4 space-y-2">
                  {team.members.map((member, idx) => (
                    <div 
                      key={member.id} 
                      className="flex justify-between items-center p-3 bg-white rounded border border-gray-200"
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
                <div className={`p-4 border-t ${colorScheme.border}`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Average Rank:</span>
                    <span className="font-semibold">{team.avgRank}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-gray-600">Possible Partnerships:</span>
                    <span className="font-semibold">
                      {team.members.length >= 2 ? (
                        (team.members.length * (team.members.length - 1)) / 2
                      ) : 0}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Info Box */}
      {teams.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm">
          <p className="font-semibold mb-2">Teams Generated</p>
          <p className="text-gray-600">
            Teams have been balanced using a serpentine draft based on athlete rankings. 
            Go to the Matches tab to generate matches between teams.
          </p>
        </div>
      )}
    </div>
  )
}

