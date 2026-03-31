import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import pool from '../database/db.js'

export const matchmakingRoutes = Router()

// ─── User profile ──────────────────────────────────────────────────────────

/**
 * GET /api/matchmaking/profile
 * Returns current user's profile. Creates one automatically on first call.
 */
matchmakingRoutes.get('/profile', requireAuth, async (req, res) => {
  const { id, email } = req.user
  try {
    let result = await pool.query('SELECT * FROM users WHERE id = $1', [id])
    if (result.rows.length === 0) {
      // Auto-provision profile on first login
      result = await pool.query(
        `INSERT INTO users (id, email, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
         RETURNING *`,
        [id, email, email.split('@')[0]]
      )
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('profile error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/matchmaking/profile
 * Update display_name, skill_level, preferred location.
 */
matchmakingRoutes.put('/profile', requireAuth, async (req, res) => {
  const { id } = req.user
  const { display_name, skill_level, preferred_lat, preferred_lng, preferred_location_name } = req.body
  try {
    const result = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($2, display_name),
           skill_level = COALESCE($3, skill_level),
           preferred_lat = COALESCE($4, preferred_lat),
           preferred_lng = COALESCE($5, preferred_lng),
           preferred_location_name = COALESCE($6, preferred_location_name),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, display_name, skill_level, preferred_lat, preferred_lng, preferred_location_name]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Availability ───────────────────────────────────────────────────────────

/**
 * GET /api/matchmaking/availability
 * Query: date (optional YYYY-MM-DD, default: today onwards)
 * Returns all open availability slots from other players.
 */
matchmakingRoutes.get('/availability', requireAuth, async (req, res) => {
  const { date } = req.query
  const { id: currentUserId } = req.user
  try {
    const result = await pool.query(
      `SELECT pa.*, u.display_name, u.skill_level
       FROM player_availability pa
       JOIN users u ON u.id = pa.user_id
       WHERE pa.status = 'open'
         AND pa.user_id != $1
         AND pa.date >= $2
       ORDER BY pa.date, pa.time_start`,
      [currentUserId, date || new Date().toISOString().slice(0, 10)]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/matchmaking/my-availability
 * Returns the current user's own availability slots.
 */
matchmakingRoutes.get('/my-availability', requireAuth, async (req, res) => {
  const { id } = req.user
  try {
    const result = await pool.query(
      `SELECT * FROM player_availability
       WHERE user_id = $1 AND date >= CURRENT_DATE
       ORDER BY date, time_start`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/matchmaking/availability
 * Body: date, time_start, time_end, venue_id?, venue_name?, notes?
 */
matchmakingRoutes.post('/availability', requireAuth, async (req, res) => {
  const { id } = req.user
  const { date, time_start, time_end, venue_id, venue_name, notes } = req.body
  if (!date || !time_start || !time_end) {
    return res.status(400).json({ error: 'date, time_start, and time_end are required' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO player_availability (user_id, date, time_start, time_end, venue_id, venue_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, date, time_start, time_end, venue_id || null, venue_name || null, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/matchmaking/availability/:id
 * Cancels (soft-deletes via status) the user's own availability slot.
 */
matchmakingRoutes.delete('/availability/:slotId', requireAuth, async (req, res) => {
  const { id: userId } = req.user
  const { slotId } = req.params
  try {
    const result = await pool.query(
      `UPDATE player_availability SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [slotId, userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Slot not found or not yours' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Match requests (invitations) ──────────────────────────────────────────

/**
 * GET /api/matchmaking/invitations
 * Returns incoming pending invitations for the current user.
 */
matchmakingRoutes.get('/invitations', requireAuth, async (req, res) => {
  const { id } = req.user
  try {
    const result = await pool.query(
      `SELECT mr.*,
              ru.display_name AS requester_name,
              ru.skill_level  AS requester_skill
       FROM match_requests mr
       JOIN users ru ON ru.id = mr.requester_id
       WHERE mr.invitee_id = $1 AND mr.status = 'pending'
       ORDER BY mr.created_at DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/matchmaking/sent-invitations
 * Returns invitations sent by the current user.
 */
matchmakingRoutes.get('/sent-invitations', requireAuth, async (req, res) => {
  const { id } = req.user
  try {
    const result = await pool.query(
      `SELECT mr.*,
              iu.display_name AS invitee_name,
              iu.skill_level  AS invitee_skill
       FROM match_requests mr
       JOIN users iu ON iu.id = mr.invitee_id
       WHERE mr.requester_id = $1
       ORDER BY mr.created_at DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/matchmaking/invitations
 * Invite another player to a game.
 * Body: invitee_id, proposed_date, proposed_time_start, proposed_time_end,
 *       proposed_venue_id?, proposed_venue_name?, message?, requester_availability_id?
 */
matchmakingRoutes.post('/invitations', requireAuth, async (req, res) => {
  const { id: requesterId } = req.user
  const {
    invitee_id,
    proposed_date,
    proposed_time_start,
    proposed_time_end,
    proposed_venue_id,
    proposed_venue_name,
    message,
    requester_availability_id,
  } = req.body

  if (!invitee_id || !proposed_date || !proposed_time_start || !proposed_time_end) {
    return res.status(400).json({ error: 'invitee_id, proposed_date, proposed_time_start, proposed_time_end are required' })
  }
  if (invitee_id === requesterId) {
    return res.status(400).json({ error: 'You cannot invite yourself' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO match_requests
         (requester_id, invitee_id, requester_availability_id,
          proposed_date, proposed_time_start, proposed_time_end,
          proposed_venue_id, proposed_venue_name, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        requesterId, invitee_id, requester_availability_id || null,
        proposed_date, proposed_time_start, proposed_time_end,
        proposed_venue_id || null, proposed_venue_name || null, message || null,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/matchmaking/invitations/:id
 * Accept or decline an invitation.
 * Body: status ('accepted' | 'declined')
 */
matchmakingRoutes.put('/invitations/:requestId', requireAuth, async (req, res) => {
  const { id: userId } = req.user
  const { requestId } = req.params
  const { status } = req.body

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: "status must be 'accepted' or 'declined'" })
  }
  try {
    const result = await pool.query(
      `UPDATE match_requests SET status = $1, updated_at = NOW()
       WHERE id = $2 AND invitee_id = $3 AND status = 'pending'
       RETURNING *`,
      [status, requestId, userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already actioned' })
    }
    // If accepted, mark the requester's availability slot as matched
    const inv = result.rows[0]
    if (status === 'accepted' && inv.requester_availability_id) {
      await pool.query(
        `UPDATE player_availability SET status = 'matched', updated_at = NOW()
         WHERE id = $1`,
        [inv.requester_availability_id]
      )
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/matchmaking/invitations/:id
 * Cancel a sent invitation (requester only, while still pending).
 */
matchmakingRoutes.delete('/invitations/:requestId', requireAuth, async (req, res) => {
  const { id: userId } = req.user
  const { requestId } = req.params
  try {
    const result = await pool.query(
      `UPDATE match_requests SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND requester_id = $2 AND status = 'pending'
       RETURNING *`,
      [requestId, userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invitation not found or not yours' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/matchmaking/players
 * Browse other registered players.
 */
matchmakingRoutes.get('/players', requireAuth, async (req, res) => {
  const { id: currentUserId } = req.user
  const { skill_level } = req.query
  try {
    const params = [currentUserId]
    let where = 'WHERE id != $1'
    if (skill_level) {
      params.push(skill_level)
      where += ` AND skill_level = $${params.length}`
    }
    const result = await pool.query(
      `SELECT id, display_name, skill_level, preferred_location_name, created_at
       FROM users ${where}
       ORDER BY display_name`,
      params
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
