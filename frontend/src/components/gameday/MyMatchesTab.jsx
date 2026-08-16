import { useState, useEffect, useMemo } from 'react'
import Skeleton from '../Skeleton'
import Modal from '../Modal'
import { AlertModal } from '../Alert'
import { athleteAPI, matchAPI } from '../../services/api'
import { getStoredMyAthleteId, setStoredMyAthleteId } from '../../utils/myAthleteStorage'

const DIVIDE_MACRO_ROUNDS = 3
const DIVIDE_GAMES_PER_ROUND = 3

function compareMatches(a, b) {
  if (a.round !== b.round) return a.round - b.round
  if ((a.group ?? 0) !== (b.group ?? 0)) return (a.group ?? 0) - (b.group ?? 0)
  if ((a.court ?? 0) !== (b.court ?? 0)) return (a.court ?? 0) - (b.court ?? 0)
  return a.id.localeCompare(b.id)
}

function getMatchLabel(match, gameDay) {
  const format = gameDay?.settings?.format
  if (format === 'divide') {
    return `Round ${match.round} · Game ${match.group}`
  }
  if (format === 'group') {
    return `Round ${match.round} · Group ${match.group}`
  }
  if (match.round === -1) return 'Semi-Finals'
  if (match.round === -2) return 'Finals'
  return `Round ${match.round}`
}

function getDivideSlotLabel(round, game) {
  return `Round ${round} · Game ${game}`
}

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

function computeGroupStats(groupMatches, athleteId) {
  const stats = { wins: 0, losses: 0, upcoming: 0, pointsFor: 0, pointsAgainst: 0 }

  for (const match of groupMatches) {
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

  return stats
}

function buildPartnerGroups(myMatches, athleteId, isDivideMode) {
  if (isDivideMode) {
    const groups = []

    for (let round = 1; round <= DIVIDE_MACRO_ROUNDS; round++) {
      const roundMatches = myMatches.filter((m) => m.round === round).sort(compareMatches)
      const partnerId = roundMatches.length > 0 ? getPartnerId(roundMatches[0], athleteId) : null
      const groupKey = partnerId ? `partner-${partnerId}-r${round}` : `round-${round}-pending`

      const items = []
      for (let game = 1; game <= DIVIDE_GAMES_PER_ROUND; game++) {
        const match = roundMatches.find((m) => m.group === game) ?? null
        items.push(
          match
            ? { type: 'match', match }
            : { type: 'blank', round, game }
        )
      }

      groups.push({
        groupKey,
        partnerId,
        round,
        matches: roundMatches,
        items,
        stats: computeGroupStats(roundMatches, athleteId),
      })
    }

    return groups
  }

  const byPartner = new Map()
  const order = []

  for (const match of [...myMatches].sort(compareMatches)) {
    const partnerId = getPartnerId(match, athleteId)
    if (!partnerId) continue

    if (!byPartner.has(partnerId)) {
      byPartner.set(partnerId, [])
      order.push(partnerId)
    }
    byPartner.get(partnerId).push(match)
  }

  return order.map((partnerId) => {
    const partnerMatches = byPartner.get(partnerId)
    return {
      groupKey: `partner-${partnerId}`,
      partnerId,
      round: null,
      matches: partnerMatches,
      items: partnerMatches.map((match) => ({ type: 'match', match })),
      stats: computeGroupStats(partnerMatches, athleteId),
    }
  })
}

function pickDefaultExpandedGroupKey(groups) {
  const active = groups.find(
    (g) => g.stats.upcoming > 0 || g.items.some((item) => item.type === 'blank')
  )
  if (active) return active.groupKey
  return groups[groups.length - 1]?.groupKey ?? null
}

function isDivideRoundComplete(allMatches, macroRound) {
  const roundMatches = allMatches.filter((m) => m.round === macroRound)
  if (roundMatches.length === 0) return false
  return roundMatches.every((m) => m.winner)
}

function getRankThroughRoundForDivideGroup(round, allMatches) {
  if (round <= 1) return 0
  if (isDivideRoundComplete(allMatches, round - 1)) return round - 1
  return 0
}

function computeSessionRanks(roster, allMatches, throughRound) {
  const athleteStats = new Map()
  for (const athlete of roster) {
    athleteStats.set(athlete.id, {
      id: athlete.id,
      wins: 0,
      pointsDiff: 0,
      seasonRank: athlete.rank ?? 9999,
    })
  }

  const relevant = allMatches.filter(
    (m) => m.winner && m.round > 0 && m.round <= throughRound
  )

  for (const match of relevant) {
    const scoreA = match.teamA.score ?? 0
    const scoreB = match.teamB.score ?? 0
    for (const playerId of match.teamA.players) {
      if (!athleteStats.has(playerId)) continue
      const entry = athleteStats.get(playerId)
      entry.pointsDiff += scoreA - scoreB
      if (match.winner === 'teamA') entry.wins += 1
    }
    for (const playerId of match.teamB.players) {
      if (!athleteStats.has(playerId)) continue
      const entry = athleteStats.get(playerId)
      entry.pointsDiff += scoreB - scoreA
      if (match.winner === 'teamB') entry.wins += 1
    }
  }

  const sorted = [...athleteStats.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff
    return a.seasonRank - b.seasonRank
  })

  const rankMap = new Map()
  sorted.forEach((entry, index) => {
    rankMap.set(entry.id, index + 1)
  })
  return rankMap
}

function buildRankMapForGroup(group, roster, allMatches, isDivideMode) {
  if (isDivideMode && group.round) {
    const throughRound = getRankThroughRoundForDivideGroup(group.round, allMatches)
    if (throughRound === 0) {
      return new Map(roster.map((a) => [a.id, a.rank]))
    }
    return computeSessionRanks(roster, allMatches, throughRound)
  }

  const maxRound = allMatches.reduce((max, m) => (m.round > max ? m.round : max), 0)
  if (maxRound <= 0) {
    return new Map(roster.map((a) => [a.id, a.rank]))
  }
  return computeSessionRanks(roster, allMatches, maxRound)
}

function formatNameWithRank(name, rank) {
  if (rank == null || rank === '') return name
  return (
    <>
      {name}
      <span className="text-gray-500 font-normal"> #{rank}</span>
    </>
  )
}

function getIncompleteCourtsForGame(allMatches, round, gameNumber) {
  return allMatches
    .filter((m) => m.round === round && m.group === gameNumber && m.court && !m.winner)
    .map((m) => m.court)
    .sort((a, b) => a - b)
}

function getBlankSlotWaitingCourts(allMatches, group, round, game) {
  if (game <= 1) return null

  const previousGameComplete = group.items.some(
    (item) =>
      item.type === 'match' &&
      item.match.round === round &&
      item.match.group === game - 1 &&
      item.match.winner
  )
  if (!previousGameComplete) return null

  const incompleteCourts = getIncompleteCourtsForGame(allMatches, round, game - 1)
  return incompleteCourts.length > 0 ? incompleteCourts : null
}

function formatWaitingOnCourts(courts) {
  return `Waiting on Courts ${courts.join(', ')}`
}

function BlankMatchSlot({ round, game, waitingCourts }) {
  return (
    <div className="border border-dashed border-gray-200 rounded p-3 bg-gray-50/40">
      <div className="text-xs text-gray-500 mb-3 flex justify-between items-start gap-2 flex-wrap">
        <span className="font-medium text-gray-600">{getDivideSlotLabel(round, game)}</span>
        {waitingCourts && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            {formatWaitingOnCourts(waitingCourts)}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center gap-3 p-2 rounded border border-dashed border-gray-200 bg-white">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Your team</p>
            <p className="font-medium text-gray-300">–</p>
          </div>
          <div className="h-8 w-14 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 flex-shrink-0">
            –
          </div>
        </div>

        <div className="text-center text-xs font-bold text-gray-300">vs</div>

        <div className="flex justify-between items-center gap-3 p-2 rounded border border-dashed border-gray-200 bg-white">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Opponents</p>
            <p className="font-medium text-gray-300">–</p>
          </div>
          <div className="h-8 w-14 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 flex-shrink-0">
            –
          </div>
        </div>
      </div>
    </div>
  )
}

function MatchCard({ match, athleteId, athletes, gameDay, onScoreClick, myRank, partnerRank }) {
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

  const scoreBody = (
    <>
      <div className="text-xs text-gray-600 mb-3 flex justify-between items-start gap-2 flex-wrap">
        <span className="font-medium text-gray-800">{getMatchLabel(match, gameDay)}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {gameDay?.settings?.format === 'divide' && match.court && (
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
              Court {match.court}
            </span>
          )}
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
              <span className="text-[#377850]">{formatNameWithRank(myName, myRank)}</span>
              {' & '}
              {formatNameWithRank(partnerName, partnerRank)}
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
    </>
  )

  if (!onScoreClick) {
    return <div className="border border-gray-200 rounded p-3">{scoreBody}</div>
  }

  return (
    <div className="border border-gray-200 rounded p-3">
      <div
        onClick={() => onScoreClick(match)}
        className="cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors p-2 -m-2 rounded"
      >
        {scoreBody}
        <div className="mt-3 pt-3 border-t border-gray-200 text-center text-sm text-gray-500">
          {hasScores ? 'Tap to edit score' : 'Tap to enter score'}
        </div>
      </div>
    </div>
  )
}

function PartnerGroup({
  group,
  partnerName,
  myName,
  myRank,
  partnerRank,
  isDivideMode,
  expanded,
  onToggle,
  athleteId,
  athletes,
  gameDay,
  onScoreClick,
  allMatches,
}) {
  const { stats } = group
  const played = stats.wins + stats.losses
  const diff = stats.pointsFor - stats.pointsAgainst
  const winPct = played > 0 ? Math.round((stats.wins / played) * 100) : null

  const title = partnerName ? (
    <>
      {formatNameWithRank(myName, myRank)}
      {' & '}
      {formatNameWithRank(partnerName, partnerRank)}
    </>
  ) : isDivideMode && group.round ? (
    <>
      {formatNameWithRank(myName, myRank)}
      <span className="text-gray-500 font-normal"> · Round {group.round}</span>
    </>
  ) : (
    formatNameWithRank(partnerName || 'Partner', partnerRank)
  )

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            <span className="text-green-700 font-medium">{stats.wins}W</span>
            {' · '}
            <span className="text-red-700 font-medium">{stats.losses}L</span>
            {played > 0 && (
              <>
                {' · '}
                <span className={diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}>
                  {diff > 0 ? '+' : ''}{diff} pts
                </span>
                {winPct !== null && <> · {winPct}% win</>}
              </>
            )}
            {stats.upcoming > 0 && (
              <span className="text-amber-700"> · {stats.upcoming} upcoming</span>
            )}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-gray-200 bg-white">
          {group.items.map((item) =>
            item.type === 'match' ? (
              <MatchCard
                key={item.match.id}
                match={item.match}
                athleteId={athleteId}
                athletes={athletes}
                gameDay={gameDay}
                onScoreClick={onScoreClick}
                myRank={myRank}
                partnerRank={partnerRank}
              />
            ) : (
              <BlankMatchSlot
                key={`blank-${item.round}-${item.game}`}
                round={item.round}
                game={item.game}
                waitingCourts={getBlankSlotWaitingCourts(allMatches, group, item.round, item.game)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

export default function MyMatchesTab({ gameDayId, gameDay, onUpdate }) {
  const [roster, setRoster] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedAthleteId, setSelectedAthleteId] = useState(() => getStoredMyAthleteId())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [tempScores, setTempScores] = useState({ teamA: '', teamB: '' })
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' })
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  const isDivideMode = gameDay?.settings?.format === 'divide'

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

  const getAthleteName = (athleteId) => athletes[athleteId]?.name || 'Unknown'

  const myMatches = useMemo(() => {
    if (!selectedAthleteId) return []
    return matches.filter((m) => athleteInMatch(m, selectedAthleteId)).sort(compareMatches)
  }, [matches, selectedAthleteId])

  const partnerGroups = useMemo(() => {
    if (!selectedAthleteId) return []
    return buildPartnerGroups(myMatches, selectedAthleteId, isDivideMode)
  }, [myMatches, selectedAthleteId, isDivideMode])

  const defaultExpandedKey = useMemo(
    () => pickDefaultExpandedGroupKey(partnerGroups),
    [partnerGroups]
  )

  useEffect(() => {
    if (defaultExpandedKey) {
      setExpandedGroups(new Set([defaultExpandedKey]))
    } else {
      setExpandedGroups(new Set())
    }
  }, [selectedAthleteId, defaultExpandedKey])

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name)),
    [roster]
  )

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const openScoreModal = (match) => {
    setSelectedMatch(match)
    setTempScores({
      teamA: match.teamA.score ?? '',
      teamB: match.teamB.score ?? '',
    })
    setIsModalOpen(true)
  }

  const closeScoreModal = () => {
    setIsModalOpen(false)
    setSelectedMatch(null)
    setTempScores({ teamA: '', teamB: '' })
  }

  const saveScore = async () => {
    if (!selectedMatch) return

    try {
      const response = await matchAPI.updateScore(selectedMatch.id, {
        teamA: tempScores.teamA !== '' ? parseInt(tempScores.teamA, 10) : null,
        teamB: tempScores.teamB !== '' ? parseInt(tempScores.teamB, 10) : null,
      })

      await loadData()
      closeScoreModal()
      if (onUpdate) onUpdate()

      let message = 'Score saved successfully'
      if (response?.divideAdvance?.advanced) {
        message = `Score saved. Game ${response.divideAdvance.game} is ready — opponents updated from the court ladder.`
      }

      setAlertModal({
        isOpen: true,
        title: 'Success',
        message,
        type: 'success',
      })
    } catch (err) {
      console.error('Failed to save score:', err)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to save score. Please try again.',
        type: 'error',
      })
    }
  }

  const getScoreModalSubtitle = (match) => {
    if (isDivideMode) {
      return getMatchLabel(match, gameDay)
    }
    if (gameDay?.settings?.format === 'group') {
      return `Round ${match.round} · Group ${match.group}`
    }
    if (match.round === -1) return 'Semi-Finals'
    if (match.round === -2) return 'Finals'
    return `Round ${match.round}`
  }

  const hasAnyScheduledMatches = partnerGroups.some((g) => g.matches.length > 0)

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
        <select
          id="my-athlete-select"
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
          <p className="text-gray-600">Select your name to see your matches.</p>
        </div>
      )}

      {selectedAthleteId && !hasAnyScheduledMatches && !isDivideMode && (
        <div className="border border-gray-200 p-8 text-center rounded">
          <p className="text-gray-600">You are not scheduled in any matches yet.</p>
        </div>
      )}

      {selectedAthleteId && (hasAnyScheduledMatches || isDivideMode) && (
        <div className="space-y-3">
          {partnerGroups.map((group) => {
            const rankMap = buildRankMapForGroup(group, roster, matches, isDivideMode)
            const myRank = rankMap.get(selectedAthleteId)
            const partnerRank = group.partnerId ? rankMap.get(group.partnerId) : null

            return (
              <PartnerGroup
                key={group.groupKey}
                group={group}
                partnerName={group.partnerId ? getAthleteName(group.partnerId) : null}
                myName={getAthleteName(selectedAthleteId)}
                myRank={myRank}
                partnerRank={partnerRank}
                isDivideMode={isDivideMode}
                expanded={expandedGroups.has(group.groupKey)}
                onToggle={() => toggleGroup(group.groupKey)}
                athleteId={selectedAthleteId}
                athletes={athletes}
                gameDay={gameDay}
                onScoreClick={openScoreModal}
                allMatches={matches}
              />
            )
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeScoreModal}>
        <h3 className="text-xl font-semibold mb-4">Enter Score</h3>

        {selectedMatch && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              {getScoreModalSubtitle(selectedMatch)}
            </div>

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
                onChange={(e) => setTempScores((prev) => ({ ...prev, teamA: e.target.value }))}
                className="w-full h-12 rounded border border-gray-200 bg-gray-100 text-center text-2xl font-semibold focus:outline-none focus:border-gray-200 focus:bg-white"
                placeholder="0"
                autoFocus
              />
            </div>

            <div className="text-center text-sm font-bold text-gray-400">VS</div>

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
                onChange={(e) => setTempScores((prev) => ({ ...prev, teamB: e.target.value }))}
                className="w-full h-12 rounded border border-gray-200 bg-gray-100 text-center text-2xl font-semibold focus:outline-none focus:border-gray-200 focus:bg-white"
                placeholder="0"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeScoreModal}
                className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveScore}
                className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium"
              >
                Save Score
              </button>
            </div>
          </div>
        )}
      </Modal>

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
