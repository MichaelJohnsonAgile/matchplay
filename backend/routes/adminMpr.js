import express from 'express'
import * as ratingService from '../lib/ratingService.js'

export const adminMprRoutes = express.Router()

function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY
  if (adminKey && req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

adminMprRoutes.use(requireAdmin)

// POST /api/admin/mpr/rebackfill
adminMprRoutes.post('/rebackfill', async (req, res) => {
  try {
    const summary = await ratingService.backfillAllRatings()
    res.json({ message: 'MPR backfill complete', ...summary })
  } catch (error) {
    console.error('Error running MPR backfill:', error)
    res.status(500).json({ error: 'Failed to run MPR backfill' })
  }
})
