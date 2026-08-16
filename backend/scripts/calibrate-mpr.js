#!/usr/bin/env node
/** Pull athlete match stats for MPR calibration */
import { query, closePool } from '../database/db.js'

const name = process.argv[2] || 'Michael Boss'

const athlete = await query('SELECT * FROM athletes WHERE name ILIKE $1', [name])
if (!athlete.rows[0]) {
  console.error('Not found:', name)
  process.exit(1)
}
const id = athlete.rows[0].id

const matches = await query(
  `SELECT m.*, gd.points_to_win, gd.format
   FROM matches m
   LEFT JOIN gamedays gd ON gd.id = m.gameday_id
   WHERE m.winner IS NOT NULL
     AND m.team_a_score IS NOT NULL
     AND m.team_b_score IS NOT NULL
     AND ($1 IN (m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2))
   ORDER BY COALESCE(m.timestamp, m.created_at), m.id`,
  [id]
)

let wins = 0
let losses = 0
let pointsFor = 0
let pointsAgainst = 0
const margins = []

for (const m of matches.rows) {
  const onA = m.team_a_player1 === id || m.team_a_player2 === id
  const myScore = onA ? m.team_a_score : m.team_b_score
  const oppScore = onA ? m.team_b_score : m.team_a_score
  const won = (onA && m.winner === 'teamA') || (!onA && m.winner === 'teamB')
  if (won) wins++
  else losses++
  pointsFor += myScore
  pointsAgainst += oppScore
  margins.push(myScore - oppScore)
}

const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

console.log(JSON.stringify({
  name: athlete.rows[0].name,
  id,
  currentMpr: athlete.rows[0].doubles_rating,
  ratedMatches: athlete.rows[0].rated_matches_count,
  matches: matches.rows.length,
  wins,
  losses,
  winPct: (wins / matches.rows.length * 100).toFixed(1) + '%',
  avgMargin: avgMargin.toFixed(2),
  pointsFor,
  pointsAgainst,
}, null, 2))

// League-wide spread
const spread = await query(
  `SELECT MIN(doubles_rating::float) AS min, MAX(doubles_rating::float) AS max,
          AVG(doubles_rating::float) AS avg, STDDEV(doubles_rating::float) AS stddev
   FROM athletes WHERE rated_matches_count >= 3`
)
console.log('\nLeague spread (rated):', spread.rows[0])

await closePool()
