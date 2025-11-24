import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { store, getGameDayStats } from '../data/store.js'

export const gameDayRoutes = express.Router()

// GET /api/gamedays - Get all game days
gameDayRoutes.get('/', (req, res) => {
  const gameDaysWithStats = store.gameDays.map(gd => ({
    ...gd,
    ...getGameDayStats(gd.id)
  }))
  res.json(gameDaysWithStats)
})

// GET /api/gamedays/:id - Get single game day
gameDayRoutes.get('/:id', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  const gameDayWithStats = {
    ...gameDay,
    ...getGameDayStats(gameDay.id)
  }
  
  res.json(gameDayWithStats)
})

// POST /api/gamedays - Create new game day
gameDayRoutes.post('/', (req, res) => {
  const { date, venue, pointsToWin, winByMargin, rounds, movementRule } = req.body
  
  if (!date || !venue) {
    return res.status(400).json({ error: 'Date and venue are required' })
  }
  
  const newGameDay = {
    id: `gd-${uuidv4()}`,
    date,
    venue,
    status: 'upcoming',
    settings: {
      format: 'group',
      pointsToWin: pointsToWin || 11,
      winByMargin: winByMargin || 2,
      numberOfRounds: rounds || 3,
      movementRule: movementRule || 'auto' // 'auto', '1', or '2'
    },
    athletes: [],
    matches: []
  }
  
  store.gameDays.push(newGameDay)
  
  res.status(201).json({
    ...newGameDay,
    ...getGameDayStats(newGameDay.id)
  })
})

// PUT /api/gamedays/:id - Update game day
gameDayRoutes.put('/:id', (req, res) => {
  const index = store.gameDays.findIndex(gd => gd.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  store.gameDays[index] = {
    ...store.gameDays[index],
    ...req.body,
    id: req.params.id // Prevent ID from being changed
  }
  
  res.json(store.gameDays[index])
})

// DELETE /api/gamedays/:id - Delete game day
gameDayRoutes.delete('/:id', (req, res) => {
  const index = store.gameDays.findIndex(gd => gd.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  store.gameDays.splice(index, 1)
  
  // Also delete associated matches
  store.matches = store.matches.filter(m => m.gameDayId !== req.params.id)
  
  res.status(204).send()
})

// GET /api/gamedays/:id/athletes - Get athletes for a game day with game-day-specific stats
gameDayRoutes.get('/:id/athletes', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  // Get all athletes for this game day
  const athletes = gameDay.athletes.map(athleteId => 
    store.athletes.find(a => a.id === athleteId)
  ).filter(Boolean)
  
  // Get all matches for this game day
  const gameDayMatches = store.matches.filter(m => m.gameDayId === gameDay.id)
  
  // Calculate game-day-specific stats for each athlete
  const athletesWithGameDayStats = athletes.map(athlete => {
    const stats = {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0
    }
    
    // Calculate stats from completed matches
    gameDayMatches.forEach(match => {
      // Check if athlete was in this match
      const inTeamA = match.teamA.players.includes(athlete.id)
      const inTeamB = match.teamB.players.includes(athlete.id)
      const isBye = match.bye === athlete.id
      
      // Skip if athlete has bye for this match
      if (isBye) return
      
      // Only count completed matches
      if (match.teamA.score !== null && match.teamB.score !== null) {
        if (inTeamA) {
          stats.matchesPlayed++
          stats.pointsFor += match.teamA.score
          stats.pointsAgainst += match.teamB.score
          if (match.winner === 'teamA') {
            stats.wins++
          } else if (match.winner === 'teamB') {
            stats.losses++
          }
        } else if (inTeamB) {
          stats.matchesPlayed++
          stats.pointsFor += match.teamB.score
          stats.pointsAgainst += match.teamA.score
          if (match.winner === 'teamB') {
            stats.wins++
          } else if (match.winner === 'teamA') {
            stats.losses++
          }
        }
      }
    })
    
    stats.pointsDiff = stats.pointsFor - stats.pointsAgainst
    
    return {
      ...athlete,
      stats // Override with game-day-specific stats
    }
  })
  
  res.json(athletesWithGameDayStats)
})

// POST /api/gamedays/:id/athletes - Add athletes to game day
gameDayRoutes.post('/:id/athletes', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  const { athleteIds } = req.body
  if (!athleteIds || !Array.isArray(athleteIds)) {
    return res.status(400).json({ error: 'athleteIds array is required' })
  }
  
  // Add athletes (avoiding duplicates)
  athleteIds.forEach(athleteId => {
    if (!gameDay.athletes.includes(athleteId)) {
      gameDay.athletes.push(athleteId)
    }
  })
  
  res.json({ message: 'Athletes added', athleteCount: gameDay.athletes.length })
})

// DELETE /api/gamedays/:id/athletes/:athleteId - Remove athlete from game day
gameDayRoutes.delete('/:id/athletes/:athleteId', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  gameDay.athletes = gameDay.athletes.filter(id => id !== req.params.athleteId)
  
  res.json({ message: 'Athlete removed', athleteCount: gameDay.athletes.length })
})

// GET /api/gamedays/:id/draw-preview - Preview group allocation before generating
gameDayRoutes.get('/:id/draw-preview', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  const numAthletes = gameDay.athletes.length
  
  if (numAthletes < 8) {
    return res.json({
      canGenerate: false,
      reason: 'At least 8 athletes required',
      currentCount: numAthletes,
      needed: 8 - numAthletes
    })
  }
  
  const allocation = calculateGroupAllocation(numAthletes)
  
  // Get athletes and show groupings
  const athletes = gameDay.athletes
    .map(id => store.athletes.find(a => a.id === id))
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
  
  const groupPreviews = []
  let athleteIndex = 0
  
  for (let i = 0; i < allocation.numGroups; i++) {
    const groupSize = allocation.groupSizes[i]
    const groupAthletes = athletes.slice(athleteIndex, athleteIndex + groupSize)
    
    groupPreviews.push({
      groupNumber: i + 1,
      size: groupSize,
      athletes: groupAthletes.map(a => ({
        id: a.id,
        name: a.name,
        rank: a.rank
      })),
      matchesCount: groupSize === 4 ? 3 : groupSize === 5 ? 5 : 0
    })
    
    athleteIndex += groupSize
  }
  
  res.json({
    canGenerate: true,
    allocation: allocation.description,
    numGroups: allocation.numGroups,
    groupSizes: allocation.groupSizes,
    totalMatches: groupPreviews.reduce((sum, g) => sum + g.matchesCount, 0),
    groups: groupPreviews
  })
})

// POST /api/gamedays/:id/generate-draw - Generate match draw
gameDayRoutes.post('/:id/generate-draw', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  const numAthletes = gameDay.athletes.length
  
  // Validate minimum athletes
  if (numAthletes < 8) {
    return res.status(400).json({ 
      error: 'At least 8 athletes required to generate draw',
      currentCount: numAthletes
    })
  }
  
  // Get athletes with their rankings and sort by rank
  const athletes = gameDay.athletes
    .map(id => store.athletes.find(a => a.id === id))
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank) // Sort by rank: 1 (best) to N (lowest)
  
  console.log('Athletes sorted by rank:', athletes.map(a => `${a.name} (Rank ${a.rank})`))
  
  // Clear existing matches for this game day
  store.matches = store.matches.filter(m => m.gameDayId !== gameDay.id)
  gameDay.matches = []
  
  // Calculate group allocation
  const allocation = calculateGroupAllocation(numAthletes)
  
  // Check if allocation failed
  if (allocation.error) {
    return res.status(400).json({ 
      error: allocation.description,
      suggestion: 'Add or remove athletes to reach a valid group size'
    })
  }
  
  // Create groups based on allocation
  const groups = []
  let athleteIndex = 0
  
  for (let i = 0; i < allocation.numGroups; i++) {
    const groupSize = allocation.groupSizes[i]
    groups.push(athletes.slice(athleteIndex, athleteIndex + groupSize))
    athleteIndex += groupSize
  }
  
  // Generate matches for Round 1
  groups.forEach((group, groupIndex) => {
    const matches = generateGroupMatches(group, gameDay.id, 1, groupIndex + 1)
    matches.forEach(match => {
      store.matches.push(match)
      gameDay.matches.push(match.id)
    })
  })
  
  res.json({ 
    message: 'Draw generated successfully',
    matchesGenerated: gameDay.matches.length,
    groups: allocation.numGroups,
    groupSizes: allocation.groupSizes,
    allocation: allocation.description,
    success: true
  })
})

// POST /api/gamedays/:id/generate-next-round - Generate next round based on previous results
gameDayRoutes.post('/:id/generate-next-round', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  // Find the latest round
  const matches = store.matches.filter(m => m.gameDayId === gameDay.id)
  if (matches.length === 0) {
    return res.status(400).json({ error: 'No previous round found. Generate initial draw first.' })
  }
  
  const latestRound = Math.max(...matches.map(m => m.round))
  
  // Check if we've reached max rounds
  if (latestRound >= gameDay.settings.numberOfRounds) {
    return res.status(400).json({ 
      error: 'All rounds have been generated',
      currentRound: latestRound,
      maxRounds: gameDay.settings.numberOfRounds
    })
  }
  
  // Generate next round
  const result = generateNextRound(gameDay.id, latestRound)
  
  if (result.error) {
    return res.status(400).json(result)
  }
  
  res.json({
    message: `Round ${result.round} generated successfully`,
    ...result
  })
})

// POST /api/gamedays/:id/cancel-draw - Cancel draw and delete all matches
gameDayRoutes.post('/:id/cancel-draw', (req, res) => {
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  // Count matches before deletion
  const matchCount = gameDay.matches.length
  
  // Delete all matches for this game day
  store.matches = store.matches.filter(m => m.gameDayId !== gameDay.id)
  gameDay.matches = []
  
  console.log(`Cancelled draw for game day ${gameDay.id}: deleted ${matchCount} matches`)
  
  res.json({ 
    message: 'Draw cancelled successfully',
    matchesDeleted: matchCount,
    success: true
  })
})

// Helper function to calculate optimal group allocation
function calculateGroupAllocation(numAthletes) {
  // Simple rule: 
  // - Base number of groups = floor(athletes / 4)
  // - Remainder players get added to top groups (one extra per group)
  // - Groups can have 4 or 5 players max
  
  const numGroups = Math.floor(numAthletes / 4)
  const remainder = numAthletes % 4
  
  if (numGroups === 0) {
    return {
      numGroups: 0,
      groupSizes: [],
      description: `Need at least 8 athletes (currently ${numAthletes})`,
      totalAthletes: numAthletes,
      hasByes: false,
      has5PlayerGroups: false,
      error: true
    }
  }
  
  // Distribute: first `remainder` groups get 5 players, rest get 4
  const groupSizes = []
  for (let i = 0; i < numGroups; i++) {
    groupSizes.push(i < remainder ? 5 : 4)
  }
  
  const numGroupsOf5 = remainder
  const numGroupsOf4 = numGroups - remainder
  
  let description = ''
  if (numGroupsOf5 === 0) {
    description = `${numGroupsOf4} groups of 4`
  } else if (numGroupsOf4 === 0) {
    description = `${numGroupsOf5} groups of 5 (1 bye each)`
  } else {
    description = `${numGroupsOf5} groups of 5 (1 bye each), ${numGroupsOf4} groups of 4`
  }
  
  return {
    numGroups,
    groupSizes,
    description,
    totalAthletes: numAthletes,
    hasByes: numGroupsOf5 > 0,
    has5PlayerGroups: numGroupsOf5 > 0,
    movementRule: numGroupsOf5 > 0 ? '2 up, 2 down' : '1 up, 1 down'
  }
}

// Helper function to generate matches for a group (ROUND ROBIN)
function generateGroupMatches(group, gameDayId, round, groupNumber) {
  const matches = []
  
  if (group.length === 4) {
    // 4-player group: 3 matches (full round robin)
    // Players: A, B, C, D (indexed 0, 1, 2, 3)
    // Match 1: A+B vs C+D
    // Match 2: A+C vs B+D
    // Match 3: A+D vs B+C
    
    const matchConfigs = [
      { teamA: [0, 1], teamB: [2, 3] }, // A+B vs C+D
      { teamA: [0, 2], teamB: [1, 3] }, // A+C vs B+D
      { teamA: [0, 3], teamB: [1, 2] }  // A+D vs B+C
    ]
    
    matchConfigs.forEach(config => {
      matches.push({
        id: `match-${uuidv4()}`,
        gameDayId,
        round,
        group: groupNumber,
        court: null,
        teamA: {
          players: [group[config.teamA[0]].id, group[config.teamA[1]].id],
          score: null
        },
        teamB: {
          players: [group[config.teamB[0]].id, group[config.teamB[1]].id],
          score: null
        },
        status: 'pending',
        winner: null,
        timestamp: null
      })
    })
    
  } else if (group.length === 5) {
    // 5-player group: 5 matches (full round robin with rotating bye)
    // Players: A, B, C, D, E (indexed 0, 1, 2, 3, 4)
    // Match 1: A+B vs C+D (E bye)
    // Match 2: A+C vs D+E (B bye)
    // Match 3: A+D vs B+E (C bye)
    // Match 4: A+E vs B+C (D bye)
    // Match 5: B+D vs C+E (A bye)
    
    const matchConfigs = [
      { teamA: [0, 1], teamB: [2, 3], bye: 4 }, // A+B vs C+D (E bye)
      { teamA: [0, 2], teamB: [3, 4], bye: 1 }, // A+C vs D+E (B bye)
      { teamA: [0, 3], teamB: [1, 4], bye: 2 }, // A+D vs B+E (C bye)
      { teamA: [0, 4], teamB: [1, 2], bye: 3 }, // A+E vs B+C (D bye)
      { teamA: [1, 3], teamB: [2, 4], bye: 0 }  // B+D vs C+E (A bye)
    ]
    
    matchConfigs.forEach(config => {
      matches.push({
        id: `match-${uuidv4()}`,
        gameDayId,
        round,
        group: groupNumber,
        court: null,
        teamA: {
          players: [group[config.teamA[0]].id, group[config.teamA[1]].id],
          score: null
        },
        teamB: {
          players: [group[config.teamB[0]].id, group[config.teamB[1]].id],
          score: null
        },
        bye: group[config.bye].id, // Player with bye
        status: 'pending',
        winner: null,
        timestamp: null
      })
    })
  }
  
  return matches
}

// Helper function to determine effective movement rule
function getEffectiveMovementRule(gameDay, allocation) {
  const movementRule = gameDay.settings.movementRule || 'auto'
  
  if (movementRule === 'auto') {
    // Auto: Use 2 if any 5-player groups, otherwise 1
    return allocation.has5PlayerGroups ? '2' : '1'
  }
  
  return movementRule
}

// Helper function to calculate group standings from completed matches
function calculateGroupStandings(gameDayId, round, groupNumber) {
  const matches = store.matches.filter(m => 
    m.gameDayId === gameDayId && 
    m.round === round && 
    m.group === groupNumber &&
    m.winner !== null // Only completed matches
  )
  
  if (matches.length === 0) return []
  
  // Get all athletes in this group
  const athleteIds = new Set()
  matches.forEach(match => {
    match.teamA.players.forEach(id => athleteIds.add(id))
    match.teamB.players.forEach(id => athleteIds.add(id))
  })
  
  // Calculate stats for each athlete
  const standings = Array.from(athleteIds).map(athleteId => {
    let wins = 0
    let losses = 0
    let pointsFor = 0
    let pointsAgainst = 0
    let matchesPlayed = 0
    
    matches.forEach(match => {
      const inTeamA = match.teamA.players.includes(athleteId)
      const inTeamB = match.teamB.players.includes(athleteId)
      const isBye = match.bye === athleteId
      
      if (isBye) return // Skip bye matches
      
      if (inTeamA) {
        matchesPlayed++
        pointsFor += match.teamA.score
        pointsAgainst += match.teamB.score
        if (match.winner === 'teamA') wins++
        else losses++
      } else if (inTeamB) {
        matchesPlayed++
        pointsFor += match.teamB.score
        pointsAgainst += match.teamA.score
        if (match.winner === 'teamB') wins++
        else losses++
      }
    })
    
    return {
      athleteId,
      wins,
      losses,
      matchesPlayed,
      pointsFor,
      pointsAgainst,
      pointsDiff: pointsFor - pointsAgainst,
      winRate: matchesPlayed > 0 ? wins / matchesPlayed : 0
    }
  })
  
  // Sort by wins, then point differential
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff
    return b.pointsFor - a.pointsFor
  })
  
  return standings
}

// Helper function to generate next round with movement
function generateNextRound(gameDayId, previousRound) {
  const gameDay = store.gameDays.find(gd => gd.id === gameDayId)
  if (!gameDay) return { error: 'Game day not found' }
  
  // Get all groups from previous round
  const previousMatches = store.matches.filter(m => 
    m.gameDayId === gameDayId && m.round === previousRound
  )
  
  if (previousMatches.length === 0) {
    return { error: 'No matches found for previous round' }
  }
  
  // Check if all matches are completed
  const incompletMatches = previousMatches.filter(m => m.winner === null)
  if (incompletMatches.length > 0) {
    return { 
      error: 'Not all matches completed',
      incomplete: incompletMatches.length 
    }
  }
  
  // Get unique group numbers
  const groupNumbers = [...new Set(previousMatches.map(m => m.group))].sort((a, b) => a - b)
  
  // Calculate standings for each group
  const groupStandings = groupNumbers.map(groupNum => ({
    groupNumber: groupNum,
    standings: calculateGroupStandings(gameDayId, previousRound, groupNum)
  }))
  
  // Determine movement rule
  const allocation = calculateGroupAllocation(gameDay.athletes.length)
  const movementRule = getEffectiveMovementRule(gameDay, allocation)
  const moveCount = parseInt(movementRule)
  
  // Perform movement between groups
  const newGroups = []
  
  for (let i = 0; i < groupStandings.length; i++) {
    const standings = groupStandings[i].standings
    const groupSize = standings.length
    
    // Determine how many move up and down
    const numMoveUp = Math.min(moveCount, groupSize)
    const numMoveDown = Math.min(moveCount, groupSize)
    
    // Get athletes staying, moving up, moving down
    let stayingAthletes = []
    let movingUp = []
    let movingDown = []
    
    if (i === 0) {
      // Top group: top performers stay, bottom move down
      movingDown = standings.slice(-numMoveDown).map(s => s.athleteId)
      stayingAthletes = standings.slice(0, -numMoveDown).map(s => s.athleteId)
    } else if (i === groupStandings.length - 1) {
      // Bottom group: top performers move up, bottom stay
      movingUp = standings.slice(0, numMoveUp).map(s => s.athleteId)
      stayingAthletes = standings.slice(numMoveUp).map(s => s.athleteId)
    } else {
      // Middle groups: top move up, bottom move down, middle stay
      movingUp = standings.slice(0, numMoveUp).map(s => s.athleteId)
      movingDown = standings.slice(-numMoveDown).map(s => s.athleteId)
      stayingAthletes = standings.slice(numMoveUp, -numMoveDown).map(s => s.athleteId)
    }
    
    newGroups[i] = {
      stayingAthletes,
      movingUp,
      movingDown
    }
  }
  
  // Build new groups with movement
  const finalGroups = []
  
  for (let i = 0; i < groupStandings.length; i++) {
    let groupAthletes = [...newGroups[i].stayingAthletes]
    
    // Add athletes moving up from group below
    if (i < groupStandings.length - 1 && newGroups[i + 1].movingUp) {
      groupAthletes.push(...newGroups[i + 1].movingUp)
    }
    
    // Add athletes moving down from group above
    if (i > 0 && newGroups[i - 1].movingDown) {
      groupAthletes.push(...newGroups[i - 1].movingDown)
    }
    
    finalGroups.push(groupAthletes)
  }
  
  // Convert athlete IDs to full athlete objects
  const finalGroupsWithAthletes = finalGroups.map(group => 
    group.map(athleteId => store.athletes.find(a => a.id === athleteId)).filter(Boolean)
  )
  
  // Generate matches for new groups
  const nextRound = previousRound + 1
  const newMatches = []
  
  finalGroupsWithAthletes.forEach((group, groupIndex) => {
    if (group.length >= 4) { // Only generate if group has enough players
      const matches = generateGroupMatches(group, gameDayId, nextRound, groupIndex + 1)
      matches.forEach(match => {
        store.matches.push(match)
        gameDay.matches.push(match.id)
        newMatches.push(match)
      })
    }
  })
  
  return {
    success: true,
    round: nextRound,
    matchesGenerated: newMatches.length,
    groups: finalGroupsWithAthletes.length
  }
}

// GET /api/gamedays/:id/matches - Get matches for a game day
gameDayRoutes.get('/:id/matches', (req, res) => {
  const { round, group } = req.query
  
  let matches = store.matches.filter(m => m.gameDayId === req.params.id)
  
  if (round) {
    matches = matches.filter(m => m.round === parseInt(round))
  }
  
  if (group) {
    matches = matches.filter(m => m.group === parseInt(group))
  }
  
  res.json(matches)
})

// GET /api/gamedays/:id/leaderboard - Get group leaderboard
gameDayRoutes.get('/:id/leaderboard', (req, res) => {
  const { round, group } = req.query
  const gameDay = store.gameDays.find(gd => gd.id === req.params.id)
  
  if (!gameDay) {
    return res.status(404).json({ error: 'Game day not found' })
  }
  
  // TODO: Calculate leaderboard based on match results
  // For now, return empty leaderboard
  res.json([])
})

