const NR_THRESHOLD = 3
/** Must match backend/config/mpr.js DEFAULT_RATING */
const DEFAULT_RATING = 3.5

export function formatMpr(athlete) {
  const count = athlete?.ratedMatchesCount ?? athlete?.rated_matches_count ?? 0
  const rating = athlete?.doublesRating ?? athlete?.doubles_rating
  if (count < NR_THRESHOLD || rating == null) return 'NR'
  return parseFloat(rating).toFixed(3)
}

export function formatMprWithReliability(athlete) {
  const mpr = formatMpr(athlete)
  if (mpr === 'NR') return 'NR'
  const reliability = athlete?.ratingReliability ?? athlete?.rating_reliability ?? 0
  return `${mpr} · ${reliability}%`
}

export function getSkillBand(rating) {
  if (rating == null) return 'Not Rated'
  if (rating < 2.5) return 'Beginner'
  if (rating < 3.0) return 'Advanced Beginner'
  if (rating < 3.5) return 'Intermediate'
  if (rating < 4.0) return 'Advanced Intermediate'
  if (rating < 4.5) return 'Advanced'
  if (rating < 5.0) return 'Expert'
  return 'Pro'
}

export function getEffectiveRating(athlete) {
  const rating = athlete?.doublesRating ?? athlete?.doubles_rating
  return rating != null ? parseFloat(rating) : DEFAULT_RATING
}

export function getMatchQuality(match, athletes) {
  if (!match?.teamA?.players || !match?.teamB?.players) return null

  const teamA = match.teamA.players.map((id) => getEffectiveRating(athletes[id]))
  const teamB = match.teamB.players.map((id) => getEffectiveRating(athletes[id]))
  const avgA = (teamA[0] + teamA[1]) / 2
  const avgB = (teamB[0] + teamB[1]) / 2
  const gap = Math.abs(avgA - avgB)

  if (gap <= 0.3) return { label: 'Competitive', className: 'text-green-700 bg-green-50' }
  if (gap <= 0.7) return { label: 'Moderate', className: 'text-amber-700 bg-amber-50' }
  return { label: 'Mismatch', className: 'text-red-700 bg-red-50' }
}

export function formatRatingDelta(delta) {
  if (delta == null) return ''
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(3)}`
}

export function getTrendLabel(trend) {
  switch (trend) {
    case 'improving':
      return { label: 'Improving', className: 'text-green-700' }
    case 'declining':
      return { label: 'Declining', className: 'text-red-700' }
    default:
      return { label: 'Stable', className: 'text-gray-600' }
  }
}
