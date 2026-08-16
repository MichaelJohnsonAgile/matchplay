import { useState, useEffect, useMemo } from 'react'
import Skeleton from '../Skeleton'
import { athleteAPI, matchAPI } from '../../services/api'
import { getStoredMyAthleteId, setStoredMyAthleteId } from '../../utils/myAthleteStorage'

function compareMatches(a, b) {
  if (a.round !== b.round) return a.round - b.round
  if ((a.group ?? 0) !== (b.group ?? 0)) return (a.group ?? 0) - (b.group ?? 0)
  if ((a.court ?? 0) !== (b.court ?? 0)) return (a.court ?? 0) - (b.court ?? 0)
  return a.id.localeCompare(b.id)
}

function getMatchLabel(match, gameDay) {
  const format = gameDay?.settings?.format
  if (format === 'divide') {
    const parts = [`Round ${match.round}`, `Game ${match.group}`]
    if (match.court) parts.push(`Court ${match.court}`)
    return parts.join(' · ')
  }
  if (format === 'group') {
    return `Round ${match.round} · Group ${match.group}`
  }
  if (match.round === -1) return 'Semi-Finals'
  if (match.round === -2) return 'Finals'
  return `Round ${match.round}`
}

function athleteInMatch(match, athleteId) {
  if (!athleteId) return false
  return (
    match.teamA.players.includes(athleteId) ||
    match.teamB.players.includes(athleteId)
  )
}

function MatchCard({ match, athleteId, athletes, gameDay }) {
  const onTeamA = match.teamA.players.includes(athleteId)
  const myTeam = onTeamA ? match.teamA : match.teamB
  const oppTeam = onTeamA ? match.teamB : match.teamA
  const hasScores = myTeam.score !== null && oppTeam.score !== null
  const myWins = hasScores && match.winner === (onTeamA ? 'teamA' : 'teamB')
  const myLosses = hasScores && match.winner && !myWins

  const partnerId = myTeam.players.find((id) => id !== athleteId)
  const partnerName = athletes[partnerId]?.name || 'Unknown'
  const myName = athletes[athleteId]?.name || 'You'

  const oppNames = oppTeam.players
    .map((id) => athletes[id]?.name || 'Unknown')
    .join(' & ')

  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="text-xs text-gray-600 mb-3 flex justify-between items-start gap-2 flex-wrap">
        <span className="font-medium text-gray-800">{getMatchLabel(match, gameDay)}</span>
        {hasScores && (
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold ${
              myWins ? 'bg-green-100 text-green-800' : myLosses ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {myWins ? 'Win' : myLosses ? 'Loss' : 'Played'}
          </span>
        )}
        {!hasScores && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            Upcoming
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div
          className={`flex justify-between items-center gap-3 p-2 rounded ${
            myWins ? 'bg-green-50 border border-green-200' : myLosses ? 'bg-red-50 border border-red-100' : 'bg-[#377850]/5 border border-[#377850]/20'
          }`}
        >
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Your team</p>
            <p className="font-medium">
              <span className="text-[#377850]">{myName}</span>
              {' & '}
              {partnerName}
            </p>
          </div>
          <div className="h-8 w-14 rounded border border-gray-200 bg-white flex items-center justify-center font-semibold flex-shrink-0">
            {myTeam.score !== null ? myTeam.score : '–'}
          </div>
        </div>

        <div className="text-center text-xs font-bold text-gray-400">vs</div>

        <div
          className={`flex justify-between items-center gap-3 p-2 rounded ${
            myLosses ? 'bg-green-50 border border-green-200' : myWins ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Opponents</p>
            <p className="font-medium">{oppNames}</p>
          </div>
          <div className="h-8 w-14 rounded border border-gray-200 bg-white flex items-center justify-center font-semibold flex-shrink-0">
            {oppTeam.score !== null ? oppTeam.score : '–'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyMatchesTab({ gameDayId, gameDay }) {
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
      console.error('Failed to load my matches:', err)
      setError(err.message || 'Failed to load matches')
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
    return matches.filter((m) => athleteInMatch(m, selectedAthleteId)).sort(compareMatches)
  }, [matches, selectedAthleteId])

  const { upcomingMatches, completedMatches } = useMemo(() => {
    const upcoming = []
    const completed = []
    for (const match of myMatches) {
      if (match.winner) {
        completed.push(match)
      } else {
        upcoming.push(match)
      }
    }
    return { upcomingMatches: upcoming, completedMatches: [...completed].reverse() }
  }, [myMatches])

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name)),
    [roster]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 max-w-md" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
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
        <label htmlFor="my-athlete-select" className="block text-sm font-medium mb-1">
          I am…
        </label>
        <select
          id="my-athlete-select"
          value={selectedAthleteId}
          onChange={(e) => handleSelectAthlete(e.target.value)}
          className="w-full max-w-md border border-gray-200 px-3 py-2 text-sm rounded bg-white"
        >
          <option value="">Select your name</option>
          {sortedRoster.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
            </option>
          ))}
        </select>
        {selectedAthleteId && (
          <p className="text-xs text-gray-500 mt-1">
            Your selection is saved for next time.
          </p>
        )}
      </div>

      {!selectedAthleteId && (
        <div className="border border-gray-200 p-8 text-center rounded">
          <p className="text-gray-600">Select your name to see your matches.</p>
        </div>
      )}

      {selectedAthleteId && myMatches.length === 0 && (
        <div className="border border-gray-200 p-8 text-center rounded">
          <p className="text-gray-600">You are not scheduled in any matches yet.</p>
        </div>
      )}

      {selectedAthleteId && upcomingMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">
            Upcoming ({upcomingMatches.length})
          </h3>
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                athleteId={selectedAthleteId}
                athletes={athletes}
                gameDay={gameDay}
              />
            ))}
          </div>
        </section>
      )}

      {selectedAthleteId && completedMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">
            Previous ({completedMatches.length})
          </h3>
          <div className="space-y-3">
            {completedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                athleteId={selectedAthleteId}
                athletes={athletes}
                gameDay={gameDay}
              />
            ))}
          </div>
        </section>
      )}

      {selectedAthleteId && myMatches.length > 0 && upcomingMatches.length === 0 && completedMatches.length > 0 && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          All your matches are complete for this session.
        </p>
      )}
    </div>
  )
}
