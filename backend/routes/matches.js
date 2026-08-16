import express from 'express'
import * as db from '../database/queries.js'
import * as ratingService from '../lib/ratingService.js'
import { tryAdvanceDivideAfterScore } from '../lib/divideService.js'

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

    const gameDayForScore = await db.getGameDayById(match.gameDayId)
    if (
      gameDayForScore?.format === 'divide' &&
      (gameDayForScore.divide_current_round ?? 0) < 1
    ) {
      return res.status(400).json({
        error: 'Start Round 1 before entering scores',
      })
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
      if (finalTeamAScore === finalTeamBScore) {
        const gameDay = await db.getGameDayById(match.gameDayId)
        if (gameDay?.format === 'divide') {
          return res.status(400).json({
            error: 'Draws are not allowed. Play one rally sudden death.',
          })
        }
      }

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
    
    // Divide & Conquer: generate next game when all courts finish current game
    let divideAdvance = null
    if (updateData.winner) {
      divideAdvance = await tryAdvanceDivideAfterScore(match.gameDayId, updatedMatch)
    }
    
    // Check if all matches in the game day are complete
    const gameDayId = match.gameDayId
    const allMatches = await db.getMatchesByGameDay(gameDayId)
    const gameDay = await db.getGameDayById(gameDayId)
    const allComplete = allMatches.length > 0 && allMatches.every(m => m.winner !== null)
    
    // Update game day status to completed if all matches are done
    if (allComplete && gameDay?.format !== 'divide') {
      await db.updateGameDay(gameDayId, { status: 'completed' })
    }
    
    let ratingUpdates = []
    
    // Auto-sync athlete ranks and MPR if a match was completed or score corrected
    if (updateData.winner || (match.winner && (updateData.teamAScore !== undefined || updateData.teamBScore !== undefined))) {
      await db.syncAthleteRanks()
      ratingUpdates = await ratingService.handleScoreUpdate(updatedMatch, match)
    }
    
    res.json({ ...updatedMatch, ratingUpdates, divideAdvance })
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

// PUT /api/matches/:id/players - Update match players (admin)
matchRoutes.put('/:id/players', async (req, res) => {
  try {
    const match = await db.getMatchById(req.params.id)
    if (!match) {
      return res.status(404).json({ error: 'Match not found' })
    }
    
    const { teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2 } = req.body
    
    // Validate that provided player IDs exist
    const playerIds = [teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2].filter(Boolean)
    for (const playerId of playerIds) {
      const athlete = await db.getAthleteById(playerId)
      if (!athlete) {
        return res.status(400).json({ error: `Athlete not found: ${playerId}` })
      }
    }
    
    const updatedMatch = await db.updateMatchPlayers(req.params.id, {
      teamAPlayer1,
      teamAPlayer2,
      teamBPlayer1,
      teamBPlayer2
    })
    
    res.json(updatedMatch)
  } catch (error) {
    console.error('Error updating match players:', error)
    res.status(500).json({ error: 'Failed to update match players' })
  }
})