import '../lib/loadEnv.js'
import pg from 'pg'

const GAME_DAY_ID = 'gd-c1fc2f2d-61e6-43e7-bb76-051f3f3ddac3'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
})

const matches = await pool.query(
  `SELECT id, round, match_group, court, winner, team_a_score, team_b_score, created_at
   FROM matches WHERE gameday_id = $1
   ORDER BY round, match_group, court, created_at`,
  [GAME_DAY_ID]
)

console.log('Total:', matches.rowCount)
const byRG = {}
for (const m of matches.rows) {
  const k = `${m.round}-${m.match_group}`
  if (!byRG[k]) byRG[k] = []
  byRG[k].push(m)
}
for (const [k, ms] of Object.entries(byRG)) {
  console.log(`\n${k}: ${ms.length} matches`)
  for (const m of ms) {
    console.log(`  court ${m.court} ${m.id.slice(0, 20)}... winner=${m.winner} created=${m.created_at}`)
  }
}

await pool.end()
