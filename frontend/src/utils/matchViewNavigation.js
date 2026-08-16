const DIVIDE_GAMES_PER_ROUND = 3

function isDivideGameComplete(matches, round, game) {
  const gameMatches = matches.filter((m) => m.round === round && m.group === game)
  if (gameMatches.length === 0) return false
  return gameMatches.every((m) => m.winner)
}

function getCurrentDivideRoundGame(matches, divideCurrentRound = 0) {
  const round = Math.max(1, divideCurrentRound || 1)

  for (let game = 1; game <= DIVIDE_GAMES_PER_ROUND; game++) {
    const gameMatches = matches.filter((m) => m.round === round && m.group === game)

    if (gameMatches.length === 0) {
      if (game > 1 && isDivideGameComplete(matches, round, game - 1)) {
        return { round: String(round), game: String(game) }
      }
      if (game === 1) {
        return { round: String(round), game: '1' }
      }
      continue
    }

    if (!gameMatches.every((m) => m.winner)) {
      return { round: String(round), game: String(game) }
    }
  }

  return { round: String(round), game: String(DIVIDE_GAMES_PER_ROUND) }
}

function isMatchIncomplete(match) {
  return !match.winner
}

function getCurrentGroupRoundGroup(matches) {
  if (matches.length === 0) {
    return { round: '1', group: '1' }
  }

  const maxRound = Math.max(...matches.map((m) => m.round))

  for (let round = maxRound; round >= 1; round--) {
    const roundMatches = matches.filter((m) => m.round === round)
    const maxGroup = Math.max(...roundMatches.map((m) => m.group), 1)

    for (let group = 1; group <= maxGroup; group++) {
      const groupMatches = roundMatches.filter((m) => m.group === group)
      if (groupMatches.length > 0 && groupMatches.some(isMatchIncomplete)) {
        return { round: String(round), group: String(group) }
      }
    }
  }

  const latestRoundMatches = matches.filter((m) => m.round === maxRound)
  const latestGroup = Math.max(...latestRoundMatches.map((m) => m.group), 1)

  return { round: String(maxRound), group: String(latestGroup) }
}

function getCurrentTeamsPairsRound(matches) {
  if (matches.length === 0) {
    return { round: '1' }
  }

  for (const round of [-2, -1]) {
    const roundMatches = matches.filter((m) => m.round === round)
    if (roundMatches.length > 0 && roundMatches.some(isMatchIncomplete)) {
      return { round: String(round) }
    }
  }

  const positiveRounds = [...new Set(matches.filter((m) => m.round > 0).map((m) => m.round))].sort(
    (a, b) => b - a
  )

  for (const round of positiveRounds) {
    const roundMatches = matches.filter((m) => m.round === round)
    if (roundMatches.some(isMatchIncomplete)) {
      return { round: String(round) }
    }
  }

  if (matches.some((m) => m.round === -2)) return { round: '-2' }
  if (matches.some((m) => m.round === -1)) return { round: '-1' }

  return { round: String(positiveRounds[0] ?? 1) }
}

export function getCurrentMatchView(matches, gameDay) {
  const format = gameDay?.settings?.format

  if (format === 'divide') {
    return getCurrentDivideRoundGame(matches, gameDay?.settings?.divideCurrentRound ?? 0)
  }

  if (format === 'teams' || format === 'pairs') {
    return getCurrentTeamsPairsRound(matches)
  }

  return getCurrentGroupRoundGroup(matches)
}
