import { formatRating } from './ratingEngine.js'
import { getSkillBand } from '../config/mpr.js'

export function formatAthleteMpr(athlete) {
  if (!athlete) return athlete
  const ratedMatchesCount = parseInt(athlete.rated_matches_count) || 0
  const doublesRating = athlete.doubles_rating != null ? parseFloat(athlete.doubles_rating) : null
  return {
    ...athlete,
    doublesRating,
    ratingReliability: parseInt(athlete.rating_reliability) || 0,
    ratedMatchesCount,
    mprDisplay: formatRating(doublesRating, ratedMatchesCount),
    skillBand: getSkillBand(doublesRating),
  }
}
