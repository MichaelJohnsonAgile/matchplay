import '../lib/loadEnv.js'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
})

const gds = await pool.query(`
  SELECT id, date, venue, status, format, divide_current_round
  FROM gamedays
  WHERE date::date = CURRENT_DATE
  ORDER BY date
`)
console.log('Game days today:', gds.rows.length)
console.log(JSON.stringify(gds.rows, null, 2))

for (const gd of gds.rows) {
  const matches = await pool.query(
    `SELECT id, round, match_group, court,
            team_a_player1, team_a_player2, team_b_player1, team_b_player2,
            team_a_score, team_b_score, winner, status, timestamp
     FROM matches
     WHERE gameday_id = $1
     ORDER BY round, match_group, court, id`,
    [gd.id]
  )
  console.log(`\nGD ${gd.id} (${gd.format}): ${matches.rowCount} matches`)

  const byRoundGroup = {}
  for (const m of matches.rows) {
    const rg = `${m.round}-${m.match_group}`
    if (!byRoundGroup[rg]) byRoundGroup[rg] = []
    byRoundGroup[rg].push(m)
  }
  for (const [rg, ms] of Object.entries(byRoundGroup)) {
    if (ms.length > getExpectedCourtCount(gd, ms)) {
      console.log(`  EXTRA matches for round-game ${rg}: ${ms.length} (ids: ${ms.map((m) => m.id).join(', ')})`)
    }
  }

  const keyCounts = {}
  for (const m of matches.rows) {
    const key = [m.round, m.match_group, m.court, m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2].join('|')
    if (!keyCounts[key]) keyCounts[key] = []
    keyCounts[key].push(m)
  }
  for (const [key, ids] of Object.entries(keyCounts)) {
    if (ids.length > 1) {
      console.log(`  EXACT DUP key=${key} ids=${ids.join(', ')}`)
    }
  }
}

function getExpectedCourtCount(gd, ms) {
  const courts = new Set(ms.map((m) => m.court))
  return courts.size
}

await pool.end()
