import '../lib/loadEnv.js'
import { v4 as uuidv4 } from 'uuid'
import * as db from '../database/queries.js'
import {
  computeNextGameMatchups,
  getExpectedCourts,
} from '../lib/divideEngine.js'

const GAME_DAY_ID = process.argv[2] || 'gd-c1fc2f2d-61e6-43e7-bb76-051f3f3ddac3'
const MACRO_ROUND = parseInt(process.argv[3] || '1', 10)
const GAME_NUMBER = parseInt(process.argv[4] || '3', 10)
const FROM_GAME = GAME_NUMBER - 1

function oneMatchPerCourt(matches) {
  const byCourt = new Map()
  for (const m of matches) {
    const existing = byCourt.get(m.court)
    if (!existing || (m.winner && !existing.winner)) {
      byCourt.set(m.court, m)
    }
  }
  return [...byCourt.values()]
}

const allMatches = await db.getMatchesByGameDay(GAME_DAY_ID)
const athleteCount = await db.getGameDayAthleteCount(GAME_DAY_ID)
const numCourts = getExpectedCourts(athleteCount)

const gameMatches = allMatches.filter((m) => m.round === MACRO_ROUND && m.group === GAME_NUMBER)
const existingCourts = new Set(gameMatches.map((m) => m.court))

console.log(`Round ${MACRO_ROUND} Game ${GAME_NUMBER}: ${gameMatches.length}/${numCourts} courts`)

if (existingCourts.size >= numCourts) {
  console.log('Already complete')
  process.exit(0)
}

const priorComplete = oneMatchPerCourt(
  allMatches.filter(
    (m) => m.round === MACRO_ROUND && m.group === FROM_GAME && m.winner != null
  )
)

if (priorComplete.length < numCourts) {
  console.error(`Game ${FROM_GAME} not complete (${priorComplete.length}/${numCourts})`)
  process.exit(1)
}

const matchups = computeNextGameMatchups(priorComplete, numCourts)
const created = []

for (const matchup of matchups) {
  if (existingCourts.has(matchup.court)) {
    console.log(`  court ${matchup.court}: already exists, skip`)
    continue
  }

  const match = {
    id: `match-${uuidv4()}`,
    gameDayId: GAME_DAY_ID,
    round: MACRO_ROUND,
    group: GAME_NUMBER,
    court: matchup.court,
    teamA: { players: matchup.teamA, score: null },
    teamB: { players: matchup.teamB, score: null },
    status: 'pending',
    winner: null,
    timestamp: null,
  }
  await db.createMatch(match)
  created.push(match)
  console.log(`  court ${matchup.court}: created ${match.id}`)
}

console.log(`\nCreated ${created.length} matches for Game ${GAME_NUMBER}`)
process.exit(0)
