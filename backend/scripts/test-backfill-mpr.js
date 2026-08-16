#!/usr/bin/env node
/**
 * Smoke test: replay first N completed matches and verify no NaN ratings.
 * Usage: node scripts/test-backfill-mpr.js [limit]
 */
import { query, closePool } from '../database/db.js'
import { updateFromMatch } from '../lib/ratingService.js'
import { formatRating } from '../lib/ratingEngine.js'

const limit = parseInt(process.argv[2] || '25', 10)

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set — copy backend/.env.example to backend/.env')
    process.exit(1)
  }

  console.log(`\n🧪 MPR backfill smoke test (first ${limit} matches)\n`)

  await query('DELETE FROM rating_history')
  await query(
    `UPDATE athletes
     SET doubles_rating = NULL,
         rating_reliability = 0,
         rated_matches_count = 0,
         rating_updated_at = NULL`
  )

  const result = await query(
    `SELECT * FROM matches
     WHERE winner IS NOT NULL
       AND team_a_score IS NOT NULL
       AND team_b_score IS NOT NULL
     ORDER BY COALESCE(timestamp, created_at) ASC, id ASC
     LIMIT $1`,
    [limit]
  )

  const matches = result.rows.map((row) => ({
    id: row.id,
    gameDayId: row.gameday_id,
    round: row.round,
    group: row.match_group,
    court: row.court,
    teamA: {
      players: [row.team_a_player1, row.team_a_player2],
      score: row.team_a_score,
    },
    teamB: {
      players: [row.team_b_player1, row.team_b_player2],
      score: row.team_b_score,
    },
    winner: row.winner === 'teamA' ? 'teamA' : 'teamB',
    timestamp: row.timestamp,
  }))

  if (matches.length === 0) {
    console.error('❌ No completed matches found')
    process.exit(1)
  }

  let processed = 0
  for (const match of matches) {
    const updates = await updateFromMatch(match, { skipIdempotency: true, recencyWeight: 1 })
    if (updates.length !== 4) {
      console.error(`❌ Match ${match.id}: expected 4 updates, got ${updates.length}`)
      process.exit(1)
    }
    for (const u of updates) {
      if (!Number.isFinite(u.after) || !Number.isFinite(u.delta)) {
        console.error(`❌ Match ${match.id}: non-finite rating for ${u.name}`, u)
        process.exit(1)
      }
    }
    processed++
  }

  const bad = await query(
    `SELECT COUNT(*)::int AS count
     FROM athletes
     WHERE rated_matches_count > 0
       AND (
         doubles_rating IS NULL
         OR doubles_rating::text = 'NaN'
       )`
  )

  const nanCount = bad.rows[0].count
  if (nanCount > 0) {
    console.error(`❌ ${nanCount} athletes have invalid doubles_rating after replay`)
    process.exit(1)
  }

  const sample = await query(
    `SELECT name, doubles_rating, rated_matches_count
     FROM athletes
     WHERE rated_matches_count >= 3
     ORDER BY doubles_rating DESC
     LIMIT 8`
  )

  const spread = await query(
    `SELECT AVG(doubles_rating::float) AS avg,
            MIN(doubles_rating::float) AS min,
            MAX(doubles_rating::float) AS max,
            STDDEV(doubles_rating::float) AS stddev
     FROM athletes
     WHERE rated_matches_count >= 3`
  )

  console.log(`✅ Processed ${processed} matches — all ratings finite\n`)
  console.log('League spread (rated athletes):')
  const s = spread.rows[0]
  console.log(`  avg ${parseFloat(s.avg).toFixed(3)}  min ${parseFloat(s.min).toFixed(3)}  max ${parseFloat(s.max).toFixed(3)}  stddev ${parseFloat(s.stddev).toFixed(3)}\n`)
  console.log('Top rated athletes:')
  for (const row of sample.rows) {
    const mpr = formatRating(row.doubles_rating, row.rated_matches_count)
    console.log(`  ${row.name.padEnd(22)} MPR ${mpr}  (${row.rated_matches_count} matches)`)
  }
  console.log('\n✅ Backfill smoke test passed\n')
}

main()
  .catch((err) => {
    console.error('❌ Smoke test failed:', err.message)
    process.exit(1)
  })
  .finally(() => closePool())
