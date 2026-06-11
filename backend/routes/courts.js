import { Router } from 'express'
import { searchVenues, getAvailability, buildDeepLink } from '../services/playtomic.js'

export const courtsRoutes = Router()

/**
 * GET /api/courts/venues
 * Query: lat, lng, radius (m, default 15000), size (default 20)
 */
courtsRoutes.get('/venues', async (req, res) => {
  const { lat, lng, radius = 15000, size = 20 } = req.query
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' })
  }
  try {
    const venues = await searchVenues(parseFloat(lat), parseFloat(lng), parseInt(radius), parseInt(size))
    res.json(venues)
  } catch (err) {
    console.error('Playtomic venues error:', err.message)
    res.status(err.status || 502).json({ error: 'Failed to fetch venues from Playtomic', detail: err.message })
  }
})

/**
 * GET /api/courts/availability
 * Query: tenantId, date (YYYY-MM-DD)
 */
courtsRoutes.get('/availability', async (req, res) => {
  const { tenantId, date } = req.query
  if (!tenantId || !date) {
    return res.status(400).json({ error: 'tenantId and date are required' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  }
  try {
    const slots = await getAvailability(tenantId, date)
    res.json(slots)
  } catch (err) {
    console.error('Playtomic availability error:', err.message)
    res.status(err.status || 502).json({ error: 'Failed to fetch availability from Playtomic', detail: err.message })
  }
})

/**
 * GET /api/courts/deeplink
 * Query: tenantId, date (optional), startTime (optional)
 * Returns the Playtomic booking URL to deep-link the user into
 */
courtsRoutes.get('/deeplink', (req, res) => {
  const { tenantId, date, startTime } = req.query
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' })
  const url = buildDeepLink(tenantId, date ? { date, startTime } : null)
  res.json({ url })
})
