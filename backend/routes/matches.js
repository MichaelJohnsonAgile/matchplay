import express from 'express'
import * as db from '../database/queries.js'

export const matchRoutes = express.Router()

// GET /api/matches/:id - Get single match
matchRoutes.get('/:id', async (req, res) => {
  try {
    const match = await db.getMatchById(req.params.id)
    if (!match) {
      return res.status(404).json({ error: 'Match not found' })
    }
    res.json(match)
  } catch (error) {
    console.error('Error getting match:', error)
    res.status(500).json({ error: 'Failed to fetch match' })
  }
})

// PUT /api/matches/:id/score - Update match score
matchRoutes.put('/:id/score', async (req, res) => {
  try {
    const match = await db.getMatchById(req.params.id)
    if (!match) {
      return res.status(404).json({ error: 'Match not found' })
    }
    
    const { teamA, teamB } = req.body
    
    const updateData = {}
    
    if (teamA !== undefined) {
      updateData.teamAScore = teamA
    }
    
    if (teamB !== undefined) {
      updateData.teamBScore = teamB
    }
    
    // Determine winner if both scores are present
    const finalTeamAScore = teamA !== undefined ? teamA : match.teamA.score
    const finalTeamBScore = teamB !== undefined ? teamB : match.teamB.score
    
    if (finalTeamAScore !== null && finalTeamBScore !== null) {
      if (finalTeamAScore > finalTeamBScore) {
        updateData.winner = 'teamA'
        updateData.status = 'completed'
      } else if (finalTeamBScore > finalTeamAScore) {
        updateData.winner = 'teamB'
        updateData.status = 'completed'
      }
      updateData.timestamp = new Date().toISOString()
    }
    
    const updatedMatch = await db.updateMatch(req.params.id, updateData)
    
    // Check if all matches in the game day are complete
    const gameDayId = match.gameDayId
    const allMatches = await db.getMatchesByGameDay(gameDayId)
    const allComplete = allMatches.length > 0 && allMatches.every(m => m.winner !== null)
    
    // Update game day status to completed if all matches are done
    if (allComplete) {
      await db.updateGameDay(gameDayId, { status: 'completed' })
    }
    
    // Auto-sync athlete ranks if a match was completed
    if (updateData.winner) {
      await db.syncAthleteRanks()
    }
    
    res.json(updatedMatch)
  } catch (error) {
    console.error('Error updating match score:', error)
    res.status(500).json({ error: 'Failed to update match score' })
  }
})

// PUT /api/matches/:id/status - Update match status
matchRoutes.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    
    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    
    const updatedMatch = await db.updateMatch(req.params.id, { status })
    
    if (!updatedMatch) {
      return res.status(404).json({ error: 'Match not found' })
    }
    
    res.json(updatedMatch)
  } catch (error) {
    console.error('Error updating match status:', error)
    res.status(500).json({ error: 'Failed to update match status' })
  }
})
