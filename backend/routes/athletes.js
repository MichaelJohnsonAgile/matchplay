import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import * as db from '../database/queries.js'
import { formatAthleteMpr } from '../lib/formatAthlete.js'
import { getRatingTrend } from '../lib/ratingEngine.js'

export const athleteRoutes = express.Router()

// GET /api/athletes - Get all athletes
athleteRoutes.get('/', async (req, res) => {
  try {
    const { status } = req.query
    
    // Sync ranks from season leaderboard to ensure ranks are current
    await db.syncAthleteRanks()
    
    const athletes = await db.getAllAthletes(status)
    res.json(athletes.map(formatAthleteMpr))
  } catch (error) {
    console.error('Error getting athletes:', error)
    res.status(500).json({ error: 'Failed to fetch athletes' })
  }
})

// GET /api/athletes/:id/rating-history
athleteRoutes.get('/:id/rating-history', async (req, res) => {
  try {
    const athlete = await db.getAthleteById(req.params.id)
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' })
    }

    const limit = parseInt(req.query.limit) || 20
    const history = await db.getRatingHistory(req.params.id, limit)
    res.json(history)
  } catch (error) {
    console.error('Error getting rating history:', error)
    res.status(500).json({ error: 'Failed to fetch rating history' })
  }
})

// GET /api/athletes/:id - Get single athlete with profile data
athleteRoutes.get('/:id', async (req, res) => {
  try {
    const athlete = await db.getAthleteById(req.params.id)
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' })
    }

    const history = await db.getRatingHistory(req.params.id, 20)
    const leaderboard = await db.getLeaderboard()
    const standing = leaderboard.find((a) => a.id === req.params.id)

    res.json({
      ...formatAthleteMpr(athlete),
      seasonStats: standing?.stats || null,
      seasonRank: standing ? leaderboard.indexOf(standing) + 1 : null,
      ratingHistory: history.map((h) => ({
        id: h.id,
        matchId: h.match_id,
        ratingBefore: parseFloat(h.rating_before),
        ratingAfter: parseFloat(h.rating_after),
        delta: parseFloat(h.delta),
        createdAt: h.created_at,
        gamedayDate: h.gameday_date,
        venue: h.venue,
        score: `${h.team_a_score}-${h.team_b_score}`,
      })),
      ratingTrend: getRatingTrend(history),
    })
  } catch (error) {
    console.error('Error getting athlete:', error)
    res.status(500).json({ error: 'Failed to fetch athlete' })
  }
})

// POST /api/athletes - Create new athlete
athleteRoutes.post('/', async (req, res) => {
  try {
    const { name, email } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const athletes = await db.getAllAthletes()
    const maxRank = athletes.length > 0 ? Math.max(...athletes.map(a => a.rank)) : 0
    
    const newAthlete = await db.createAthlete({
      id: `ath-${uuidv4()}`,
      name,
      email: email || '',
      status: 'active',
      rank: maxRank + 1
    })
    
    res.status(201).json(formatAthleteMpr(newAthlete))
  } catch (error) {
    console.error('Error creating athlete:', error)
    res.status(500).json({ error: 'Failed to create athlete' })
  }
})

// PUT /api/athletes/:id - Update athlete
athleteRoutes.put('/:id', async (req, res) => {
  try {
    const updatedAthlete = await db.updateAthlete(req.params.id, req.body)
    if (!updatedAthlete) {
      return res.status(404).json({ error: 'Athlete not found' })
    }
    res.json(formatAthleteMpr(updatedAthlete))
  } catch (error) {
    console.error('Error updating athlete:', error)
    res.status(500).json({ error: 'Failed to update athlete' })
  }
})

// DELETE /api/athletes/:id - Delete athlete
athleteRoutes.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteAthlete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Athlete not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting athlete:', error)
    res.status(500).json({ error: 'Failed to delete athlete' })
  }
})
