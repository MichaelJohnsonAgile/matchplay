#!/usr/bin/env node
import { query, closePool } from '../database/db.js'
import { formatRating } from '../lib/ratingEngine.js'
import { getSkillBand } from '../config/mpr.js'

async function exportMprTable() {
  const result = await query(
    `SELECT id, name, rank, doubles_rating, rating_reliability, rated_matches_count
     FROM athletes
     WHERE status = 'active'
     ORDER BY doubles_rating DESC NULLS LAST, name ASC`
  )

  const rows = result.rows.map((a) => ({
    name: a.name,
    seasonRank: a.rank,
    mpr: formatRating(
      a.doubles_rating != null ? parseFloat(a.doubles_rating) : null,
      parseInt(a.rated_matches_count) || 0
    ),
    reliability: `${parseInt(a.rating_reliability) || 0}%`,
    matches: parseInt(a.rated_matches_count) || 0,
    skillBand: getSkillBand(
      a.doubles_rating != null ? parseFloat(a.doubles_rating) : null
    ),
  }))

  console.log('\nMatchplay Rating (MPR) — all active athletes\n')
  console.table(rows)

  const rated = rows.filter((r) => r.mpr !== 'NR')
  if (rated.length > 0) {
    const avg =
      rated.reduce((sum, r) => sum + parseFloat(r.mpr), 0) / rated.length
    console.log(`Rated athletes: ${rated.length} / ${rows.length}`)
    console.log(`Average MPR (rated only): ${avg.toFixed(3)}`)
    console.log(`NR athletes: ${rows.length - rated.length}\n`)
  }

  return rows
}

exportMprTable()
  .catch((err) => {
    console.error('Failed to export MPR:', err.message)
    process.exit(1)
  })
  .finally(() => closePool())
