import { v4 as uuidv4 } from 'uuid'
import * as db from '../database/queries.js'
import {
  pairProAm,
  pairEvenMatch,
  seedPairsToCourts,
  computeNextGameMatchups,
  sortAthletesForSessionStandings,
  areAllGamesComplete,
  getExpectedCourts,
  getDivideSessionState,
  canSwapRound1Partners,
  buildSwapUpdates,
} from './divideEngine.js'

const MACRO_ROUNDS = 3
const GAMES_PER_ROUND = 3

function buildMatchRecord(gameDayId, macroRound, gameNumber, court, teamAIds, teamBIds) {
  return {
    id: `match-${uuidv4()}`,
    gameDayId,
    round: macroRound,
    group: gameNumber,
    court,
    teamA: { players: teamAIds, score: null },
    teamB: { players: teamBIds, score: null },
    status: 'pending',
    winner: null,
    timestamp: null,
  }
}

async function loadAthletesWithSessionStats(gameDayId) {
  const athletes = await db.getGameDayAthletes(gameDayId)
  return Promise.all(
    athletes.map(async (athlete) => {
      const stats = await db.getGameDayAthleteStats(gameDayId, athlete.id)
      return { ...athlete, stats }
    })
  )
}

async function createMatchesFromCourtAssignments(gameDayId, macroRound, gameNumber, courtAssignments) {
  const created = []
  for (const assignment of courtAssignments) {
    const match = buildMatchRecord(
      gameDayId,
      macroRound,
      gameNumber,
      assignment.court,
      assignment.teamA.map((a) => a.id),
      assignment.teamB.map((a) => a.id)
    )
    await db.createMatch(match)
    created.push(match)
  }
  return created
}

export async function startDivideRound(gameDayId, roundNumber) {
  if (roundNumber < 1 || roundNumber > MACRO_ROUNDS) {
    return { error: 'Invalid round number', status: 400 }
  }

  const gameDay = await db.getGameDayById(gameDayId)
  if (!gameDay) {
    return { error: 'Game day not found', status: 404 }
  }
  if (gameDay.format !== 'divide') {
    return { error: 'This action is only for Divide & Conquer format', status: 400 }
  }

  const matches = await db.getMatchesByGameDay(gameDayId)
  const session = getDivideSessionState(gameDay.divide_current_round, matches)

  if (roundNumber === 1 && !session.canStartRound1) {
    return { error: 'Round 1 has already started or matches already exist', status: 400 }
  }
  if (roundNumber === 2 && !session.canStartRound2) {
    return { error: 'Complete all Round 1 games before starting Round 2', status: 400 }
  }
  if (roundNumber === 3 && !session.canStartRound3) {
    return { error: 'Complete all Round 2 games before starting Round 3', status: 400 }
  }

  const athletes = await db.getGameDayAthletes(gameDayId)
  if (athletes.length < 4 || athletes.length % 4 !== 0) {
    return {
      error: `Need a player count divisible by 4 (currently ${athletes.length})`,
      status: 400,
    }
  }

  await db.syncAthleteRanks()

  let sortedForPairing
  if (roundNumber === 1) {
    sortedForPairing = [...athletes].sort((a, b) => a.rank - b.rank)
  } else {
    const withStats = await loadAthletesWithSessionStats(gameDayId)
    sortedForPairing = sortAthletesForSessionStandings(withStats)
  }

  const pairs = roundNumber === 1 ? pairProAm(sortedForPairing) : pairEvenMatch(sortedForPairing)
  const courtAssignments = seedPairsToCourts(pairs)
  const created = await createMatchesFromCourtAssignments(gameDayId, roundNumber, 1, courtAssignments)

  await db.updateGameDay(gameDayId, {
    divideCurrentRound: roundNumber,
    status: 'in-progress',
  })

  return {
    success: true,
    round: roundNumber,
    game: 1,
    matchesGenerated: created.length,
    matches: created,
  }
}

export async function tryAdvanceDivideAfterScore(gameDayId, completedMatch) {
  const gameDay = await db.getGameDayById(gameDayId)
  if (!gameDay || gameDay.format !== 'divide') {
    return { advanced: false }
  }

  const macroRound = completedMatch.round
  const gameNumber = completedMatch.group

  if (gameNumber >= GAMES_PER_ROUND) {
    if (macroRound === MACRO_ROUNDS) {
      const allMatches = await db.getMatchesByGameDay(gameDayId)
      const session = getDivideSessionState(gameDay.divide_current_round, allMatches)
      if (session.sessionComplete) {
        await db.updateGameDay(gameDayId, { status: 'completed' })
        await db.syncAthleteRanks()
      }
    }
    return { advanced: false }
  }

  const allMatches = await db.getMatchesByGameDay(gameDayId)
  if (!areAllGamesComplete(allMatches, macroRound, gameNumber)) {
    return { advanced: false, waitingForOtherCourts: true }
  }

  const completedGameMatches = allMatches.filter(
    (m) => m.round === macroRound && m.group === gameNumber && m.winner !== null
  )

  const athleteCount = await db.getGameDayAthleteCount(gameDayId)
  const numCourts = getExpectedCourts(athleteCount)
  const nextGameNumber = gameNumber + 1
  const matchups = computeNextGameMatchups(completedGameMatches, numCourts)

  const created = []
  for (const matchup of matchups) {
    const match = buildMatchRecord(
      gameDayId,
      macroRound,
      nextGameNumber,
      matchup.court,
      matchup.teamA,
      matchup.teamB
    )
    await db.createMatch(match)
    created.push(match)
  }

  return {
    advanced: true,
    round: macroRound,
    game: nextGameNumber,
    matchesGenerated: created.length,
    matches: created,
  }
}

export async function swapRound1Partners(gameDayId, player1Id, player2Id) {
  const gameDay = await db.getGameDayById(gameDayId)
  if (!gameDay) {
    return { error: 'Game day not found', status: 404 }
  }
  if (gameDay.format !== 'divide') {
    return { error: 'This action is only for Divide & Conquer format', status: 400 }
  }

  const matches = await db.getMatchesByGameDay(gameDayId)
  if (!canSwapRound1Partners(matches)) {
    return {
      error: 'Partner swaps are only allowed for Round 1 Game 1 before any scores are entered',
      status: 400,
    }
  }

  const game1Matches = matches.filter((m) => m.round === 1 && m.group === 1)

  const athletes = await db.getGameDayAthletes(gameDayId)
  const athleteIds = new Set(athletes.map((a) => a.id))
  if (!athleteIds.has(player1Id) || !athleteIds.has(player2Id)) {
    return { error: 'Both players must be on this game day roster', status: 400 }
  }

  let updates
  try {
    updates = buildSwapUpdates(game1Matches, player1Id, player2Id)
  } catch (err) {
    return { error: err.message, status: 400 }
  }

  for (const { matchId, players } of updates) {
    await db.updateMatchPlayers(matchId, players)
  }

  const updatedMatches = await db.getMatchesByGameDay(gameDayId, { round: 1, group: 1 })

  return {
    success: true,
    matchesUpdated: updates.length,
    matches: updatedMatches,
  }
}

export { getDivideSessionState, MACRO_ROUNDS, GAMES_PER_ROUND, canSwapRound1Partners }
