import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateMatchAdjustments,
  clampRating,
  computeTeamDelta,
  formatRating,
  getEffectiveRating,
  predictExpectedPoints,
} from './ratingEngine.js'
import { MPR_CONFIG } from '../config/mpr.js'

const gameDay = { format: 'group', points_to_win: 11 }
const unitK = 1

function athlete(id, rating, ratedMatchesCount = 10) {
  return {
    id,
    name: id,
    doubles_rating: rating,
    rated_matches_count: ratedMatchesCount,
  }
}

function buildAthletesMap(entries) {
  return new Map(entries.map((a) => [a.id, a]))
}

function match(teamA, teamB, scoreA, scoreB, winner) {
  return {
    id: 'match-1',
    group: 1,
    timestamp: new Date().toISOString(),
    winner,
    teamA: { players: [teamA[0], teamA[1]], score: scoreA },
    teamB: { players: [teamB[0], teamB[1]], score: scoreB },
  }
}

describe('ratingEngine', () => {
  it('predicts higher expected score for favoured team', () => {
    const { expectedA, expectedB } = predictExpectedPoints(4.0, 3.0, 11, 11, 5)
    assert.ok(expectedA > expectedB)
  })

  it('winners always gain rating regardless of expectation', () => {
    const athletes = buildAthletesMap([
      athlete('a1', 4.5),
      athlete('a2', 4.5),
      athlete('b1', 3.0),
      athlete('b2', 3.0),
    ])

    const adjustments = calculateMatchAdjustments(
      match(['a1', 'a2'], ['b1', 'b2'], 11, 8, 'teamA'),
      athletes,
      gameDay,
      { matchWeight: 1, recencyWeight: 1, reliabilityFactor: 1 }
    )

    const favDeltas = adjustments.filter((a) => a.athleteId.startsWith('a')).map((a) => a.delta)
    const dogDeltas = adjustments.filter((a) => a.athleteId.startsWith('b')).map((a) => a.delta)

    assert.ok(favDeltas.every((d) => d > 0))
    assert.ok(dogDeltas.every((d) => d < 0))
  })

  it('equal 3.5 teams: win reward slightly exceeds mirror loss penalty', () => {
    const k = MPR_CONFIG.BASE_K
    const exp = predictExpectedPoints(3.5, 3.5, 11, 11, 7)
    const winD = computeTeamDelta({
      won: true,
      teamScore: 11,
      oppScore: 7,
      expectedTeamScore: exp.expectedA,
      expectedWin: exp.winProbA,
      pointsToWin: 11,
      k,
    })
    const lossD = computeTeamDelta({
      won: false,
      teamScore: 7,
      oppScore: 11,
      expectedTeamScore: exp.expectedB,
      expectedWin: 1 - exp.winProbA,
      pointsToWin: 11,
      k,
    })
    assert.ok(winD > 0)
    assert.ok(lossD < 0)
    assert.ok(Math.abs(lossD) < winD)
    assert.ok(Math.abs(lossD) > winD * 0.9)
  })

  it('underdog losing close loses less than favourite losing badly', () => {
    const closeLoss = computeTeamDelta({
      won: false,
      teamScore: 9,
      oppScore: 11,
      expectedTeamScore: 4,
      expectedWin: 0.15,
      pointsToWin: 11,
      k: unitK,
    })
    const heavyLoss = computeTeamDelta({
      won: false,
      teamScore: 3,
      oppScore: 11,
      expectedTeamScore: 8,
      expectedWin: 0.85,
      pointsToWin: 11,
      k: unitK,
    })

    assert.ok(closeLoss < 0)
    assert.ok(heavyLoss < 0)
    assert.ok(closeLoss > heavyLoss)
  })

  it('wider winning margin yields larger gain than narrow win', () => {
    const narrowWin = computeTeamDelta({
      won: true,
      teamScore: 11,
      oppScore: 9,
      expectedTeamScore: 9,
      expectedWin: 0.5,
      pointsToWin: 11,
      k: unitK,
    })
    const blowoutWin = computeTeamDelta({
      won: true,
      teamScore: 11,
      oppScore: 2,
      expectedTeamScore: 9,
      expectedWin: 0.5,
      pointsToWin: 11,
      k: unitK,
    })

    assert.ok(narrowWin > 0)
    assert.ok(blowoutWin > narrowWin)
  })

  it('uses default rating for NR players in prediction', () => {
    assert.equal(getEffectiveRating(null), 3.5)
    assert.equal(formatRating(null, 0), 'NR')
    assert.equal(formatRating(3.542, 3), '3.542')
  })

  it('clamps rating to valid range', () => {
    assert.equal(clampRating(1.5), 2.0)
    assert.equal(clampRating(9.0), 8.0)
  })

  it('splits adjustment equally between partners', () => {
    const athletes = buildAthletesMap([
      athlete('a1', 3.5),
      athlete('a2', 3.5),
      athlete('b1', 3.5),
      athlete('b2', 3.5),
    ])

    const adjustments = calculateMatchAdjustments(
      match(['a1', 'a2'], ['b1', 'b2'], 11, 5, 'teamA'),
      athletes,
      gameDay,
      { matchWeight: 1, recencyWeight: 1, reliabilityFactor: 1 }
    )

    const a1 = adjustments.find((a) => a.athleteId === 'a1')
    const a2 = adjustments.find((a) => a.athleteId === 'a2')
    assert.equal(a1.delta, a2.delta)
  })

  it('parses PostgreSQL decimal strings without NaN (backfill regression)', () => {
    assert.equal(getEffectiveRating('3.542'), 3.542)

    const athletes = buildAthletesMap([
      athlete('a1', '3.542', 10),
      athlete('a2', '3.100', 10),
      athlete('b1', '3.000', 10),
      athlete('b2', '3.000', 10),
    ])

    const adjustments = calculateMatchAdjustments(
      match(['a1', 'a2'], ['b1', 'b2'], 11, 7, 'teamA'),
      athletes,
      gameDay,
      { matchWeight: 1, recencyWeight: 1, reliabilityFactor: 1 }
    )

    for (const adj of adjustments) {
      assert.ok(Number.isFinite(adj.ratingBefore), `ratingBefore not finite for ${adj.athleteId}`)
      assert.ok(Number.isFinite(adj.ratingAfter), `ratingAfter not finite for ${adj.athleteId}`)
      assert.ok(Number.isFinite(adj.delta), `delta not finite for ${adj.athleteId}`)
    }
    const winners = adjustments.filter((a) => a.athleteId.startsWith('a'))
    const losers = adjustments.filter((a) => a.athleteId.startsWith('b'))
    assert.ok(winners.every((a) => a.delta > 0))
    assert.ok(losers.every((a) => a.delta < 0))
  })

  it('chains multiple matches with string ratings like backfill replay', () => {
    const state = new Map([
      ['a1', { id: 'a1', name: 'a1', doubles_rating: null, rated_matches_count: 0 }],
      ['a2', { id: 'a2', name: 'a2', doubles_rating: null, rated_matches_count: 0 }],
      ['b1', { id: 'b1', name: 'b1', doubles_rating: null, rated_matches_count: 0 }],
      ['b2', { id: 'b2', name: 'b2', doubles_rating: null, rated_matches_count: 0 }],
    ])

    const scores = [
      [11, 5],
      [11, 8],
      [9, 11],
      [11, 10],
      [11, 3],
    ]

    for (let i = 0; i < scores.length; i++) {
      const [scoreA, scoreB] = scores[i]
      const adjustments = calculateMatchAdjustments(
        {
          id: `match-${i}`,
          group: 1,
          timestamp: new Date().toISOString(),
          winner: scoreA > scoreB ? 'teamA' : 'teamB',
          teamA: { players: ['a1', 'a2'], score: scoreA },
          teamB: { players: ['b1', 'b2'], score: scoreB },
        },
        state,
        gameDay,
        { matchWeight: 1, recencyWeight: 1, reliabilityFactor: 1 }
      )

      assert.equal(adjustments.length, 4)

      for (const adj of adjustments) {
        assert.ok(Number.isFinite(adj.ratingAfter))
        const player = state.get(adj.athleteId)
        player.doubles_rating = String(adj.ratingAfter)
        player.rated_matches_count = String(adj.ratedMatchesCount)
      }
    }

    for (const player of state.values()) {
      const rating = parseFloat(player.doubles_rating)
      assert.ok(Number.isFinite(rating))
      assert.ok(rating >= 2.0 && rating <= 8.0)
    }
  })

  it('increments rated_matches_count correctly when pg returns strings', () => {
    const state = new Map([
      ['a1', { id: 'a1', name: 'a1', doubles_rating: '3.500', rated_matches_count: '1' }],
      ['a2', { id: 'a2', name: 'a2', doubles_rating: '3.500', rated_matches_count: '1' }],
      ['b1', { id: 'b1', name: 'b1', doubles_rating: '3.500', rated_matches_count: '1' }],
      ['b2', { id: 'b2', name: 'b2', doubles_rating: '3.500', rated_matches_count: '1' }],
    ])

    const adjustments = calculateMatchAdjustments(
      match(['a1', 'a2'], ['b1', 'b2'], 11, 6, 'teamA'),
      state,
      gameDay,
      { matchWeight: 1, recencyWeight: 1, reliabilityFactor: 1 }
    )

    for (const adj of adjustments) {
      assert.equal(adj.ratedMatchesCount, 2)
      assert.ok(Number.isFinite(adj.ratingAfter))
    }
  })
})
