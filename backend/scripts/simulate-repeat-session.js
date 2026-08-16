#!/usr/bin/env node
/**
 * Simulate repeating an athlete's last game-day performance at current ratings.
 * Usage: node scripts/simulate-repeat-session.js "Michael Boss"
 */
import { query, closePool } from '../database/db.js'
import { calculateMatchAdjustments, formatRating } from '../lib/ratingEngine.js'
import { MPR_CONFIG } from '../config/mpr.js'

const name = process.argv[2] || 'Michael Boss'

const athletes = await query(
  `SELECT * FROM athletes WHERE name ILIKE $1 ORDER BY rated_matches_count DESC`,
  [name]
)
if (!athletes.rows.length) {
  console.error('Not found:', name)
  process.exit(1)
}
const hero = athletes.rows[0]

const lastSession = await query(
  `SELECT gd.id, gd.date, gd.venue, gd.points_to_win, gd.format
   FROM matches m
   JOIN gamedays gd ON gd.id = m.gameday_id
   WHERE m.winner IS NOT NULL
     AND ($1 IN (m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2))
   ORDER BY gd.date DESC, gd.id DESC
   LIMIT 1`,
  [hero.id]
)

if (!lastSession.rows.length) {
  console.error('No sessions found')
  process.exit(1)
}

const session = lastSession.rows[0]

const sessionMatches = await query(
  `SELECT m.*
   FROM matches m
   WHERE m.gameday_id = $1
     AND m.winner IS NOT NULL
     AND m.team_a_score IS NOT NULL
     AND m.team_b_score IS NOT NULL
     AND ($2 IN (m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2))
   ORDER BY m.round, m.match_group, m.id`,
  [session.id, hero.id]
)

const allIds = new Set()
for (const m of sessionMatches.rows) {
  for (const id of [m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2]) {
    if (id) allIds.add(id)
  }
}

const { rows: athleteRows } = await query(
  `SELECT * FROM athletes WHERE id = ANY($1)`,
  [[...allIds]]
)
const state = new Map(athleteRows.map((a) => [a.id, { ...a }]))

const gameDay = {
  format: session.format || 'group',
  points_to_win: session.points_to_win || 11,
}

const heroStart = parseFloat(state.get(hero.id).doubles_rating) || MPR_CONFIG.DEFAULT_RATING
const heroStartCount = parseInt(state.get(hero.id).rated_matches_count, 10) || 0

const details = []
let wins = 0
let losses = 0

for (const row of sessionMatches.rows) {
  const match = {
    id: `sim-${row.id}`,
    group: row.match_group,
    timestamp: row.timestamp || session.date,
    winner: row.winner === 'teamA' ? 'teamA' : 'teamB',
    teamA: {
      players: [row.team_a_player1, row.team_a_player2],
      score: row.team_a_score,
    },
    teamB: {
      players: [row.team_b_player1, row.team_b_player2],
      score: row.team_b_score,
    },
  }

  const athletesById = new Map(
    [...state.entries()].map(([id, a]) => [
      id,
      {
        ...a,
        doubles_rating: a.doubles_rating != null ? parseFloat(a.doubles_rating) : null,
        rated_matches_count: parseInt(a.rated_matches_count, 10) || 0,
      },
    ])
  )

  const adjustments = calculateMatchAdjustments(match, athletesById, gameDay, {
    recencyWeight: 1,
  })
  const heroAdj = adjustments.find((a) => a.athleteId === hero.id)
  if (!heroAdj) continue

  const onA = row.team_a_player1 === hero.id || row.team_a_player2 === hero.id
  const myScore = onA ? row.team_a_score : row.team_b_score
  const oppScore = onA ? row.team_b_score : row.team_a_score
  const won = heroAdj.delta > 0

  if (won) wins++
  else losses++

  const heroPlayer = state.get(hero.id)
  heroPlayer.doubles_rating = heroAdj.ratingAfter
  heroPlayer.rated_matches_count = heroAdj.ratedMatchesCount

  for (const adj of adjustments) {
    const p = state.get(adj.athleteId)
    p.doubles_rating = adj.ratingAfter
    p.rated_matches_count = adj.ratedMatchesCount
  }

  details.push({
    score: `${myScore}-${oppScore}`,
    result: won ? 'W' : 'L',
    delta: heroAdj.delta,
    mprAfter: heroAdj.ratingAfter,
  })
}

const heroEnd = parseFloat(state.get(hero.id).doubles_rating)
const net = heroEnd - heroStart

console.log(JSON.stringify({
  athlete: hero.name,
  sessionDate: session.date?.toISOString?.().slice(0, 10) ?? session.date,
  venue: session.venue,
  currentMpr: formatRating(hero.doubles_rating, hero.rated_matches_count),
  sessionRecord: `${wins}W-${losses}L`,
  matches: details.length,
  mprIfRepeated: heroEnd.toFixed(3),
  netChange: `${net >= 0 ? '+' : ''}${net.toFixed(3)}`,
  matchDetails: details,
}, null, 2))

await closePool()
