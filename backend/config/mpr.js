/** Matchplay Rating (MPR) configuration */
export const MPR_CONFIG = {
  MIN_RATING: 2.0,
  MAX_RATING: 8.0,
  /** Starting / NR assumption — league baseline before match history */
  DEFAULT_RATING: 3.5,
  NR_THRESHOLD: 3,
  /** Base step size per match */
  BASE_K: 0.14,
  ELO_SCALE: 2.0,
  /** Win: always positive; floor + margin component */
  WIN_MIN_FACTOR: 0.2,
  WIN_MARGIN_WEIGHT: 0.85,
  WIN_MARGIN_CAP: 1.0,
  /** Slight bias so wins reward a touch more than mirror losses penalise (50% player drifts up slowly) */
  WIN_NET_BIAS: 1.05,
  /** Loss: mirror margin at even odds; extra bite when favoured; relief if you beat point expectation */
  LOSS_MIN_FACTOR: 0.2,
  LOSS_MARGIN_WEIGHT: 0.85,
  LOSS_MAX_FACTOR: 1.25,
  /** Extra loss factor when expectedWin > 50% (favourite lost) */
  LOSS_EXPECTATION_WEIGHT: 0.75,
  RELIABILITY_MATCH_TARGET: 20,
  /** Boost K while rating is still provisional (before NR threshold) */
  PROVISIONAL_K_BOOST: 1.35,
  /** Dampen K once a player has a long-established rating */
  ESTABLISHED_K_FACTOR: 0.65,
  ESTABLISHED_MATCH_THRESHOLD: 40,
  RECENCY_HALF_LIFE_DAYS: 90,
  RECENT_MATCH_WINDOW_DAYS: 90,
  COURT_WEIGHTS: {
    group: { 1: 1.1, 2: 1.05, default: 1.0 },
    teams: { default: 1.0 },
    pairs: { default: 1.0 },
  },
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
