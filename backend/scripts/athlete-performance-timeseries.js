#!/usr/bin/env node
/**
 * Performance timeseries for an athlete.
 * Usage: node scripts/athlete-performance-timeseries.js "Michael Johnson"
 */
import { query, closePool } from '../database/db.js'
import { formatRating } from '../lib/ratingEngine.js'

const name = process.argv[2] || 'Michael Johnson'

const athlete = await query('SELECT * FROM athletes WHERE name ILIKE $1 ORDER BY rated_matches_count DESC', [name])
if (!athlete.rows.length) {
  console.error('Athlete not found:', name)
  process.exit(1)
}

const a = athlete.rows[0]
if (athlete.rows.length > 1) {
  console.error(`Warning: ${athlete.rows.length} athletes match "${name}" — using ${a.id} (${a.rated_matches_count} matches)\n`)
}

const history = await query(
  `SELECT rh.rating_before, rh.rating_after, rh.delta,
          m.id AS match_id, m.team_a_score, m.team_b_score, m.winner,
          m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2,
          COALESCE(m.timestamp, m.created_at) AS played_at,
          gd.date AS gameday_date, gd.venue
   FROM rating_history rh
   INNER JOIN matches m ON m.id = rh.match_id
   LEFT JOIN gamedays gd ON gd.id = m.gameday_id
   WHERE rh.athlete_id = $1
   ORDER BY COALESCE(m.timestamp, m.created_at) ASC, m.id ASC`,
  [a.id]
)

let wins = 0
let losses = 0
const rows = history.rows.map((row, index) => {
  const onA = row.team_a_player1 === a.id || row.team_a_player2 === a.id
  const myScore = onA ? row.team_a_score : row.team_b_score
  const oppScore = onA ? row.team_b_score : row.team_a_score
  const won = (onA && row.winner === 'teamA') || (!onA && row.winner === 'teamB')
  if (won) wins++
  else losses++

  const date = row.gameday_date || row.played_at
  const dateStr = date ? new Date(date).toISOString().slice(0, 10) : '?'

  return {
    match: index + 1,
    date: dateStr,
    venue: row.venue || '',
    result: won ? 'W' : 'L',
    score: `${myScore}-${oppScore}`,
    margin: myScore - oppScore,
    mprBefore: parseFloat(row.rating_before).toFixed(3),
    delta: `${parseFloat(row.delta) >= 0 ? '+' : ''}${parseFloat(row.delta).toFixed(3)}`,
    mprAfter: parseFloat(row.rating_after).toFixed(3),
  }
})

console.log(`\n${a.name} — performance timeseries`)
console.log(`Current MPR: ${formatRating(a.doubles_rating, a.rated_matches_count)}  |  Record: ${wins}W-${losses}L  |  Matches: ${rows.length}\n`)

if (rows.length === 0) {
  console.log('No rating history found.')
} else {
  // Session rollup
  const sessions = new Map()
  for (const row of rows) {
    const key = row.date
    if (!sessions.has(key)) {
      sessions.set(key, { date: key, wins: 0, losses: 0, mprStart: row.mprBefore, mprEnd: row.mprAfter })
    }
    const s = sessions.get(key)
    if (row.result === 'W') s.wins++
    else s.losses++
    s.mprEnd = row.mprAfter
  }
  console.log('By session (game day):')
  console.table(
    [...sessions.values()].map((s) => ({
      date: s.date,
      record: `${s.wins}W-${s.losses}L`,
      mprStart: s.mprStart,
      mprEnd: s.mprEnd,
      sessionNet: `${parseFloat(s.mprEnd) - parseFloat(s.mprStart) >= 0 ? '+' : ''}${(parseFloat(s.mprEnd) - parseFloat(s.mprStart)).toFixed(3)}`,
    }))
  )

  console.log('\nMatch-by-match:')
  console.table(rows)
}

await closePool()
