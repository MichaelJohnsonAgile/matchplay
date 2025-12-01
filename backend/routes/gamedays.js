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

// Helper function to generate matches for teams mode
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
    
    // Generate all possible partnerships for each team
    const teamPartnerships = teamData.map(({ team, members }) => {
      const pairs = []
      
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          pairs.push({
            team,
            player1: members[i],
            player2: members[j],
            combinedRank: members[i].rank + members[j].rank
          })
        }
      }
      
      return { team, pairs }
    })
    
    console.log('Partnerships per team:', teamPartnerships.map(tp => `Team ${tp.team.team_number}: ${tp.pairs.length} pairs`))
    
    // Generate match pairings
    const matches = []
    const numberOfTeams = teams.length
    
    if (numberOfTeams === 2) {
      // Simple 2-team matchup
      const team0Pairs = teamPartnerships[0].pairs
      const team1Pairs = teamPartnerships[1].pairs
      
      // Sort by combined rank
      const sortedTeam0 = [...team0Pairs].sort((a, b) => a.combinedRank - b.combinedRank)
      const sortedTeam1 = [...team1Pairs].sort((a, b) => a.combinedRank - b.combinedRank)
      
      // Pair them up (match similar ranks)
      const maxMatches = Math.max(sortedTeam0.length, sortedTeam1.length)
      
      for (let i = 0; i < maxMatches; i++) {
        const pair0 = sortedTeam0[i % sortedTeam0.length]
        const pair1 = sortedTeam1[i % sortedTeam1.length]
        
        matches.push({
          id: `match-${uuidv4()}`,
          gameDayId,
          round: 1,
          group: 1, // Set to 1 so matches display correctly in MatchesTab
          court: null,
          teamA: {
            players: [pair0.player1.id, pair0.player2.id],
            score: null
          },
          teamB: {
            players: [pair1.player1.id, pair1.player2.id],
            score: null
          },
          teamATeamId: pair0.team.id,
          teamBTeamId: pair1.team.id,
          bye: null,
          status: 'pending',
          winner: null,
          timestamp: null
        })
      }
      
    } else if (numberOfTeams === 4) {
      // Round-robin team matchups
      for (let i = 0; i < teamPartnerships.length; i++) {
        for (let j = i + 1; j < teamPartnerships.length; j++) {
          const teamA = teamPartnerships[i]
          const teamB = teamPartnerships[j]
          
          // Sort pairs by rank
          const sortedA = [...teamA.pairs].sort((a, b) => a.combinedRank - b.combinedRank)
          const sortedB = [...teamB.pairs].sort((a, b) => a.combinedRank - b.combinedRank)
          
          const maxMatches = Math.max(sortedA.length, sortedB.length)
          
          for (let k = 0; k < maxMatches; k++) {
            const pairA = sortedA[k % sortedA.length]
            const pairB = sortedB[k % sortedB.length]
            
            matches.push({
              id: `match-${uuidv4()}`,
              gameDayId,
              round: 1,
              group: 1, // Set to 1 so matches display correctly in MatchesTab
              court: null,
              teamA: {
                players: [pairA.player1.id, pairA.player2.id],
                score: null
              },
              teamB: {
                players: [pairB.player1.id, pairB.player2.id],
                score: null
              },
              teamATeamId: pairA.team.id,
              teamBTeamId: pairB.team.id,
              bye: null,
              status: 'pending',
              winner: null,
              timestamp: null
            })
          }
        }
      }
    }
    
    console.log(`Creating ${matches.length} matches...`)
    
    // Save matches to database
    for (const match of matches) {
      await db.createMatch(match)
    }
    
    console.log(`✅ Generated ${matches.length} team matches`)
    
    return res.json({
      message: 'Teams matches generated successfully',
      matchesGenerated: matches.length,
      teams: numberOfTeams,
      format: 'teams',
      success: true
    })
    
  } catch (error) {
    console.error('Error generating teams matches:', error)
    throw error
  }
}
