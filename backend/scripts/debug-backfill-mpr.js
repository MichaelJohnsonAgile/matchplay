#!/usr/bin/env node
import { query, closePool } from '../database/db.js'
import { updateFromMatch } from '../lib/ratingService.js'

const limit = parseInt(process.argv[2] || '25', 10)

function formatMatch(row) {
  return {
    id: row.id,
    gameDayId: row.gameday_id,
    group: row.match_group,
    winner: row.winner === 'teamA' ? 'teamA' : 'teamB',
    teamA: {
      players: [row.team_a_player1, row.team_a_player2],
      score: row.team_a_score,
    },
    teamB: {
      players: [row.team_b_player1, row.team_b_player2],
      score: row.team_b_score,
    },
    timestamp: row.timestamp,
  }
}

async function main() {
  await query('DELETE FROM rating_history')
  await query(
    `UPDATE athletes SET doubles_rating=NULL, rated_matches_count=0, rating_reliability=0`
  )

  const { rows } = await query(
    `SELECT * FROM matches
     WHERE winner IS NOT NULL AND team_a_score IS NOT NULL
     ORDER BY COALESCE(timestamp, created_at), id
     LIMIT $1`,
    [limit]
  )

  for (const row of rows) {
    const match = formatMatch(row)
    const updates = await updateFromMatch(match, { skipIdempotency: true })
    for (const u of updates) {
      if (!Number.isFinite(u.after)) {
        console.log('Non-finite update:', match.id, match, u)
        process.exit(1)
      }
    }
  }

  const nullRatings = await query(
    `SELECT name, doubles_rating, rated_matches_count
     FROM athletes WHERE rated_matches_count > 0 AND doubles_rating IS NULL`
  )
  console.log('NULL with matches:', nullRatings.rows.length, nullRatings.rows.slice(0, 5))

  const athletes = await query(
    `SELECT name, doubles_rating, rated_matches_count FROM athletes WHERE rated_matches_count > 0 LIMIT 5`
  )
  console.log('Sample stored ratings:', athletes.rows)
}

main().finally(() => closePool())
