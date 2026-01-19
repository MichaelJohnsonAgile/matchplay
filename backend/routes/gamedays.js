import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import * as db from '../database/queries.js'

export const gameDayRoutes = express.Router()

// GET /api/gamedays - Get all game days
gameDayRoutes.get('/', async (req, res) => {
  try {
    const gameDays = await db.getAllGameDays()
    
    // Add stats to each game day and auto-update status
    const gameDaysWithStats = await Promise.all(
      gameDays.map(async (gd) => {
        const stats = await db.getGameDayStats(gd.id)
        
        // Auto-update status if needed
        const updatedStatus = await checkAndUpdateGameDayStatus(gd.id, gd.status, gd.date, stats.matchCount)
        
        return {
          id: gd.id,
          date: gd.date instanceof Date ? gd.date.toISOString().split('T')[0] : gd.date,
          venue: gd.venue,
          status: updatedStatus,
          settings: {
            format: gd.format,
            pointsToWin: gd.points_to_win,
            winByMargin: gd.win_by_margin,
            numberOfRounds: gd.number_of_rounds,
            movementRule: gd.movement_rule
          },
          ...stats
        }
      })
    )
    
    res.json(gameDaysWithStats)
  } catch (error) {
    console.error('Error getting game days:', error)
    res.status(500).json({ error: 'Failed to fetch game days' })
  }
})

// GET /api/gamedays/:id - Get single game day
gameDayRoutes.get('/:id', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    const stats = await db.getGameDayStats(gameDay.id)
    
    // Auto-update status if needed
    const updatedStatus = await checkAndUpdateGameDayStatus(gameDay.id, gameDay.status, gameDay.date, stats.matchCount)
    
    const gameDayWithStats = {
      id: gameDay.id,
      date: gameDay.date instanceof Date ? gameDay.date.toISOString().split('T')[0] : gameDay.date,
      venue: gameDay.venue,
      status: updatedStatus,
      settings: {
        format: gameDay.format,
        pointsToWin: gameDay.points_to_win,
        winByMargin: gameDay.win_by_margin,
        numberOfRounds: gameDay.number_of_rounds,
        movementRule: gameDay.movement_rule
      },
      ...stats
    }
    
    res.json(gameDayWithStats)
  } catch (error) {
    console.error('Error getting game day:', error)
    res.status(500).json({ error: 'Failed to fetch game day' })
  }
})

// POST /api/gamedays - Create new game day
gameDayRoutes.post('/', async (req, res) => {
  try {
    const { date, venue, format, pointsToWin, winByMargin, rounds, movementRule, numberOfTeams } = req.body
    
    if (!date || !venue) {
      return res.status(400).json({ error: 'Date and venue are required' })
    }
    
    const newGameDay = await db.createGameDay({
      id: `gd-${uuidv4()}`,
      date,
      venue,
      status: 'upcoming',
      format: format || 'group',
      pointsToWin: pointsToWin || 11,
      winByMargin: winByMargin || 2,
      numberOfRounds: rounds || 3,
      movementRule: movementRule || 'auto',
      numberOfTeams: numberOfTeams || 2
    })
    
    const stats = await db.getGameDayStats(newGameDay.id)
    
  res.status(201).json({
    id: newGameDay.id,
    date: newGameDay.date instanceof Date ? newGameDay.date.toISOString().split('T')[0] : newGameDay.date,
    venue: newGameDay.venue,
    status: newGameDay.status,
    settings: {
      format: newGameDay.format,
      pointsToWin: newGameDay.points_to_win,
      winByMargin: newGameDay.win_by_margin,
      numberOfRounds: newGameDay.number_of_rounds,
      movementRule: newGameDay.movement_rule,
      numberOfTeams: newGameDay.number_of_teams
    },
    ...stats
  })
  } catch (error) {
    console.error('Error creating game day:', error)
    res.status(500).json({ error: 'Failed to create game day' })
  }
})

// PUT /api/gamedays/:id - Update game day
gameDayRoutes.put('/:id', async (req, res) => {
  try {
    const updatedGameDay = await db.updateGameDay(req.params.id, req.body)
    if (!updatedGameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    res.json({
      id: updatedGameDay.id,
      date: updatedGameDay.date instanceof Date ? updatedGameDay.date.toISOString().split('T')[0] : updatedGameDay.date,
      venue: updatedGameDay.venue,
      status: updatedGameDay.status,
      settings: {
        format: updatedGameDay.format,
        pointsToWin: updatedGameDay.points_to_win,
        winByMargin: updatedGameDay.win_by_margin,
        numberOfRounds: updatedGameDay.number_of_rounds,
        movementRule: updatedGameDay.movement_rule,
        numberOfTeams: updatedGameDay.number_of_teams
      }
    })
  } catch (error) {
    console.error('Error updating game day:', error)
    res.status(500).json({ error: 'Failed to update game day' })
  }
})

// DELETE /api/gamedays/:id - Delete game day
gameDayRoutes.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteGameDay(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting game day:', error)
    res.status(500).json({ error: 'Failed to delete game day' })
  }
})

// GET /api/gamedays/:id/athletes - Get athletes for a game day with game-day-specific stats
gameDayRoutes.get('/:id/athletes', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    // Sync ranks from season leaderboard to ensure ranks are current
    await db.syncAthleteRanks()
    
    const athletes = await db.getGameDayAthletes(req.params.id)
    
    // Get game-day-specific stats for each athlete
    const athletesWithStats = await Promise.all(
      athletes.map(async (athlete) => {
        const stats = await db.getGameDayAthleteStats(req.params.id, athlete.id)
        return {
          ...athlete,
          stats
        }
      })
    )
    
    res.json(athletesWithStats)
  } catch (error) {
    console.error('Error getting game day athletes:', error)
    res.status(500).json({ error: 'Failed to fetch game day athletes' })
  }
})

// POST /api/gamedays/:id/athletes - Add athletes to game day
gameDayRoutes.post('/:id/athletes', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    const { athleteIds } = req.body
    if (!athleteIds || !Array.isArray(athleteIds)) {
      return res.status(400).json({ error: 'athleteIds array is required' })
    }
    
    await db.addAthletesToGameDay(req.params.id, athleteIds)
    const athleteCount = await db.getGameDayAthleteCount(req.params.id)
    
    res.json({ message: 'Athletes added', athleteCount })
  } catch (error) {
    console.error('Error adding athletes to game day:', error)
    res.status(500).json({ error: 'Failed to add athletes to game day' })
  }
})

// DELETE /api/gamedays/:id/athletes/:athleteId - Remove athlete from game day
gameDayRoutes.delete('/:id/athletes/:athleteId', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    await db.removeAthleteFromGameDay(req.params.id, req.params.athleteId)
    const athleteCount = await db.getGameDayAthleteCount(req.params.id)
    
    res.json({ message: 'Athlete removed', athleteCount })
  } catch (error) {
    console.error('Error removing athlete from game day:', error)
    res.status(500).json({ error: 'Failed to remove athlete from game day' })
  }
})

// GET /api/gamedays/:id/draw-preview - Preview group allocation before generating
gameDayRoutes.get('/:id/draw-preview', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    const athletes = await db.getGameDayAthletes(req.params.id)
    const numAthletes = athletes.length
    
    if (numAthletes < 8) {
      return res.json({
        canGenerate: false,
        reason: 'At least 8 athletes required',
        currentCount: numAthletes,
        needed: 8 - numAthletes
      })
    }
    
    const allocation = calculateGroupAllocation(numAthletes)
    
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
  } catch (error) {
    console.error('Error getting draw preview:', error)
    res.status(500).json({ error: 'Failed to get draw preview' })
  }
})

// POST /api/gamedays/:id/generate-draw - Generate match draw
gameDayRoutes.post('/:id/generate-draw', async (req, res) => {
  try {
    console.log(`Generating draw for game day: ${req.params.id}`)
    
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      console.log(`Game day not found: ${req.params.id}`)
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    console.log(`Game day found: ${gameDay.id}, format: ${gameDay.format}`)
    
    // Sync athlete ranks from main leaderboard before generating draw
    console.log('Syncing athlete ranks from season leaderboard...')
    await db.syncAthleteRanks()
    
    const athletes = await db.getGameDayAthletes(req.params.id)
    const numAthletes = athletes.length
    
    console.log(`Found ${numAthletes} athletes`)
    
    // Clear existing matches for this game day
    console.log('Clearing existing matches...')
    await db.deleteMatchesByGameDay(req.params.id)
    
    // Check format and route to appropriate generator
    if (gameDay.format === 'teams') {
      // TEAMS MODE
      return await generateTeamsMatches(req.params.id, gameDay, res)
    } else if (gameDay.format === 'pairs') {
      // PAIRS MODE - Round-robin
      return await generatePairsMatches(req.params.id, gameDay, res)
    } else {
      // GROUP MODE (existing logic)
      // Validate minimum athletes
      if (numAthletes < 8) {
        console.log(`Not enough athletes: ${numAthletes}`)
        return res.status(400).json({ 
          error: 'At least 8 athletes required to generate draw',
          currentCount: numAthletes
        })
      }
      
      console.log('Athletes sorted by rank:', athletes.map(a => `${a.name} (Rank ${a.rank})`))
      
      // Calculate group allocation
      console.log('Calculating group allocation...')
      const allocation = calculateGroupAllocation(numAthletes)
      
      // Check if allocation failed
      if (allocation.error) {
        console.log(`Allocation error: ${allocation.description}`)
        return res.status(400).json({ 
          error: allocation.description,
          suggestion: 'Add or remove athletes to reach a valid group size'
        })
      }
      
      console.log(`Allocation: ${allocation.description}`)
      
      // Create groups based on allocation
      const groups = []
      let athleteIndex = 0
      
      for (let i = 0; i < allocation.numGroups; i++) {
        const groupSize = allocation.groupSizes[i]
        groups.push(athletes.slice(athleteIndex, athleteIndex + groupSize))
        athleteIndex += groupSize
      }
      
      console.log(`Created ${groups.length} groups`)
      
      // Generate matches for Round 1
      let totalMatches = 0
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        console.log(`Generating matches for group ${groupIndex + 1}...`)
        const matches = generateGroupMatches(groups[groupIndex], req.params.id, 1, groupIndex + 1)
        for (const match of matches) {
          await db.createMatch(match)
          totalMatches++
        }
      }
      
      console.log(`✅ Generated ${totalMatches} matches`)
      
      res.json({ 
        message: 'Draw generated successfully',
        matchesGenerated: totalMatches,
        groups: allocation.numGroups,
        groupSizes: allocation.groupSizes,
        allocation: allocation.description,
        success: true
      })
    }
  } catch (error) {
    console.error('❌ Error generating draw:', error)
    console.error('Error stack:', error.stack)
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Database connection failed',
        message: 'Unable to connect to database. Please check DATABASE_URL environment variable.',
        details: error.message
      })
    }
    
    if (error.code === '42P01') {
      return res.status(503).json({ 
        error: 'Database not initialized',
        message: 'Database tables not found. Please run: npm run db:init',
        details: error.message
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to generate draw',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// POST /api/gamedays/:id/generate-next-round - Generate next round based on previous results
gameDayRoutes.post('/:id/generate-next-round', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    // Find the latest round
    const matches = await db.getMatchesByGameDay(req.params.id)
    if (matches.length === 0) {
      return res.status(400).json({ error: 'No previous round found. Generate initial draw first.' })
    }
    
    const latestRound = Math.max(...matches.map(m => m.round))
    
    // Check if we've reached max rounds
    if (latestRound >= gameDay.number_of_rounds) {
      return res.status(400).json({ 
        error: 'All rounds have been generated',
        currentRound: latestRound,
        maxRounds: gameDay.number_of_rounds
      })
    }
    
    // Generate next round
    const result = await generateNextRound(req.params.id, latestRound, gameDay)
    
    if (result.error) {
      return res.status(400).json(result)
    }
    
    res.json({
      message: `Round ${result.round} generated successfully`,
      ...result
    })
  } catch (error) {
    console.error('Error generating next round:', error)
    res.status(500).json({ error: 'Failed to generate next round' })
  }
})

// POST /api/gamedays/:id/cancel-draw - Cancel draw and delete all matches
gameDayRoutes.post('/:id/cancel-draw', async (req, res) => {
  try {
    const gameDay = await db.getGameDayById(req.params.id)
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    // Delete all matches for this game day
    const matchCount = await db.deleteMatchesByGameDay(req.params.id)
    
    console.log(`Cancelled draw for game day ${gameDay.id}: deleted ${matchCount} matches`)
    
    res.json({ 
      message: 'Draw cancelled successfully',
      matchesDeleted: matchCount,
      success: true
    })
  } catch (error) {
    console.error('Error cancelling draw:', error)
    res.status(500).json({ error: 'Failed to cancel draw' })
  }
})

// GET /api/gamedays/:id/matches - Get matches for a game day
gameDayRoutes.get('/:id/matches', async (req, res) => {
  try {
    const { round, group } = req.query
    
    const filters = {}
    if (round) filters.round = parseInt(round)
    if (group) filters.group = parseInt(group)
    
    const matches = await db.getMatchesByGameDay(req.params.id, filters)
    res.json(matches)
  } catch (error) {
    console.error('Error getting matches:', error)
    res.status(500).json({ error: 'Failed to fetch matches' })
  }
})

// GET /api/gamedays/:id/leaderboard - Get group leaderboard
gameDayRoutes.get('/:id/leaderboard', async (req, res) => {
  try {
    const { round, group } = req.query
    const gameDay = await db.getGameDayById(req.params.id)
    
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    // TODO: Calculate leaderboard based on match results
    // For now, return empty leaderboard
    res.json([])
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// ============= HELPER FUNCTIONS =============

// Helper function to automatically check and update game day status
async function checkAndUpdateGameDayStatus(gameDayId, currentStatus, gameDate, matchCount) {
  // If already completed, no need to check
  if (currentStatus === 'completed') {
    return currentStatus
  }
  
  // Check if all matches are completed
  if (matchCount > 0) {
    const matches = await db.getMatchesByGameDay(gameDayId)
    const completedMatches = matches.filter(m => m.winner !== null)
    
    if (completedMatches.length === matches.length) {
      // All matches complete - update to completed
      await db.updateGameDay(gameDayId, { status: 'completed' })
      console.log(`Auto-updated game day ${gameDayId} to completed (all matches done)`)
      return 'completed'
    }
  }
  
  return currentStatus
}

// Helper function to calculate optimal group allocation
function calculateGroupAllocation(numAthletes) {
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
    const matchConfigs = [
      { teamA: [0, 1], teamB: [2, 3] },
      { teamA: [0, 2], teamB: [1, 3] },
      { teamA: [0, 3], teamB: [1, 2] }
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
    const matchConfigs = [
      { teamA: [0, 1], teamB: [2, 3], bye: 4 },
      { teamA: [0, 2], teamB: [3, 4], bye: 1 },
      { teamA: [0, 3], teamB: [1, 4], bye: 2 },
      { teamA: [0, 4], teamB: [1, 2], bye: 3 },
      { teamA: [1, 3], teamB: [2, 4], bye: 0 }
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
        bye: group[config.bye].id,
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
  const movementRule = gameDay.movement_rule || 'auto'
  
  if (movementRule === 'auto') {
    return allocation.has5PlayerGroups ? '2' : '1'
  }
  
  return movementRule
}

// Helper function to calculate group standings from completed matches
async function calculateGroupStandings(gameDayId, round, groupNumber) {
  const matches = await db.getMatchesByGameDay(gameDayId, { round, group: groupNumber })
  const completedMatches = matches.filter(m => m.winner !== null)
  
  if (completedMatches.length === 0) return []
  
  const athleteIds = new Set()
  completedMatches.forEach(match => {
    match.teamA.players.forEach(id => athleteIds.add(id))
    match.teamB.players.forEach(id => athleteIds.add(id))
  })
  
  const standings = Array.from(athleteIds).map(athleteId => {
    let wins = 0
    let losses = 0
    let pointsFor = 0
    let pointsAgainst = 0
    let matchesPlayed = 0
    
    completedMatches.forEach(match => {
      const inTeamA = match.teamA.players.includes(athleteId)
      const inTeamB = match.teamB.players.includes(athleteId)
      const isBye = match.bye === athleteId
      
      if (isBye) return
      
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
  
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff
    return b.pointsFor - a.pointsFor
  })
  
  return standings
}

// Helper function to generate next round with movement
async function generateNextRound(gameDayId, previousRound, gameDay) {
  const previousMatches = await db.getMatchesByGameDay(gameDayId, { round: previousRound })
  
  if (previousMatches.length === 0) {
    return { error: 'No matches found for previous round' }
  }
  
  const incompletMatches = previousMatches.filter(m => m.winner === null)
  if (incompletMatches.length > 0) {
    return { 
      error: 'Not all matches completed',
      incomplete: incompletMatches.length 
    }
  }
  
  const groupNumbers = [...new Set(previousMatches.map(m => m.group))].sort((a, b) => a - b)
  
  const groupStandings = await Promise.all(
    groupNumbers.map(async (groupNum) => ({
      groupNumber: groupNum,
      standings: await calculateGroupStandings(gameDayId, previousRound, groupNum)
    }))
  )
  
  const athletes = await db.getGameDayAthletes(gameDayId)
  const allocation = calculateGroupAllocation(athletes.length)
  const movementRule = getEffectiveMovementRule(gameDay, allocation)
  const moveCount = parseInt(movementRule)
  
  const newGroups = []
  
  for (let i = 0; i < groupStandings.length; i++) {
    const standings = groupStandings[i].standings
    const groupSize = standings.length
    
    const numMoveUp = Math.min(moveCount, groupSize)
    const numMoveDown = Math.min(moveCount, groupSize)
    
    let stayingAthletes = []
    let movingUp = []
    let movingDown = []
    
    if (i === 0) {
      movingDown = standings.slice(-numMoveDown).map(s => s.athleteId)
      stayingAthletes = standings.slice(0, -numMoveDown).map(s => s.athleteId)
    } else if (i === groupStandings.length - 1) {
      movingUp = standings.slice(0, numMoveUp).map(s => s.athleteId)
      stayingAthletes = standings.slice(numMoveUp).map(s => s.athleteId)
    } else {
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
  
  const finalGroups = []
  
  for (let i = 0; i < groupStandings.length; i++) {
    let groupAthletes = [...newGroups[i].stayingAthletes]
    
    if (i < groupStandings.length - 1 && newGroups[i + 1].movingUp) {
      groupAthletes.push(...newGroups[i + 1].movingUp)
    }
    
    if (i > 0 && newGroups[i - 1].movingDown) {
      groupAthletes.push(...newGroups[i - 1].movingDown)
    }
    
    finalGroups.push(groupAthletes)
  }
  
  const finalGroupsWithAthletes = finalGroups.map(group => 
    group.map(athleteId => athletes.find(a => a.id === athleteId)).filter(Boolean)
  )
  
  const nextRound = previousRound + 1
  let newMatchesCount = 0
  
  for (let groupIndex = 0; groupIndex < finalGroupsWithAthletes.length; groupIndex++) {
    const group = finalGroupsWithAthletes[groupIndex]
    if (group.length >= 4) {
      const matches = generateGroupMatches(group, gameDayId, nextRound, groupIndex + 1)
      for (const match of matches) {
        await db.createMatch(match)
        newMatchesCount++
      }
    }
  }
  
  return {
    success: true,
    round: nextRound,
    matchesGenerated: newMatchesCount,
    groups: finalGroupsWithAthletes.length
  }
}

// Helper function to schedule matches into rounds (ensures no player plays twice per round)
// Optimised to maximise matches per round
function scheduleMatchesIntoRounds(matches) {
  // Get all unique players to calculate max matches per round
  const allPlayers = new Set()
  for (const match of matches) {
    match.teamA.players.forEach(p => allPlayers.add(p))
    match.teamB.players.forEach(p => allPlayers.add(p))
  }
  const numPlayers = allPlayers.size
  const maxMatchesPerRound = Math.floor(numPlayers / 4)
  
  console.log(`Scheduling ${matches.length} matches for ${numPlayers} players (max ${maxMatchesPerRound} matches/round)`)
  
  // Create a working copy of matches (unscheduled)
  const unscheduled = [...matches]
  const scheduled = []
  
  // Track which players are busy in each round
  const roundPlayers = {} // { roundNumber: Set of playerIds }
  const roundMatchCount = {} // { roundNumber: count }
  
  let currentRound = 1
  
  // Keep scheduling until all matches are assigned
  while (unscheduled.length > 0) {
    // Initialise current round tracking
    if (!roundPlayers[currentRound]) {
      roundPlayers[currentRound] = new Set()
      roundMatchCount[currentRound] = 0
    }
    
    // Try to fill this round to capacity
    let addedAnyThisPass = false
    
    for (let i = unscheduled.length - 1; i >= 0; i--) {
      const match = unscheduled[i]
      const matchPlayers = [
        ...match.teamA.players,
        ...match.teamB.players
      ]
      
      // Check if this match can fit in the current round
      const hasConflict = matchPlayers.some(playerId => roundPlayers[currentRound].has(playerId))
      
      if (!hasConflict && roundMatchCount[currentRound] < maxMatchesPerRound) {
        // Assign this match to this round
        match.round = currentRound
        matchPlayers.forEach(playerId => roundPlayers[currentRound].add(playerId))
        roundMatchCount[currentRound]++
        
        // Move from unscheduled to scheduled
        scheduled.push(match)
        unscheduled.splice(i, 1)
        addedAnyThisPass = true
      }
    }
    
    // If round is full or we couldn't add any more matches, move to next round
    if (roundMatchCount[currentRound] >= maxMatchesPerRound || !addedAnyThisPass) {
      console.log(`Round ${currentRound}: ${roundMatchCount[currentRound]} matches`)
      currentRound++
    }
  }
  
  // Log final round if it has matches
  if (roundMatchCount[currentRound] && roundMatchCount[currentRound] > 0) {
    console.log(`Round ${currentRound}: ${roundMatchCount[currentRound]} matches`)
  }
  
  // Sort scheduled matches by round for cleaner output
  scheduled.sort((a, b) => a.round - b.round)
  
  return scheduled
}

// Helper function to generate matches for teams mode
// For 2 teams: Uses systematic scheduling to ensure everyone plays against everyone
// For 4 teams: Uses fixed rotation pattern
async function generateTeamsMatches(gameDayId, gameDay, res) {
  try {
    console.log('Generating matches for TEAMS mode')
    
    // Get teams for this game day
    const teams = await db.getTeamsByGameDay(gameDayId)
    
    if (teams.length === 0) {
      return res.status(400).json({
        error: 'No teams found. Please generate teams first.',
        suggestion: 'Go to the Teams tab and click "Generate Teams"'
      })
    }
    
    console.log(`Found ${teams.length} teams`)
    
    // Get team members
    const teamData = await Promise.all(teams.map(async (team) => {
      const members = await db.getTeamMembers(team.id)
      return {
        team,
        members
      }
    }))
    
    // Sort teams by team_number to ensure consistent ordering
    teamData.sort((a, b) => a.team.team_number - b.team.team_number)
    
    const numberOfTeams = teams.length
    
    // Route to appropriate generator
    if (numberOfTeams === 2) {
      return await generateTwoTeamsMatches(gameDayId, teamData, res)
    } else {
      return await generateFourTeamsMatches(gameDayId, teamData, res)
    }
    
  } catch (error) {
    console.error('Error generating teams matches:', error)
    throw error
  }
}

// Generate matches for 2-team format (Blue vs Red)
// Rotating partnerships AND matchups:
// - Partnerships change each round (rotate through different partner combos)
// - Blue rotates forward, Red rotates backward (inverse rotation)
// - 8 rounds, 3 matches per round
async function generateTwoTeamsMatches(gameDayId, teamData, res) {
  const blueTeam = teamData[0] // Team 1 = Blue
  const redTeam = teamData[1]  // Team 2 = Red
  
  // Sort players by rank (ascending: rank 1 first)
  const bluePlayers = [...blueTeam.members].sort((a, b) => a.rank - b.rank)
  const redPlayers = [...redTeam.members].sort((a, b) => a.rank - b.rank)
  
  const blueCount = bluePlayers.length
  const redCount = redPlayers.length
  
  console.log(`2-Team mode: ${blueCount} Blue vs ${redCount} Red`)
  console.log('Blue players by rank:', bluePlayers.map(p => `${p.name}(${p.rank})`).join(', '))
  console.log('Red players by rank:', redPlayers.map(p => `${p.name}(${p.rank})`).join(', '))
  
  // Partnership rotations for 6 players (indices 0-5 representing ranks 1-6)
  // Each config has 3 pairs that cover all 6 players
  // Designed so each player partners with different people across rounds
  const partnershipRotations = [
    [[0, 5], [1, 4], [2, 3]],  // Round 1: 1+6, 2+5, 3+4
    [[0, 4], [1, 3], [2, 5]],  // Round 2: 1+5, 2+4, 3+6
    [[0, 3], [1, 2], [4, 5]],  // Round 3: 1+4, 2+3, 5+6
    [[0, 2], [1, 5], [3, 4]],  // Round 4: 1+3, 2+6, 4+5
    [[0, 1], [2, 4], [3, 5]],  // Round 5: 1+2, 3+5, 4+6
    [[0, 5], [1, 3], [2, 4]],  // Round 6: 1+6, 2+4, 3+5
    [[0, 4], [1, 2], [3, 5]],  // Round 7: 1+5, 2+3, 4+6
    [[0, 3], [1, 4], [2, 5]],  // Round 8: 1+4, 2+5, 3+6
  ]
  
  const numberOfRounds = 8
  const scheduledMatches = []
  
  for (let round = 1; round <= numberOfRounds; round++) {
    console.log(`\nRound ${round}:`)
    
    // Blue team uses rotations going forward (0, 1, 2, 3, 4, 5, 6, 7)
    const blueRotationIdx = (round - 1) % partnershipRotations.length
    
    // Red team uses rotations going backward (inverse) for variety
    // This ensures Blue and Red pairs don't always match up the same way
    const redRotationIdx = (partnershipRotations.length - 1 - ((round - 1) % partnershipRotations.length))
    
    const bluePairings = partnershipRotations[blueRotationIdx]
    const redPairings = partnershipRotations[redRotationIdx]
    
    console.log(`  Blue rotation: ${blueRotationIdx + 1}, Red rotation: ${redRotationIdx + 1}`)
    
    // Create 3 matches for this round
    for (let matchIdx = 0; matchIdx < 3; matchIdx++) {
      const bluePair = bluePairings[matchIdx]
      const redPair = redPairings[matchIdx]
      
      const bluePlayer1 = bluePlayers[bluePair[0]]
      const bluePlayer2 = bluePlayers[bluePair[1]]
      const redPlayer1 = redPlayers[redPair[0]]
      const redPlayer2 = redPlayers[redPair[1]]
      
      console.log(`  Match ${matchIdx + 1}: ${bluePlayer1.name}+${bluePlayer2.name} vs ${redPlayer1.name}+${redPlayer2.name}`)
      
      const matchId = `match-${uuidv4()}`
      scheduledMatches.push({
        id: matchId,
        gameDayId,
        round,
        group: 1,
        court: null,
        teamA: {
          players: [bluePlayer1.id, bluePlayer2.id],
          score: null
        },
        teamB: {
          players: [redPlayer1.id, redPlayer2.id],
          score: null
        },
        teamATeamId: blueTeam.team.id,
        teamBTeamId: redTeam.team.id,
        bye: null,
        status: 'pending',
        winner: null,
        timestamp: null
      })
    }
  }
  
  // Save matches to database
  for (const match of scheduledMatches) {
    await db.createMatch(match)
  }
  
  const totalMatches = scheduledMatches.length
  const gamesPerPlayer = numberOfRounds // Everyone plays once per round
  
  console.log(`\n✅ Generated ${totalMatches} team matches across ${numberOfRounds} rounds`)
  console.log(`Each player plays ${gamesPerPlayer} games with different partners each round`)
  
  return res.json({
    message: 'Teams matches generated successfully',
    matchesGenerated: totalMatches,
    rounds: numberOfRounds,
    teams: 2,
    format: 'teams',
    gamesPerPlayer: { min: gamesPerPlayer, max: gamesPerPlayer, avg: gamesPerPlayer },
    success: true
  })
}

// Generate matches for 4-team format
async function generateFourTeamsMatches(gameDayId, teamData, res) {
  // Get all players with team info
  const allPlayers = []
  teamData.forEach(({ team, members }) => {
    members.forEach(member => {
      allPlayers.push({
        ...member,
        teamId: team.id,
        teamNumber: team.team_number
      })
    })
  })
  
  const totalPlayers = allPlayers.length
  const numberOfTeams = teamData.length
  
  // Generate all possible pairs per team
  const teamPairs = new Map() // teamId -> array of pairs
  teamData.forEach(({ team, members }) => {
    const pairs = []
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        pairs.push({
          teamId: team.id,
          teamNumber: team.team_number,
          player1: members[i],
          player2: members[j]
        })
      }
    }
    teamPairs.set(team.id, pairs)
  })
  
  console.log('Pairs per team:', teamData.map(td => `Team ${td.team.team_number}: ${teamPairs.get(td.team.id).length} pairs`))
  
  // Track games played per player
  const playerGameCount = new Map()
  allPlayers.forEach(p => playerGameCount.set(p.id, 0))
  
  // Track pair usage to vary partnerships
  const pairUsageCount = new Map() // "player1Id-player2Id" -> count
  
  // Track match-ups to avoid exact duplicates
  const matchupHistory = new Set() // "pairAKey-pairBKey"
  
  // Track versus pairings - who has faced whom (to guarantee everyone faces everyone)
  const versusTracker = new Map()
  allPlayers.forEach(p => versusTracker.set(p.id, new Set()))
  
  // Calculate versus stats for logging
  const playersPerTeam = teamData[0]?.members.length || 0
  const versusPerPlayer = playersPerTeam * (numberOfTeams - 1)
  const totalVersusPairings = (totalPlayers * versusPerPlayer) / 2
  console.log(`Target: ${versusPerPlayer} opponents per player, ${totalVersusPairings} total unique versus pairings`)
  
  const scheduledMatches = []
  
  // Define the fixed rotation for 4 teams (Blue=1, Red=2, Green=3, Yellow=4)
  // Each round has 2 team matchups, each matchup produces 2 games = 4 games per round
  // Pattern repeats every 3 rounds
  const fourTeamRotation = [
    // Round pattern 1: Blue vs Red, Green vs Yellow
    [{ teamA: 1, teamB: 2 }, { teamA: 3, teamB: 4 }],
    // Round pattern 2: Blue vs Yellow, Red vs Green
    [{ teamA: 1, teamB: 4 }, { teamA: 2, teamB: 3 }],
    // Round pattern 3: Blue vs Green, Red vs Yellow
    [{ teamA: 1, teamB: 3 }, { teamA: 2, teamB: 4 }]
  ]
  
  const gamesPerRound = 4
  const gamesPerMatchup = 2
  
  // Target: everyone plays ~8 games
  const targetGamesPerPlayer = 8
  const targetRounds = Math.ceil((totalPlayers * targetGamesPerPlayer) / (gamesPerRound * 4))
  
  console.log(`Planning ${targetRounds} rounds with ${gamesPerRound} games each`)
  console.log(`Target: each player plays ~${targetGamesPerPlayer} games`)
  
  // Track team matchup counts for logging
  const teamMatchupCount = new Map()
  
  for (let round = 1; round <= targetRounds; round++) {
    const roundMatches = []
    const playersInRound = new Set()
    
    // Get the rotation pattern for this round (cycles every 3 rounds)
    const rotationIndex = (round - 1) % fourTeamRotation.length
    const roundMatchups = fourTeamRotation[rotationIndex]
    
    console.log(`Round ${round} (pattern ${rotationIndex + 1}): ${roundMatchups.map(m => `Team${m.teamA} vs Team${m.teamB}`).join(', ')}`)
    
    // For each team matchup in this round
    for (const matchup of roundMatchups) {
      const teamAData = teamData.find(td => td.team.team_number === matchup.teamA)
      const teamBData = teamData.find(td => td.team.team_number === matchup.teamB)
      
      if (!teamAData || !teamBData) continue
      
      const pairsA = teamPairs.get(teamAData.team.id)
      const pairsB = teamPairs.get(teamBData.team.id)
      
      // Generate 2 games for this matchup
      for (let gameNum = 0; gameNum < gamesPerMatchup; gameNum++) {
        // Find best pair from each team that isn't already playing this round
        const match = findBestPairMatch(
          pairsA,
          pairsB,
          playersInRound,
          playerGameCount,
          pairUsageCount,
          matchupHistory,
          versusTracker
        )
        
        if (match) {
          const matchId = `match-${uuidv4()}`
          roundMatches.push({
            id: matchId,
            gameDayId,
            round,
            group: 1,
            court: null,
            teamA: {
              players: [match.pairA.player1.id, match.pairA.player2.id],
              score: null
            },
            teamB: {
              players: [match.pairB.player1.id, match.pairB.player2.id],
              score: null
            },
            teamATeamId: match.pairA.teamId,
            teamBTeamId: match.pairB.teamId,
            bye: null,
            status: 'pending',
            winner: null,
            timestamp: null
          })
          
          // Update tracking
          const matchPlayers = [
            match.pairA.player1.id, match.pairA.player2.id,
            match.pairB.player1.id, match.pairB.player2.id
          ]
          matchPlayers.forEach(pid => {
            playersInRound.add(pid)
            playerGameCount.set(pid, playerGameCount.get(pid) + 1)
          })
          
          // Update pair usage
          const pairAKey = [match.pairA.player1.id, match.pairA.player2.id].sort().join('-')
          const pairBKey = [match.pairB.player1.id, match.pairB.player2.id].sort().join('-')
          pairUsageCount.set(pairAKey, (pairUsageCount.get(pairAKey) || 0) + 1)
          pairUsageCount.set(pairBKey, (pairUsageCount.get(pairBKey) || 0) + 1)
          
          // Record matchup
          const matchupKey = [pairAKey, pairBKey].sort().join('|')
          matchupHistory.add(matchupKey)
          
          // Update team matchup count
          const teamMatchupKey = [match.pairA.teamNumber, match.pairB.teamNumber].sort().join('-')
          teamMatchupCount.set(teamMatchupKey, (teamMatchupCount.get(teamMatchupKey) || 0) + 1)
          
          // Update versus tracker
          const teamAPlayers = [match.pairA.player1.id, match.pairA.player2.id]
          const teamBPlayers = [match.pairB.player1.id, match.pairB.player2.id]
          for (const pA of teamAPlayers) {
            for (const pB of teamBPlayers) {
              versusTracker.get(pA).add(pB)
              versusTracker.get(pB).add(pA)
            }
          }
        }
      }
    }
    
    console.log(`Round ${round}: ${roundMatches.length} matches`)
    scheduledMatches.push(...roundMatches)
  }
  
  // Log game distribution
  const gameCounts = Array.from(playerGameCount.values())
  const minGames = Math.min(...gameCounts)
  const maxGames = Math.max(...gameCounts)
  const avgGames = (gameCounts.reduce((a, b) => a + b, 0) / gameCounts.length).toFixed(1)
  console.log(`Games per player: min=${minGames}, max=${maxGames}, avg=${avgGames}`)
  
  // Log team matchup distribution
  console.log('Team matchup distribution:')
  const teamNames = { 1: 'Blue', 2: 'Red', 3: 'Green', 4: 'Yellow' }
  for (const [key, count] of teamMatchupCount.entries()) {
    const [t1, t2] = key.split('-').map(Number)
    console.log(`  ${teamNames[t1] || t1} vs ${teamNames[t2] || t2}: ${count} matches`)
  }
  
  // Log versus coverage stats
  let totalCoveredPairings = 0
  let minOpponentsFaced = Infinity
  let maxOpponentsFaced = 0
  let playersWithFullCoverage = 0
  
  for (const [playerId, opponents] of versusTracker.entries()) {
    const opponentCount = opponents.size
    totalCoveredPairings += opponentCount
    minOpponentsFaced = Math.min(minOpponentsFaced, opponentCount)
    maxOpponentsFaced = Math.max(maxOpponentsFaced, opponentCount)
    if (opponentCount >= versusPerPlayer) {
      playersWithFullCoverage++
    }
  }
  
  totalCoveredPairings = totalCoveredPairings / 2 // Each pairing counted twice
  const coveragePercent = ((totalCoveredPairings / totalVersusPairings) * 100).toFixed(1)
  
  console.log(`Versus coverage: ${totalCoveredPairings}/${totalVersusPairings} pairings (${coveragePercent}%)`)
  console.log(`Opponents faced per player: min=${minOpponentsFaced}, max=${maxOpponentsFaced}, target=${versusPerPlayer}`)
  console.log(`Players with full coverage: ${playersWithFullCoverage}/${totalPlayers}`)
  
  // Save matches to database
  for (const match of scheduledMatches) {
    await db.createMatch(match)
  }
  
  console.log(`✅ Generated ${scheduledMatches.length} team matches across ${targetRounds} rounds`)
  
  return res.json({
    message: 'Teams matches generated successfully',
    matchesGenerated: scheduledMatches.length,
    rounds: targetRounds,
    teams: numberOfTeams,
    format: 'teams',
    gamesPerPlayer: { min: minGames, max: maxGames, avg: parseFloat(avgGames) },
    success: true
  })
}

// Find the best pair match between two specific teams - used by fixed rotation algorithm
function findBestPairMatch(pairsA, pairsB, playersInRound, playerGameCount, pairUsageCount, matchupHistory, versusTracker) {
  let bestMatch = null
  let bestScore = Infinity // Lower is better
  
  for (const pairA of pairsA) {
    // Skip if any player already in this round
    if (playersInRound.has(pairA.player1.id) || playersInRound.has(pairA.player2.id)) {
      continue
    }
    
    for (const pairB of pairsB) {
      // Skip if any player already in this round
      if (playersInRound.has(pairB.player1.id) || playersInRound.has(pairB.player2.id)) {
        continue
      }
      
      // Check if this exact matchup has already been used
      const pairAKey = [pairA.player1.id, pairA.player2.id].sort().join('-')
      const pairBKey = [pairB.player1.id, pairB.player2.id].sort().join('-')
      const matchupKey = [pairAKey, pairBKey].sort().join('|')
      
      // Penalty for duplicate matchups
      const duplicateCount = matchupHistory.has(matchupKey) ? 1 : 0
      
      // Calculate how many NEW versus pairings this match would cover
      const teamAPlayers = [pairA.player1.id, pairA.player2.id]
      const teamBPlayers = [pairB.player1.id, pairB.player2.id]
      let newVersusPairings = 0
      for (const pAId of teamAPlayers) {
        for (const pBId of teamBPlayers) {
          if (!versusTracker.get(pAId).has(pBId)) {
            newVersusPairings++
          }
        }
      }
      // Max possible new pairings per match is 4 (2x2)
      // Invert so that MORE new pairings = LOWER score (better)
      const versusCoverageBonus = (4 - newVersusPairings) * 100
      
      // Calculate fairness score - prioritise players who have played fewer games
      const playersInMatch = [
        pairA.player1.id, pairA.player2.id,
        pairB.player1.id, pairB.player2.id
      ]
      const totalGamesPlayed = playersInMatch.reduce(
        (sum, pid) => sum + playerGameCount.get(pid), 0
      )
      
      // Also consider pair usage variety (spread partnerships around)
      const pairUsage = (pairUsageCount.get(pairAKey) || 0) + (pairUsageCount.get(pairBKey) || 0)
      
      // Score components (lower = better):
      // 1. HIGHEST PRIORITY: Versus coverage - matches that create NEW opponent pairings
      // 2. Fair play (players with fewer games first)
      // 3. Partnership variety
      // 4. Duplicate matchup penalty
      let score = versusCoverageBonus + (totalGamesPlayed * 10) + pairUsage + (duplicateCount * 50)
      
      if (score < bestScore) {
        bestScore = score
        bestMatch = { pairA, pairB }
      }
    }
  }
  
  return bestMatch
}

// Legacy function - Find the best match to add to a round (kept for potential future use)
function findBestTeamMatch(teamData, teamPairs, playersInRound, playerGameCount, pairUsageCount, matchupHistory, numberOfTeams, teamMatchupCount, versusTracker) {
  let bestMatch = null
  let bestScore = Infinity // Lower is better
  
  const teams = teamData.map(td => td.team)
  
  // For 2 teams: always team 0 vs team 1
  // For 4 teams: cycle through team combinations
  const teamCombinations = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      teamCombinations.push([teams[i], teams[j]])
    }
  }
  
  for (const [teamA, teamB] of teamCombinations) {
    const pairsA = teamPairs.get(teamA.id)
    const pairsB = teamPairs.get(teamB.id)
    
    // Calculate team matchup usage for this combination
    const teamMatchupKey = [teamA.team_number, teamB.team_number].sort().join('-')
    const teamMatchupUsage = teamMatchupCount.get(teamMatchupKey) || 0
    
    for (const pairA of pairsA) {
      // Skip if any player already in this round
      if (playersInRound.has(pairA.player1.id) || playersInRound.has(pairA.player2.id)) {
        continue
      }
      
      for (const pairB of pairsB) {
        // Skip if any player already in this round
        if (playersInRound.has(pairB.player1.id) || playersInRound.has(pairB.player2.id)) {
          continue
        }
        
        // Check if this exact matchup has already been used
        const pairAKey = [pairA.player1.id, pairA.player2.id].sort().join('-')
        const pairBKey = [pairB.player1.id, pairB.player2.id].sort().join('-')
        const matchupKey = [pairAKey, pairBKey].sort().join('|')
        
        // Track duplicate matchups (allowed, with small penalty for variety)
        const duplicateCount = matchupHistory.has(matchupKey) ? 1 : 0
        
        // Calculate how many NEW versus pairings this match would cover
        const teamAPlayers = [pairA.player1.id, pairA.player2.id]
        const teamBPlayers = [pairB.player1.id, pairB.player2.id]
        let newVersusPairings = 0
        for (const pAId of teamAPlayers) {
          for (const pBId of teamBPlayers) {
            if (!versusTracker.get(pAId).has(pBId)) {
              newVersusPairings++
            }
          }
        }
        // Max possible new pairings per match is 4 (2x2)
        // Invert so that MORE new pairings = LOWER score (better)
        const versusCoverageBonus = (4 - newVersusPairings) * 100 // Heavy weight - prioritise coverage!
        
        // Calculate fairness score - prioritise players who have played fewer games
        const playersInMatch = [
          pairA.player1.id, pairA.player2.id,
          pairB.player1.id, pairB.player2.id
        ]
        const totalGamesPlayed = playersInMatch.reduce(
          (sum, pid) => sum + playerGameCount.get(pid), 0
        )
        
        // Also consider pair usage variety (spread partnerships around)
        const pairUsage = (pairUsageCount.get(pairAKey) || 0) + (pairUsageCount.get(pairBKey) || 0)
        
        // Score components (lower = better):
        // 1. HIGHEST PRIORITY: Versus coverage - matches that create NEW opponent pairings
        // 2. Team matchup variety (for 4 teams) - spread across all team combinations
        // 3. Fair play (players with fewer games first)
        // 4. Partnership variety
        // 5. Duplicate matchup penalty
        const teamVarietyPenalty = numberOfTeams > 2 ? teamMatchupUsage * 30 : 0
        let score = versusCoverageBonus + teamVarietyPenalty + (totalGamesPlayed * 10) + pairUsage + (duplicateCount * 20)
        
        if (score < bestScore) {
          bestScore = score
          bestMatch = { pairA, pairB }
        }
      }
    }
  }
  
  return bestMatch
}

// ============= PAIRS MODE MATCH GENERATION =============

// Generate matches for pairs mode using round-robin algorithm
// Each pair plays every other pair exactly once
async function generatePairsMatches(gameDayId, gameDay, res) {
  try {
    console.log('Generating matches for PAIRS mode')
    
    // Get pairs (stored as teams with 2 members)
    const pairs = await db.getTeamsByGameDay(gameDayId)
    
    if (pairs.length < 2) {
      return res.status(400).json({
        error: 'Need at least 2 pairs to generate matches.',
        suggestion: 'Go to the Pairs tab and create more pairs.',
        currentCount: pairs.length
      })
    }
    
    // Check for unpaired athletes - all athletes must be in pairs before generating draw
    const unpairedAthletes = await db.getUnpairedAthletes(gameDayId)
    if (unpairedAthletes.length > 0) {
      const unpairedNames = unpairedAthletes.map(a => a.name).join(', ')
      return res.status(400).json({
        error: `Cannot generate draw: ${unpairedAthletes.length} athlete(s) not yet assigned to pairs.`,
        suggestion: `Please assign all athletes to pairs first. Unpaired: ${unpairedNames}`,
        unpairedCount: unpairedAthletes.length,
        unpairedAthletes: unpairedAthletes.map(a => ({ id: a.id, name: a.name }))
      })
    }
    
    console.log(`Found ${pairs.length} pairs`)
    
    // Get pair members for each pair
    const pairData = await Promise.all(pairs.map(async (pair) => {
      const members = await db.getTeamMembers(pair.id)
      return {
        pair,
        members
      }
    }))
    
    // Sort pairs by pair_number for consistent ordering
    pairData.sort((a, b) => a.pair.team_number - b.pair.team_number)
    
    // Validate all pairs have exactly 2 members
    for (const { pair, members } of pairData) {
      if (members.length !== 2) {
        return res.status(400).json({
          error: `Pair "${pair.team_name}" has ${members.length} members instead of 2.`,
          suggestion: 'Each pair must have exactly 2 players.'
        })
      }
    }
    
    const numPairs = pairData.length
    
    // Round-robin: n pairs = n-1 rounds (or n rounds if odd, with bye each round)
    // Total matches = n * (n-1) / 2
    const hasOddPairs = numPairs % 2 === 1
    const effectiveCount = hasOddPairs ? numPairs + 1 : numPairs
    const numRounds = effectiveCount - 1
    const matchesPerRound = effectiveCount / 2
    
    console.log(`Round-robin: ${numPairs} pairs, ${numRounds} rounds, ${matchesPerRound} matches per round`)
    if (hasOddPairs) {
      console.log(`Odd number of pairs - one bye per round`)
    }
    
    // Create array for circle method rotation
    // Index 0 stays fixed, others rotate
    const circle = []
    for (let i = 0; i < effectiveCount; i++) {
      if (hasOddPairs && i === effectiveCount - 1) {
        circle.push(null) // BYE slot
      } else {
        circle.push(pairData[i])
      }
    }
    
    const scheduledMatches = []
    let matchNumber = 0
    
    for (let round = 1; round <= numRounds; round++) {
      console.log(`\nRound ${round}:`)
      
      // Generate matchups for this round
      // Pair circle[0] with circle[n-1], circle[1] with circle[n-2], etc.
      for (let i = 0; i < matchesPerRound; i++) {
        const pairA = circle[i]
        const pairB = circle[effectiveCount - 1 - i]
        
        // Skip if either is a bye
        if (pairA === null || pairB === null) {
          const realPair = pairA || pairB
          console.log(`  BYE: ${realPair.pair.team_name}`)
          continue
        }
        
        matchNumber++
        const matchId = `match-${uuidv4()}`
        
        console.log(`  Match ${matchNumber}: ${pairA.pair.team_name} vs ${pairB.pair.team_name}`)
        
        scheduledMatches.push({
          id: matchId,
          gameDayId,
          round: round,
          group: 1, // All pairs in same group
          court: null,
          teamA: {
            players: [pairA.members[0].id, pairA.members[1].id],
            score: null
          },
          teamB: {
            players: [pairB.members[0].id, pairB.members[1].id],
            score: null
          },
          teamATeamId: pairA.pair.id,
          teamBTeamId: pairB.pair.id,
          bye: null,
          status: 'pending',
          winner: null,
          timestamp: null
        })
      }
      
      // Rotate: keep circle[0] fixed, rotate the rest clockwise
      // [0, 1, 2, 3, 4] -> [0, 4, 1, 2, 3]
      const last = circle.pop()
      circle.splice(1, 0, last)
    }
    
    // Save matches to database
    for (const match of scheduledMatches) {
      await db.createMatch(match)
    }
    
    const matchesPerPair = numPairs - 1 // Each pair plays every other pair once
    
    console.log(`\n✅ Generated ${scheduledMatches.length} matches across ${numRounds} rounds`)
    console.log(`Each pair plays ${matchesPerPair} matches`)
    
    return res.json({
      message: 'Pairs round-robin generated successfully',
      matchesGenerated: scheduledMatches.length,
      rounds: numRounds,
      pairs: numPairs,
      matchesPerPair: matchesPerPair,
      format: 'pairs',
      success: true
    })
    
  } catch (error) {
    console.error('Error generating pairs matches:', error)
    throw error
  }
}

