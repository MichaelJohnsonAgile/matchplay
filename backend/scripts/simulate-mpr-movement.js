#!/usr/bin/env node
/**
 * Simulate MPR movement for tuning BASE_K and weight factors.
 * Usage: node scripts/simulate-mpr-movement.js
 */
import { calculateMatchAdjustments, getReliabilityFactor } from '../lib/ratingEngine.js'
import { MPR_CONFIG } from '../config/mpr.js'

const gameDay = { format: 'group', points_to_win: 11 }

function athlete(id, rating, ratedMatchesCount) {
  return { id, name: id, doubles_rating: rating, rated_matches_count: ratedMatchesCount }
}

function simulateScenario(label, {
  wins,
  losses,
  winScore = 11,
  winOppScore = 7,
  lossScore = 7,
  lossOppScore = 11,
  startRating = MPR_CONFIG.DEFAULT_RATING,
  opponentRating = MPR_CONFIG.DEFAULT_RATING,
  recencyWeight = 1,
  useConfigReliability = true,
}) {
  const state = new Map([
    ['hero', athlete('hero', startRating, 0)],
    ['partner', athlete('partner', opponentRating, 20)],
    ['opp1', athlete('opp1', opponentRating, 20)],
    ['opp2', athlete('opp2', opponentRating, 20)],
  ])

  let winDeltaSum = 0
  let winCount = 0
  const schedule = [...Array(wins).fill('W'), ...Array(losses).fill('L')]

  for (let i = 0; i < schedule.length; i++) {
    const isWin = schedule[i] === 'W'
    const hero = state.get('hero')
    const ratedCount = parseInt(hero.rated_matches_count, 10) || 0
    const reliabilityFactor = useConfigReliability
      ? getReliabilityFactor(ratedCount)
      : 1

    const adjustments = calculateMatchAdjustments(
      {
        id: `m-${i}`,
        group: 1,
        timestamp: new Date(Date.now() - (schedule.length - i) * 7 * 86400000).toISOString(),
        winner: isWin ? 'teamA' : 'teamB',
        teamA: {
          players: ['hero', 'partner'],
          score: isWin ? winScore : lossScore,
        },
        teamB: {
          players: ['opp1', 'opp2'],
          score: isWin ? winOppScore : lossOppScore,
        },
      },
      state,
      gameDay,
      { matchWeight: 1.1, recencyWeight, reliabilityFactor }
    )

    const heroAdj = adjustments.find((a) => a.athleteId === 'hero')
    hero.doubles_rating = heroAdj.ratingAfter
    hero.rated_matches_count = heroAdj.ratedMatchesCount
    if (isWin) {
      winDeltaSum += heroAdj.delta
      winCount++
    }
  }

  const final = state.get('hero').doubles_rating
  const avgWinDelta = winCount > 0 ? winDeltaSum / winCount : 0
  console.log(`${label}`)
  console.log(`  ${wins}W-${losses}L → ${startRating.toFixed(3)} → ${final.toFixed(3)} (+${(final - startRating).toFixed(3)})`)
  console.log(`  Avg win delta: +${avgWinDelta.toFixed(4)}`)
  console.log()
}

function recencyAtReplayDaysAgo(daysAgo) {
  return Math.pow(0.5, daysAgo / MPR_CONFIG.RECENCY_HALF_LIFE_DAYS)
}

console.log('\n📊 MPR movement simulation\n')
console.log(`BASE_K=${MPR_CONFIG.BASE_K}, provisional boost=${MPR_CONFIG.PROVISIONAL_K_BOOST}, established=${MPR_CONFIG.ESTABLISHED_K_FACTOR}\n`)

simulateScenario('Club regular: 75% win rate, typical 11-7 wins (backfill recency=1)', {
  wins: 40,
  losses: 10,
  recencyWeight: 1,
})

simulateScenario('Strong player: same record, more dominant 11-4 wins', {
  wins: 40,
  losses: 10,
  winOppScore: 4,
  recencyWeight: 1,
})

simulateScenario('Michael Boss-like: 52 matches, ~85% wins', {
  wins: 44,
  losses: 8,
  recencyWeight: 1,
})

simulateScenario('Same 52-match profile IF recency decay applied (180d avg — old backfill bug)', {
  wins: 44,
  losses: 8,
  recencyWeight: recencyAtReplayDaysAgo(180),
})

simulateScenario('Single session: 5-0 night, competitive 11-9 wins', {
  wins: 5,
  losses: 0,
  winOppScore: 9,
  recencyWeight: 1,
})

simulateScenario('Single session: 3-2 night, mixed scores', {
  wins: 3,
  losses: 2,
  recencyWeight: 1,
})

console.log('Per-match examples (equal 3.0 teams, recency=1, established reliability):\n')

for (const [scoreA, scoreB] of [[11, 7], [11, 5], [11, 9], [11, 2], [7, 11]]) {
  const athletes = new Map([
    ['a1', athlete('a1', 3.0, 20)],
    ['a2', athlete('a2', 3.0, 20)],
    ['b1', athlete('b1', 3.0, 20)],
    ['b2', athlete('b2', 3.0, 20)],
  ])
  const adj = calculateMatchAdjustments(
    {
      id: 'x',
      group: 1,
      timestamp: new Date().toISOString(),
      winner: scoreA > scoreB ? 'teamA' : 'teamB',
      teamA: { players: ['a1', 'a2'], score: scoreA },
      teamB: { players: ['b1', 'b2'], score: scoreB },
    },
    athletes,
    gameDay,
    { matchWeight: 1, recencyWeight: 1, reliabilityFactor: MPR_CONFIG.ESTABLISHED_K_FACTOR }
  )
  const winner = adj.find((a) => a.athleteId === (scoreA > scoreB ? 'a1' : 'b1'))
  const loser = adj.find((a) => a.athleteId === (scoreA > scoreB ? 'b1' : 'a1'))
  console.log(`  ${scoreA}-${scoreB}: winner ${winner.delta >= 0 ? '+' : ''}${winner.delta.toFixed(4)}, loser ${loser.delta >= 0 ? '+' : ''}${loser.delta.toFixed(4)}`)
}

console.log()
