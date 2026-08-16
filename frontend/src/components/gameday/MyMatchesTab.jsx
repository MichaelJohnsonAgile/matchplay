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

function buildDivideMatchSlots(myMatches) {
  const byKey = new Map()
  for (const match of myMatches) {
    byKey.set(`${match.round}-${match.group}`, match)
  }

  const slots = []
  for (let round = 1; round <= DIVIDE_MACRO_ROUNDS; round++) {
    for (let game = 1; game <= DIVIDE_GAMES_PER_ROUND; game++) {
      slots.push({
        round,
        game,
        match: byKey.get(`${round}-${game}`) || null,
      })
    }
  }
  return slots
}

function BlankMatchSlot({ round, game }) {
  return (
    <div className="border border-dashed border-gray-200 rounded p-3 bg-gray-50/40">
      <div className="text-xs text-gray-500 mb-3">
        <span className="font-medium text-gray-600">{getDivideSlotLabel(round, game)}</span>
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

function MatchCard({ match, athleteId, athletes, gameDay, onScoreClick }) {
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

  const divideSlots = useMemo(() => {
    if (!isDivideMode || !selectedAthleteId) return []
    return buildDivideMatchSlots(myMatches)
  }, [isDivideMode, selectedAthleteId, myMatches])

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

      {selectedAthleteId && isDivideMode && (
        <div className="space-y-3">
          {divideSlots.map(({ round, game, match }) =>
            match ? (
              <MatchCard
                key={`${round}-${game}`}
                match={match}
                athleteId={selectedAthleteId}
                athletes={athletes}
                gameDay={gameDay}
                onScoreClick={openScoreModal}
              />
            ) : (
              <BlankMatchSlot key={`${round}-${game}`} round={round} game={game} />
            )
          )}
        </div>
      )}

      {selectedAthleteId && !isDivideMode && myMatches.length === 0 && (
        <div className="border border-gray-200 p-8 text-center rounded">
          <p className="text-gray-600">You are not scheduled in any matches yet.</p>
        </div>
      )}

      {selectedAthleteId && !isDivideMode && upcomingMatches.length > 0 && (
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
                onScoreClick={openScoreModal}
              />
            ))}
          </div>
        </section>
      )}

      {selectedAthleteId && !isDivideMode && completedMatches.length > 0 && (
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
                onScoreClick={openScoreModal}
              />
            ))}
          </div>
        </section>
      )}

      {selectedAthleteId && !isDivideMode && myMatches.length > 0 && upcomingMatches.length === 0 && completedMatches.length > 0 && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          All your matches are complete for this session.
        </p>
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
