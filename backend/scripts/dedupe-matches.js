import '../lib/loadEnv.js'
import pg from 'pg'

const GAME_DAY_ID = process.argv[2] || 'gd-c1fc2f2d-61e6-43e7-bb76-051f3f3ddac3'
const DRY_RUN = process.argv.includes('--dry-run')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
})

function hasScore(m) {
  return m.winner != null || (m.team_a_score != null && m.team_b_score != null)
}

const { rows } = await pool.query(
  `SELECT id, round, match_group, court, winner, team_a_score, team_b_score, created_at
   FROM matches WHERE gameday_id = $1
   ORDER BY round, match_group, court, created_at`,
  [GAME_DAY_ID]
)

const groups = new Map()
for (const m of rows) {
  const key = `${m.round}|${m.match_group}|${m.court}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(m)
}

const toDelete = []
const toKeep = []

for (const [key, ms] of groups) {
  if (ms.length === 1) {
    toKeep.push(ms[0].id)
    continue
  }

  const scored = ms.filter(hasScore)
  const unscored = ms.filter((m) => !hasScore(m))

  if (scored.length === 0) {
    toKeep.push(ms[0].id)
    toDelete.push(...ms.slice(1).map((m) => m.id))
    console.log(`${key}: no scores — keeping oldest ${ms[0].id}, deleting ${ms.length - 1}`)
    continue
  }

  if (scored.length === 1) {
    toKeep.push(scored[0].id)
    toDelete.push(...ms.filter((m) => m.id !== scored[0].id).map((m) => m.id))
    console.log(`${key}: keeping scored ${scored[0].id}, deleting ${ms.length - 1}`)
    continue
  }

  scored.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  toKeep.push(scored[0].id)
  toDelete.push(...ms.filter((m) => m.id !== scored[0].id).map((m) => m.id))
  console.log(`${key}: multiple scored — keeping ${scored[0].id}, deleting ${ms.length - 1}`)
}

console.log(`\nKeep: ${toKeep.length}, Delete: ${toDelete.length}`)

if (toDelete.length > 0 && !DRY_RUN) {
  const result = await pool.query(
    'DELETE FROM matches WHERE id = ANY($1::text[])',
    [toDelete]
  )
  console.log(`Deleted ${result.rowCount} duplicate matches`)
}

await pool.end()
