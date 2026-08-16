/**
 * Divide & Conquer — pairing, court seeding, and court ladder logic.
 */

export function pairProAm(sortedAthletes) {
  const n = sortedAthletes.length
  if (n % 4 !== 0) {
    throw new Error(`Player count must be divisible by 4 (got ${n})`)
  }

  const pairs = []
  for (let i = 0; i < n / 2; i++) {
    pairs.push([sortedAthletes[i], sortedAthletes[n - 1 - i]])
  }
  return pairs
}

export function pairEvenMatch(sortedAthletes) {
  const n = sortedAthletes.length
  if (n % 4 !== 0) {
    throw new Error(`Player count must be divisible by 4 (got ${n})`)
  }

  const pairs = []
  for (let i = 0; i < n; i += 4) {
    pairs.push([sortedAthletes[i], sortedAthletes[i + 2]])
    pairs.push([sortedAthletes[i + 1], sortedAthletes[i + 3]])
  }
  return pairs
}

export function getBestRankInPair(pair) {
  return Math.min(pair[0].rank, pair[1].rank)
}

/** Strongest pair → court 1 (lowest best-rank in pair). */
export function seedPairsToCourts(pairs) {
  const sorted = [...pairs].sort((a, b) => getBestRankInPair(a) - getBestRankInPair(b))
  const numCourts = sorted.length / 2

  const courtAssignments = []
  for (let i = 0; i < sorted.length; i += 2) {
    const court = i / 2 + 1
    courtAssignments.push({
      court,
      teamA: sorted[i],
      teamB: sorted[i + 1],
    })
  }

  if (courtAssignments.length !== numCourts) {
    throw new Error('Invalid pair count for court seeding')
  }

  return courtAssignments
}

export function pairKey(player1, player2) {
  return [player1, player2].sort().join(':')
}

function newCourtAfterResult(court, won, numCourts) {
  if (won) {
    return court === 1 ? 1 : court - 1
  }
  return court === numCourts ? numCourts : court + 1
}

/**
 * Given all completed matches for one game in a macro round, compute the next game's matchups.
 */
export function computeNextGameMatchups(completedGameMatches, numCourts) {
  const pairsOnCourt = new Map()

  for (let c = 1; c <= numCourts; c++) {
    pairsOnCourt.set(c, [])
  }

  for (const match of completedGameMatches) {
    const court = match.court
    const teamAWon = match.winner === 'teamA'

    const pairA = { players: [...match.teamA.players], key: pairKey(match.teamA.players[0], match.teamA.players[1]) }
    const pairB = { players: [...match.teamB.players], key: pairKey(match.teamB.players[0], match.teamB.players[1]) }

    const courtA = newCourtAfterResult(court, teamAWon, numCourts)
    const courtB = newCourtAfterResult(court, !teamAWon, numCourts)

    pairsOnCourt.get(courtA).push(pairA)
    pairsOnCourt.get(courtB).push(pairB)
  }

  const matchups = []
  for (let c = 1; c <= numCourts; c++) {
    const pairs = pairsOnCourt.get(c)
    if (pairs.length !== 2) {
      throw new Error(`Court ${c} has ${pairs.length} pairs after ladder movement (expected 2)`)
    }
    matchups.push({
      court: c,
      teamA: pairs[0].players,
      teamB: pairs[1].players,
    })
  }

  return matchups
}

export function sortAthletesForSessionStandings(athletes) {
  return [...athletes].sort((a, b) => {
    const winsA = a.stats?.wins ?? 0
    const winsB = b.stats?.wins ?? 0
    if (winsB !== winsA) return winsB - winsA

    const diffA = a.stats?.pointsDiff ?? 0
    const diffB = b.stats?.pointsDiff ?? 0
    if (diffB !== diffA) return diffB - diffA

    return a.rank - b.rank
  })
}

export function areAllGamesComplete(matches, macroRound, gameNumber) {
  const roundMatches = matches.filter(
    (m) => m.round === macroRound && m.group === gameNumber
  )
  if (roundMatches.length === 0) return false
  return roundMatches.every((m) => m.winner !== null)
}

export function isMacroRoundComplete(matches, macroRound) {
  return areAllGamesComplete(matches, macroRound, 3)
}

export function getExpectedCourts(playerCount) {
  return playerCount / 4
}

export function canSwapRound1Partners(matches) {
  const round1 = matches.filter((m) => m.round === 1)
  if (!round1.some((m) => m.group === 1)) return false
  if (round1.some((m) => m.group > 1)) return false
  return !round1.some(
    (m) =>
      m.winner !== null ||
      m.teamA?.score !== null ||
      m.teamB?.score !== null
  )
}

function locatePlayerInMatches(game1Matches, playerId) {
  for (const match of game1Matches) {
    const teamAIdx = match.teamA.players.indexOf(playerId)
    if (teamAIdx !== -1) {
      return { match, side: 'teamA', slot: teamAIdx, pairKey: `${match.id}:A` }
    }
    const teamBIdx = match.teamB.players.indexOf(playerId)
    if (teamBIdx !== -1) {
      return { match, side: 'teamB', slot: teamBIdx, pairKey: `${match.id}:B` }
    }
  }
  return null
}

/** Build match player updates when swapping two players between Round 1 pairs. */
export function buildSwapUpdates(game1Matches, player1Id, player2Id) {
  const loc1 = locatePlayerInMatches(game1Matches, player1Id)
  const loc2 = locatePlayerInMatches(game1Matches, player2Id)

  if (!loc1 || !loc2) {
    throw new Error('Both players must be in Round 1 Game 1')
  }
  if (loc1.pairKey === loc2.pairKey) {
    throw new Error('Select players from different pairs to swap')
  }

  const updates = new Map()

  function setPlayers(match, teamA, teamB) {
    updates.set(match.id, {
      teamAPlayer1: teamA[0],
      teamAPlayer2: teamA[1],
      teamBPlayer1: teamB[0],
      teamBPlayer2: teamB[1],
    })
  }

  if (loc1.match.id === loc2.match.id) {
    const teamA = [...loc1.match.teamA.players]
    const teamB = [...loc1.match.teamB.players]
    if (loc1.side === 'teamA') teamA[loc1.slot] = player2Id
    else teamB[loc1.slot] = player2Id
    if (loc2.side === 'teamA') teamA[loc2.slot] = player1Id
    else teamB[loc2.slot] = player1Id
    setPlayers(loc1.match, teamA, teamB)
  } else {
    for (const [loc, selfId, otherId] of [
      [loc1, player1Id, player2Id],
      [loc2, player2Id, player1Id],
    ]) {
      const teamA = loc.match.teamA.players.map((p) => (p === selfId ? otherId : p))
      const teamB = loc.match.teamB.players.map((p) => (p === selfId ? otherId : p))
      setPlayers(loc.match, teamA, teamB)
    }
  }

  return Array.from(updates.entries()).map(([matchId, players]) => ({ matchId, players }))
}

export function getDivideSessionState(divideCurrentRound, matches) {
  const round1Complete = isMacroRoundComplete(matches, 1)
  const round2Complete = isMacroRoundComplete(matches, 2)
  const round3Complete = isMacroRoundComplete(matches, 3)
  const hasRound1Preview =
    divideCurrentRound === 0 && matches.some((m) => m.round === 1 && m.group === 1)

  let nextRoundToStart = null
  if (hasRound1Preview) nextRoundToStart = 1
  else if (divideCurrentRound === 1 && round1Complete) nextRoundToStart = 2
  else if (divideCurrentRound === 2 && round2Complete) nextRoundToStart = 3

  return {
    divideCurrentRound,
    round1Preview: hasRound1Preview,
    round1Complete,
    round2Complete,
    round3Complete,
    sessionComplete: round3Complete,
    nextRoundToStart,
    canPreviewRound1: divideCurrentRound === 0 && matches.length === 0,
    canStartRound1: hasRound1Preview,
    canStartRound2: divideCurrentRound === 1 && round1Complete,
    canStartRound3: divideCurrentRound === 2 && round2Complete,
    canSwapRound1Partners: canSwapRound1Partners(matches),
  }
}
