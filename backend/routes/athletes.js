import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import * as db from '../database/queries.js'

export const athleteRoutes = express.Router()

// GET /api/athletes - Get all athletes
athleteRoutes.get('/', async (req, res) => {
  try {
    const { status } = req.query
    
    // Sync ranks from season leaderboard to ensure ranks are current
    await db.syncAthleteRanks()
    
    const athletes = await db.getAllAthletes(status)
    res.json(athletes)
  } catch (error) {
    console.error('Error getting athletes:', error)
    res.status(500).json({ error: 'Failed to fetch athletes' })
  }
})

// GET /api/athletes/:id - Get single athlete
athleteRoutes.get('/:id', async (req, res) => {
  try {
    const athlete = await db.getAthleteById(req.params.id)
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' })
    }
    res.json(athlete)
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
    
    // Get current max rank to assign next rank
    const athletes = await db.getAllAthletes()
    const maxRank = athletes.length > 0 ? Math.max(...athletes.map(a => a.rank)) : 0
    
    const newAthlete = await db.createAthlete({
      id: `ath-${uuidv4()}`,
      name,
      email: email || '',
      status: 'active',
      rank: maxRank + 1
    })
    
    res.status(201).json(newAthlete)
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
    res.json(updatedAthlete)
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
