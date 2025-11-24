import express from 'express'
import * as db from '../database/queries.js'

export const leaderboardRoutes = express.Router()

// GET /api/leaderboard - Get overall leaderboard
leaderboardRoutes.get('/', async (req, res) => {
  try {
    const leaderboard = await db.getLeaderboard()
    res.json(leaderboard)
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})
