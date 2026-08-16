import { MPR_CONFIG } from '../config/mpr.js'

const { MIN_RATING, MAX_RATING, DEFAULT_RATING, NR_THRESHOLD, BASE_K, ELO_SCALE } = MPR_CONFIG

function toInt(value) {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

function toFloat(value) {
  const n = parseFloat(value)
  return Number.isNaN(n) ? null : n
}

export function normalizeAthleteForRating(athlete) {
  if (!athlete) return athlete
  const doublesRating = toFloat(athlete.doubles_rating)
  return {
    ...athlete,
    doubles_rating: doublesRating,
    rated_matches_count: toInt(athlete.rated_matches_count),
  }
}

export function clampRating(rating) {
  return Math.max(MIN_RATING, Math.min(MAX_RATING, rating))
}

export function getEffectiveRating(rating) {
  const numeric = toFloat(rating)
  if (numeric == null) return DEFAULT_RATING
  return numeric
}

export function predictWinProbability(teamRatingA, teamRatingB) {
  return 1 / (1 + Math.pow(10, (teamRatingB - teamRatingA) / ELO_SCALE))
}

export function predictExpectedPoints(teamRatingA, teamRatingB, pointsToWin, actualScoreA, actualScoreB) {
  const winProbA = predictWinProbability(teamRatingA, teamRatingB)
  const totalPoints = actualScoreA + actualScoreB

  if (totalPoints > 0) {
    const shareA = teamRatingA / (teamRatingA + teamRatingB)
    return {
      expectedA: totalPoints * shareA,
      expectedB: totalPoints * (1 - shareA),
      winProbA,
    }
  }

  return {
    expectedA: pointsToWin * winProbA,
    expectedB: pointsToWin * (1 - winProbA),
    winProbA,
  }
}

export function getMatchWeight(gameDay, matchGroup, options = {}) {
  if (options.matchWeight != null) return options.matchWeight

  const format = gameDay?.format || 'group'
  const weights = MPR_CONFIG.COURT_WEIGHTS[format] || MPR_CONFIG.COURT_WEIGHTS.group

  if (format === 'group' && matchGroup != null) {
    return weights[matchGroup] ?? weights.default
  }

  return weights.default
}

export function getRecencyWeight(matchTimestamp, options = {}) {
  if (options.recencyWeight != null) return options.recencyWeight
  if (!matchTimestamp) return 1.0

  const matchDate = new Date(matchTimestamp)
  const now = options.referenceDate ? new Date(options.referenceDate) : new Date()
  const ageDays = (now - matchDate) / (1000 * 60 * 60 * 24)

  if (ageDays <= 0) return 1.0

  const halfLife = MPR_CONFIG.RECENCY_HALF_LIFE_DAYS
  return Math.pow(0.5, ageDays / halfLife)
}

export function getReliabilityFactor(ratedMatchesCount, options = {}) {
  if (options.reliabilityFactor != null) return options.reliabilityFactor
  const count = toInt(ratedMatchesCount)
  const {
    NR_THRESHOLD,
    PROVISIONAL_K_BOOST,
    ESTABLISHED_K_FACTOR,
    ESTABLISHED_MATCH_THRESHOLD,
  } = MPR_CONFIG

  if (count < NR_THRESHOLD) return PROVISIONAL_K_BOOST
  if (count >= ESTABLISHED_MATCH_THRESHOLD) return ESTABLISHED_K_FACTOR

  const progress = (count - NR_THRESHOLD) / (ESTABLISHED_MATCH_THRESHOLD - NR_THRESHOLD)
  return PROVISIONAL_K_BOOST - progress * (PROVISIONAL_K_BOOST - ESTABLISHED_K_FACTOR)
}

export function calculateReliability(recentMatchCount) {
  if (recentMatchCount <= 0) return 0
  return Math.min(100, Math.round((recentMatchCount / MPR_CONFIG.RELIABILITY_MATCH_TARGET) * 100))
}

export function isNotRated(ratedMatchesCount) {
  return ratedMatchesCount < NR_THRESHOLD
}

export function formatRating(rating, ratedMatchesCount) {
  if (isNotRated(ratedMatchesCount) || rating == null) return 'NR'
  const numeric = parseFloat(rating)
  if (Number.isNaN(numeric)) return 'NR'
  return numeric.toFixed(3)
}

function teamAverageRating(player1, player2) {
  return (getEffectiveRating(player1.doubles_rating) + getEffectiveRating(player2.doubles_rating)) / 2
}

/**
 * Win → always up (margin sets size). Loss → always down (expectation + score vs expected).
 */
export function computeTeamDelta({
  won,
  teamScore,
  oppScore,
  expectedTeamScore,
  expectedWin,
  pointsToWin,
  k,
}) {
  const marginRatio = Math.abs(teamScore - oppScore) / pointsToWin

  if (won) {
    const marginComponent =
      Math.min(marginRatio, MPR_CONFIG.WIN_MARGIN_CAP) * MPR_CONFIG.WIN_MARGIN_WEIGHT
    const winFactor = (MPR_CONFIG.WIN_MIN_FACTOR + marginComponent) * MPR_CONFIG.WIN_NET_BIAS
    return k * winFactor
  }

  const marginPerf = (teamScore - expectedTeamScore) / pointsToWin
  const favouritePressure =
    Math.max(0, expectedWin - 0.5) * 2 * MPR_CONFIG.LOSS_EXPECTATION_WEIGHT
  const lossFactor =
    MPR_CONFIG.LOSS_MIN_FACTOR +
    Math.min(marginRatio, MPR_CONFIG.WIN_MARGIN_CAP) * MPR_CONFIG.LOSS_MARGIN_WEIGHT +
    favouritePressure -
    Math.max(0, marginPerf)
  const clamped = Math.max(
    MPR_CONFIG.LOSS_MIN_FACTOR,
    Math.min(MPR_CONFIG.LOSS_MAX_FACTOR, lossFactor)
  )
  return -k * clamped
}

/**
 * Calculate per-player rating adjustments for a completed doubles match.
 */
export function calculateMatchAdjustments(match, athletesById, gameDay, options = {}) {
  const scoreA = toInt(match.teamA.score)
  const scoreB = toInt(match.teamB.score)

  if (scoreA == null || scoreB == null || !match.winner) {
    return []
  }

  const playerIds = [
    match.teamA.players[0],
    match.teamA.players[1],
    match.teamB.players[0],
    match.teamB.players[1],
  ]

  const players = playerIds.map((id) => athletesById.get(id)).filter(Boolean)
  if (players.length !== 4) return []

  const [a1, a2, b1, b2] = playerIds.map((id) => normalizeAthleteForRating(athletesById.get(id)))
  const teamRatingA = teamAverageRating(a1, a2)
  const teamRatingB = teamAverageRating(b1, b2)
  const pointsToWin = toInt(gameDay?.points_to_win ?? gameDay?.pointsToWin) || 11

  const { expectedA, expectedB, winProbA } = predictExpectedPoints(
    teamRatingA,
    teamRatingB,
    pointsToWin,
    scoreA,
    scoreB
  )

  const teamAWon = match.winner === 'teamA'
  const matchWeight = getMatchWeight(gameDay, match.group, options)
  const recencyWeight = getRecencyWeight(match.timestamp, options)

  const teamConfigs = [
    {
      players: [a1, a2],
      won: teamAWon,
      teamScore: scoreA,
      oppScore: scoreB,
      expectedTeamScore: expectedA,
      expectedWin: winProbA,
    },
    {
      players: [b1, b2],
      won: !teamAWon,
      teamScore: scoreB,
      oppScore: scoreA,
      expectedTeamScore: expectedB,
      expectedWin: 1 - winProbA,
    },
  ]

  const adjustments = []

  for (const team of teamConfigs) {
    for (const player of team.players) {
      const ratedCount = toInt(player.rated_matches_count)
      const reliabilityFactor = getReliabilityFactor(ratedCount, options)
      const baseK = options.baseK ?? BASE_K
      const k = baseK * matchWeight * recencyWeight * reliabilityFactor
      const delta = computeTeamDelta({
        won: team.won,
        teamScore: team.teamScore,
        oppScore: team.oppScore,
        expectedTeamScore: team.expectedTeamScore,
        expectedWin: team.expectedWin,
        pointsToWin,
        k,
      })

      const ratingBefore = getEffectiveRating(player.doubles_rating)
      const newRatedCount = ratedCount + 1
      const ratingAfter = clampRating(ratingBefore + delta)

      adjustments.push({
        athleteId: player.id,
        name: player.name,
        delta: roundDelta(delta),
        ratingBefore: roundRating(ratingBefore),
        ratingAfter: roundRating(ratingAfter),
        ratedMatchesCount: newRatedCount,
        displayRating: isNotRated(newRatedCount) ? null : roundRating(ratingAfter),
      })
    }
  }

  return adjustments
}

export function getMatchQuality(teamRatingA, teamRatingB) {
  const gap = Math.abs(teamRatingA - teamRatingB)
  if (gap <= 0.3) return 'competitive'
  if (gap <= 0.7) return 'moderate'
  return 'mismatch'
}

export function getRatingTrend(history, days = 30) {
  if (!history || history.length < 2) return 'stable'

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = history.filter((h) => new Date(h.created_at || h.createdAt).getTime() >= cutoff)
  if (recent.length < 2) return 'stable'

  const oldest = recent[recent.length - 1]
  const newest = recent[0]
  const change = parseFloat(newest.rating_after) - parseFloat(oldest.rating_before)

  if (change >= 0.3) return 'improving'
  if (change <= -0.3) return 'declining'
  return 'stable'
}

function roundRating(value) {
  return Math.round(value * 1000) / 1000
}

function roundDelta(value) {
  return Math.round(value * 1000) / 1000
}
