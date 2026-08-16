import * as db from '../database/queries.js'
import { calculateMatchAdjustments, calculateReliability } from './ratingEngine.js'
import { MPR_CONFIG } from '../config/mpr.js'

/**
 * Apply MPR updates for a single completed match.
 * Returns rating updates for API response, or empty array if skipped.
 */
export async function updateFromMatch(match, options = {}) {
  if (!match?.winner || match.teamA?.score == null || match.teamB?.score == null) {
    return []
  }

  const skipIdempotency = options.skipIdempotency === true

  if (!skipIdempotency) {
    const alreadyRated = await db.hasRatingForMatch(match.id)
    if (alreadyRated) {
      return []
    }
  }

  const gameDay = await db.getGameDayById(match.gameDayId)
  if (!gameDay) return []

  const playerIds = [
    ...match.teamA.players,
    ...match.teamB.players,
  ].filter(Boolean)

  const athletes = await db.getAthletesByIds(playerIds)
  const athletesById = new Map(athletes.map((a) => [a.id, a]))

  const adjustments = calculateMatchAdjustments(match, athletesById, gameDay, options)
  if (adjustments.length === 0) return []

  const ratingUpdates = []

  for (const adj of adjustments) {
    await db.updateAthleteRating(adj.athleteId, {
      doublesRating: adj.ratingAfter,
      ratedMatchesCount: adj.ratedMatchesCount,
      ratingReliability: await computeAthleteReliability(adj.athleteId, adj.ratedMatchesCount),
    })

    await db.insertRatingHistory({
      athleteId: adj.athleteId,
      matchId: match.id,
      ratingBefore: adj.ratingBefore,
      ratingAfter: adj.ratingAfter,
      delta: adj.delta,
    })

    ratingUpdates.push({
      athleteId: adj.athleteId,
      name: adj.name,
      before: adj.ratingBefore,
      after: adj.ratingAfter,
      delta: adj.delta,
      displayRating: adj.displayRating,
    })
  }

  return ratingUpdates
}

async function computeAthleteReliability(athleteId, ratedMatchesCount) {
  const recentCount = await db.getRecentRatedMatchCount(
    athleteId,
    MPR_CONFIG.RECENT_MATCH_WINDOW_DAYS
  )
  return calculateReliability(Math.max(recentCount, ratedMatchesCount > 0 ? 1 : 0))
}

/**
 * Full backfill: reset all MPR data and replay every completed match chronologically.
 */
export async function backfillAllRatings() {
  await db.resetAllRatings()

  const matches = await db.getAllCompletedMatchesChronological()
  let processed = 0
  let totalUpdates = 0

  for (const match of matches) {
    const updates = await updateFromMatch(match, {
      skipIdempotency: true,
      recencyWeight: 1,
    })
    if (updates.length > 0) {
      processed++
      totalUpdates += updates.length
    }
  }

  const athletes = await db.getAllAthletes('active')
  const rated = athletes.filter((a) => (a.rated_matches_count ?? 0) >= MPR_CONFIG.NR_THRESHOLD)
  const nrCount = athletes.length - rated.length

  return {
    matchesProcessed: processed,
    totalUpdates,
    athletesRated: rated.length,
    nrCount,
    avgRating: rated.length > 0
      ? (rated.reduce((sum, a) => sum + parseFloat(a.doubles_rating), 0) / rated.length).toFixed(3)
      : null,
  }
}

/**
 * Re-process all ratings (used after score corrections).
 */
export async function reprocessFromMatch(_matchId) {
  return backfillAllRatings()
}

/**
 * Handle score update: new completion or correction.
 */
export async function handleScoreUpdate(match, previousMatch) {
  const wasCompleted = previousMatch?.winner != null
  const isCompleted = match?.winner != null

  if (!isCompleted) return []

  const scoresChanged = wasCompleted && (
    previousMatch.teamA.score !== match.teamA.score ||
    previousMatch.teamB.score !== match.teamB.score
  )

  if (scoresChanged) {
    await backfillAllRatings()
    return db.getRatingUpdatesForMatch(match.id)
  }

  if (wasCompleted) {
    return []
  }

  return updateFromMatch(match)
}
