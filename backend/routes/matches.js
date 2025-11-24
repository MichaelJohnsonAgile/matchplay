import express from 'express'
import { store } from '../data/store.js'

export const matchRoutes = express.Router()

// GET /api/matches/:id - Get single match
matchRoutes.get('/:id', (req, res) => {
  const match = store.matches.find(m => m.id === req.params.id)
  if (!match) {
    return res.status(404).json({ error: 'Match not found' })
  }
  res.json(match)
})

// PUT /api/matches/:id/score - Update match score
matchRoutes.put('/:id/score', (req, res) => {
  const match = store.matches.find(m => m.id === req.params.id)
  if (!match) {
    return res.status(404).json({ error: 'Match not found' })
  }
  
  const { teamA, teamB } = req.body
  
  if (teamA !== undefined) {
    match.teamA.score = teamA
  }
  
  if (teamB !== undefined) {
    match.teamB.score = teamB
  }
  
  // Determine winner if both scores are present
  if (match.teamA.score !== null && match.teamB.score !== null) {
    if (match.teamA.score > match.teamB.score) {
      match.winner = 'teamA'
      match.status = 'completed'
    } else if (match.teamB.score > match.teamA.score) {
      match.winner = 'teamB'
      match.status = 'completed'
    }
    match.timestamp = new Date().toISOString()
  }
  
  res.json(match)
})

// PUT /api/matches/:id/status - Update match status
matchRoutes.put('/:id/status', (req, res) => {
  const match = store.matches.find(m => m.id === req.params.id)
  if (!match) {
    return res.status(404).json({ error: 'Match not found' })
  }
  
  const { status } = req.body
  
  if (!['pending', 'in-progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  
  match.status = status
  
  res.json(match)
})

