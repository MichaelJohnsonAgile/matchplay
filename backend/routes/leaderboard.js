import express from 'express'
import { store } from '../data/store.js'

export const leaderboardRoutes = express.Router()

// GET /api/leaderboard - Get overall leaderboard
leaderboardRoutes.get('/', (req, res) => {
  const { start, end } = req.query
  
  // Return all athletes sorted by rank
  const leaderboard = [...store.athletes]
    .sort((a, b) => a.rank - b.rank)
  
  res.json(leaderboard)
})

