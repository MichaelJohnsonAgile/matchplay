import { useState, useEffect, useMemo } from 'react'
import Skeleton from '../Skeleton'
import { athleteAPI, matchAPI } from '../../services/api'
import { getStoredMyAthleteId, setStoredMyAthleteId } from '../../utils/myAthleteStorage'

function athleteInMatch(match, athleteId) {
  if (!athleteId) return false
  return (
    match.teamA.players.includes(athleteId) ||
    match.teamB.players.includes(athleteId)
  )
}

function getPartnerId(match, athleteId) {
  if (!athleteInMatch(match, athleteId)) return null
  const onTeamA = match.teamA.players.includes(athleteId)
  const teammates = onTeamA ? match.teamA.players : match.teamB.players
  return teammates.find((id) => id !== athleteId) ?? null
}

function buildPartnerStats(matches, athleteId) {
  const byPartner = new Map()

  for (const match of matches) {
    const partnerId = getPartnerId(match, athleteId)
    if (!partnerId) continue

    if (!byPartner.has(partnerId)) {
      byPartner.set(partnerId, {
        partnerId,
        wins: 0,
        losses: 0,
        upcoming: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      })
    }

    const stats = byPartner.get(partnerId)
    const onTeamA = match.teamA.players.includes(athleteId)
    const myTeam = onTeamA ? match.teamA : match.teamB
    const oppTeam = onTeamA ? match.teamB : match.teamA

    if (!match.winner) {
      stats.upcoming += 1
      continue
    }

    stats.pointsFor += myTeam.score ?? 0
    stats.pointsAgainst += oppTeam.score ?? 0

    const won = match.winner === (onTeamA ? 'teamA' : 'teamB')
    if (won) stats.wins += 1
    else stats.losses += 1
  }

  return [...byPartner.values()].sort((a, b) => {
    const playedA = a.wins + a.losses
    const playedB = b.wins + b.losses
    if (playedB !== playedA) return playedB - playedA
    const diffA = a.pointsFor - a.pointsAgainst
    const diffB = b.pointsFor - b.pointsAgainst
    if (diffB !== diffA) return diffB - diffA
    return (a.partnerId || '').localeCompare(b.partnerId || '')
  })
}

export default function MyPairsTab({ gameDayId, gameDay }) {
  const [roster, setRoster] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedAthleteId, setSelectedAthleteId] = useState(() => getStoredMyAthleteId())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [gameDayId, gameDay?.matchCount])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [athletesData, matchesData] = await Promise.all([
        athleteAPI.getForGameDay(gameDayId),
        matchAPI.getForGameDay(gameDayId),
      ])
      setRoster(athletesData)
      setMatches(matchesData)

      const storedId = getStoredMyAthleteId()
      const storedOnRoster = athletesData.some((a) => a.id === storedId)
      if (storedId && storedOnRoster) {
        setSelectedAthleteId(storedId)
      } else if (selectedAthleteId && !athletesData.some((a) => a.id === selectedAthleteId)) {
        setSelectedAthleteId('')
      }
    } catch (err) {
      console.error('Failed to load pair stats:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAthlete = (athleteId) => {
    setSelectedAthleteId(athleteId)
    setStoredMyAthleteId(athleteId)
  }

  const athletes = useMemo(() => {
    const map = {}
    roster.forEach((a) => {
      map[a.id] = a
    })
    return map
  }, [roster])

  const myMatches = useMemo(() => {
    if (!selectedAthleteId) return []
    return matches.filter((m) => athleteInMatch(m, selectedAthleteId))
  }, [matches, selectedAthleteId])

  const partnerStats = useMemo(() => {
    if (!selectedAthleteId) return []
    return buildPartnerStats(myMatches, selectedAthleteId)
  }, [myMatches, selectedAthleteId])

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name)),
    [roster]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 max-w-md" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 text-red-800 text-sm rounded">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <select
          id="my-pairs-athlete-select"
          value={selectedAthleteId}
          onChange={(e) => handleSelectAthlete(e.target.value)}
          className="w-full max-w-md border border-gray-200 px-3 py-2 text-sm rounded bg-white"
          aria-label="Select your name"
        >
          <option value="">Select your name</option>
          {sortedRoster.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedAthleteId && (
        <div className="border border-gray-200 p-8 text-center rounded">
          <p className="text-gray-600">Select your name to see how you went with each partner.</p>
        </div>
      )}

      {selectedAthleteId && partnerStats.length === 0 && (
        <div className="border border-gray-200 p-8 text-center rounded">
          <p className="text-gray-600">No pairings yet — matches will appear here once the draw is generated.</p>
        </div>
      )}

      {selectedAthleteId && partnerStats.length > 0 && (
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold">Partner</th>
                <th className="text-center p-3 font-semibold">W</th>
                <th className="text-center p-3 font-semibold">L</th>
                <th className="text-center p-3 font-semibold">+/-</th>
                <th className="text-center p-3 font-semibold">Win %</th>
              </tr>
            </thead>
            <tbody>
              {partnerStats.map((row) => {
                const played = row.wins + row.losses
                const diff = row.pointsFor - row.pointsAgainst
                const winPct = played > 0 ? Math.round((row.wins / played) * 100) : null
                const partnerName = athletes[row.partnerId]?.name || 'Unknown'

                return (
                  <tr key={row.partnerId} className="border-b border-gray-200 last:border-b-0">
                    <td className="p-3 font-medium">
                      {partnerName}
                      {row.upcoming > 0 && (
                        <span className="ml-2 text-xs font-normal text-amber-700">
                          {row.upcoming} upcoming
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center text-green-700 font-medium">{row.wins}</td>
                    <td className="p-3 text-center text-red-700 font-medium">{row.losses}</td>
                    <td
                      className={`p-3 text-center font-medium ${
                        diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {played > 0 ? `${diff > 0 ? '+' : ''}${diff}` : '–'}
                    </td>
                    <td className="p-3 text-center">
                      {winPct !== null ? `${winPct}%` : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
