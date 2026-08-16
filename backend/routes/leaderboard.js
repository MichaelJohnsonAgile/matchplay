import express from 'express'
import * as db from '../database/queries.js'

export const leaderboardRoutes = express.Router()

// GET /api/leaderboard - Get overall season leaderboard
leaderboardRoutes.get('/', async (req, res) => {
  try {
    const leaderboard = await db.getLeaderboard()
    res.json(leaderboard)
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// GET /api/leaderboard/mpr - MPR skill leaderboard
leaderboardRoutes.get('/mpr', async (req, res) => {
  try {
    const mprLeaderboard = await db.getMprLeaderboard()
    res.json(mprLeaderboard)
  } catch (error) {
    console.error('Error getting MPR leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch MPR leaderboard' })
  }
})
