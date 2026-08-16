import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  pairProAm,
  pairEvenMatch,
  seedPairsToCourts,
  computeNextGameMatchups,
  sortAthletesForSessionStandings,
  buildSwapUpdates,
} from './divideEngine.js'

function athlete(id, rank, stats = {}) {
  return { id, name: id, rank, stats }
}

describe('divideEngine', () => {
  it('pairs pro-am for 8 players', () => {
    const players = [1, 2, 3, 4, 5, 6, 7, 8].map((r) => athlete(`p${r}`, r))
    const pairs = pairProAm(players)
    assert.equal(pairs.length, 4)
    assert.deepEqual(pairs[0].map((p) => p.rank), [1, 8])
    assert.deepEqual(pairs[3].map((p) => p.rank), [4, 5])
  })

  it('pairs evenly for 8 players (1+3, 2+4, …)', () => {
    const players = [1, 2, 3, 4, 5, 6, 7, 8].map((r) => athlete(`p${r}`, r))
    const pairs = pairEvenMatch(players)
    assert.equal(pairs.length, 4)
    assert.deepEqual(pairs[0].map((p) => p.rank), [1, 3])
    assert.deepEqual(pairs[1].map((p) => p.rank), [2, 4])
    assert.deepEqual(pairs[2].map((p) => p.rank), [5, 7])
    assert.deepEqual(pairs[3].map((p) => p.rank), [6, 8])
  })

  it('seeds strongest pair to court 1', () => {
    const pairs = [
      [athlete('a', 5), athlete('b', 8)],
      [athlete('c', 1), athlete('d', 12)],
    ]
    const courts = seedPairsToCourts(pairs)
    assert.equal(courts.length, 1)
    assert.equal(courts[0].court, 1)
    assert.equal(courts[0].teamA[0].id, 'c')
  })

  it('computes ladder matchups after game 1 on three courts', () => {
    const game1 = [
      {
        court: 1,
        winner: 'teamA',
        teamA: { players: ['a1', 'a2'] },
        teamB: { players: ['b1', 'b2'] },
      },
      {
        court: 2,
        winner: 'teamA',
        teamA: { players: ['c1', 'c2'] },
        teamB: { players: ['d1', 'd2'] },
      },
      {
        court: 3,
        winner: 'teamA',
        teamA: { players: ['e1', 'e2'] },
        teamB: { players: ['f1', 'f2'] },
      },
    ]

    const next = computeNextGameMatchups(game1, 3)
    assert.equal(next.length, 3)

    const court1 = next.find((m) => m.court === 1)
    assert.deepEqual(court1.teamA, ['a1', 'a2'])
    assert.deepEqual(court1.teamB, ['c1', 'c2'])

    const court2 = next.find((m) => m.court === 2)
    assert.deepEqual(court2.teamA, ['b1', 'b2'])
    assert.deepEqual(court2.teamB, ['e1', 'e2'])

    const court3 = next.find((m) => m.court === 3)
    assert.deepEqual(court3.teamA, ['d1', 'd2'])
    assert.deepEqual(court3.teamB, ['f1', 'f2'])
  })

  it('sorts session standings by wins then F/A', () => {
    const players = [
      athlete('a', 1, { wins: 2, pointsDiff: 5 }),
      athlete('b', 2, { wins: 3, pointsDiff: 1 }),
      athlete('c', 3, { wins: 2, pointsDiff: 10 }),
    ]
    const sorted = sortAthletesForSessionStandings(players)
    assert.deepEqual(sorted.map((p) => p.id), ['b', 'c', 'a'])
  })

  it('builds swap updates across pairs on the same court', () => {
    const game1 = [
      {
        id: 'm1',
        court: 1,
        winner: null,
        teamA: { players: ['a1', 'a2'], score: null },
        teamB: { players: ['b1', 'b2'], score: null },
      },
    ]

    const updates = buildSwapUpdates(game1, 'a1', 'b1')
    assert.equal(updates.length, 1)
    assert.deepEqual(updates[0].players, {
      teamAPlayer1: 'b1',
      teamAPlayer2: 'a2',
      teamBPlayer1: 'a1',
      teamBPlayer2: 'b2',
    })
  })

  it('rejects swap within the same pair', () => {
    const game1 = [
      {
        id: 'm1',
        court: 1,
        winner: null,
        teamA: { players: ['a1', 'a2'], score: null },
        teamB: { players: ['b1', 'b2'], score: null },
      },
    ]

    assert.throws(
      () => buildSwapUpdates(game1, 'a1', 'a2'),
      /different pairs/
    )
  })
})
