import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../database/db.js'

export const matchmakingRoutes = express.Router()

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── AVAILABILITY ────────────────────────────────────────────────────────────

// GET /api/matchmaking/availability
// Returns availability for all athletes (or filtered by ?athleteId=)
matchmakingRoutes.get('/availability', async (req, res) => {
  try {
    const { athleteId } = req.query
    let sql, params

    if (athleteId) {
      sql = `
        SELECT a.*, at.name as athlete_name, at.rank as athlete_rank
        FROM availability a
        JOIN athletes at ON at.id = a.athlete_id
        WHERE a.athlete_id = $1
        ORDER BY a.day_of_week, a.start_time
      `
      params = [athleteId]
    } else {
      sql = `
        SELECT a.*, at.name as athlete_name, at.rank as athlete_rank
        FROM availability a
        JOIN athletes at ON at.id = a.athlete_id
        ORDER BY a.day_of_week, a.start_time
      `
      params = []
    }

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching availability:', error)
    res.status(500).json({ error: 'Failed to fetch availability' })
  }
})

// POST /api/matchmaking/availability
// Set/replace all availability slots for an athlete
// Body: { athleteId, slots: [{ dayOfWeek, startTime, endTime }] }
matchmakingRoutes.post('/availability', async (req, res) => {
  try {
    const { athleteId, slots } = req.body

    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required' })
    }
    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: 'slots must be an array' })
    }

    // Validate athlete exists
    const athleteResult = await query('SELECT id FROM athletes WHERE id = $1', [athleteId])
    if (athleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' })
    }

    // Delete existing availability for this athlete, then re-insert
    await query('DELETE FROM availability WHERE athlete_id = $1', [athleteId])

    const inserted = []
    for (const slot of slots) {
      const { dayOfWeek, startTime, endTime } = slot
      if (dayOfWeek === undefined || !startTime || !endTime) continue
      if (dayOfWeek < 0 || dayOfWeek > 6) continue

      const row = await query(
        `INSERT INTO availability (id, athlete_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [uuidv4(), athleteId, dayOfWeek, startTime, endTime]
      )
      inserted.push(row.rows[0])
    }

    res.status(201).json(inserted)
  } catch (error) {
    console.error('Error setting availability:', error)
    res.status(500).json({ error: 'Failed to set availability' })
  }
})

// DELETE /api/matchmaking/availability/:id
// Remove a single availability slot
matchmakingRoutes.delete('/availability/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM availability WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Availability slot not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting availability slot:', error)
    res.status(500).json({ error: 'Failed to delete availability slot' })
  }
})

// ─── FIND MATCHES ────────────────────────────────────────────────────────────

// GET /api/matchmaking/find-matches
// Find time slots where 4+ players are available simultaneously.
// Returns proposed match groups ordered by skill balance score.
matchmakingRoutes.get('/find-matches', async (req, res) => {
  try {
    // Fetch all availability with athlete rank
    const availResult = await query(`
      SELECT a.athlete_id, a.day_of_week, a.start_time, a.end_time,
             at.name as athlete_name, at.rank as athlete_rank
      FROM availability a
      JOIN athletes at ON at.id = a.athlete_id
      WHERE at.status = 'active'
      ORDER BY a.day_of_week, a.start_time
    `)

    const slots = availResult.rows

    // Group by day_of_week
    const byDay = {}
    for (const slot of slots) {
      const key = slot.day_of_week
      if (!byDay[key]) byDay[key] = []
      byDay[key].push(slot)
    }

    const proposedMatches = []

    for (const [day, daySlots] of Object.entries(byDay)) {
      // Find all unique (start_time, end_time) overlap windows
      // Collect all unique time boundaries on this day
      const times = new Set()
      for (const s of daySlots) {
        times.add(s.start_time)
        times.add(s.end_time)
      }
      const sortedTimes = [...times].sort()

      // For each consecutive pair of time boundaries, find which athletes cover that window
      for (let i = 0; i < sortedTimes.length - 1; i++) {
        const windowStart = sortedTimes[i]
        const windowEnd = sortedTimes[i + 1]

        const availableAthletes = daySlots.filter(
          s => s.start_time <= windowStart && s.end_time >= windowEnd
        )

        if (availableAthletes.length < 4) continue

        // Generate all possible 4-player combinations
        const combos = combinations(availableAthletes, 4)
        for (const group of combos) {
          const skillScore = computeSkillBalance(group)
          proposedMatches.push({
            dayOfWeek: parseInt(day),
            dayName: DAY_NAMES[parseInt(day)],
            windowStart,
            windowEnd,
            players: group.map(p => ({
              athleteId: p.athlete_id,
              name: p.athlete_name,
              rank: p.athlete_rank
            })),
            skillBalanceScore: skillScore
          })
        }
      }
    }

    // Sort by best skill balance (lower = more balanced), then by day
    proposedMatches.sort((a, b) => a.skillBalanceScore - b.skillBalanceScore)

    // Deduplicate: keep only the best match per unique player-set + day + window
    // (combinations() generates each set once, so no dedup needed here)
    // But limit to top 20 to avoid payload bloat
    const top = proposedMatches.slice(0, 20)

    res.json(top)
  } catch (error) {
    console.error('Error finding matches:', error)
    res.status(500).json({ error: 'Failed to find matches' })
  }
})

// ─── MATCH INVITATIONS ───────────────────────────────────────────────────────

// GET /api/matchmaking/invitations
// Get invitations. Filter by ?athleteId= to get invitations for a player.
matchmakingRoutes.get('/invitations', async (req, res) => {
  try {
    const { athleteId, status } = req.query

    let where = []
    let params = []

    if (athleteId) {
      params.push(athleteId)
      where.push(`(mi.player1_id = $${params.length} OR mi.player2_id = $${params.length} OR mi.player3_id = $${params.length} OR mi.player4_id = $${params.length})`)
    }
    if (status) {
      params.push(status)
      where.push(`mi.status = $${params.length}`)
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT
        mi.*,
        p1.name as player1_name, p1.rank as player1_rank,
        p2.name as player2_name, p2.rank as player2_rank,
        p3.name as player3_name, p3.rank as player3_rank,
        p4.name as player4_name, p4.rank as player4_rank
      FROM match_invitations mi
      LEFT JOIN athletes p1 ON p1.id = mi.player1_id
      LEFT JOIN athletes p2 ON p2.id = mi.player2_id
      LEFT JOIN athletes p3 ON p3.id = mi.player3_id
      LEFT JOIN athletes p4 ON p4.id = mi.player4_id
      ${whereClause}
      ORDER BY mi.proposed_date, mi.proposed_start_time
    `

    const result = await query(sql, params)
    res.json(result.rows.map(formatInvitation))
  } catch (error) {
    console.error('Error fetching invitations:', error)
    res.status(500).json({ error: 'Failed to fetch invitations' })
  }
})

// POST /api/matchmaking/invitations
// Create a new match invitation
// Body: { proposedDate, proposedStartTime, proposedEndTime, venue, player1Id, player2Id, player3Id, player4Id }
matchmakingRoutes.post('/invitations', async (req, res) => {
  try {
    const {
      proposedDate, proposedStartTime, proposedEndTime,
      venue, player1Id, player2Id, player3Id, player4Id,
      skillBalanceScore
    } = req.body

    if (!proposedDate || !proposedStartTime || !proposedEndTime) {
      return res.status(400).json({ error: 'proposedDate, proposedStartTime, and proposedEndTime are required' })
    }
    if (!player1Id || !player2Id || !player3Id || !player4Id) {
      return res.status(400).json({ error: 'All four player IDs are required' })
    }

    const id = uuidv4()
    const result = await query(
      `INSERT INTO match_invitations
         (id, proposed_date, proposed_start_time, proposed_end_time, venue,
          player1_id, player2_id, player3_id, player4_id, skill_balance_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id, proposedDate, proposedStartTime, proposedEndTime,
       venue || 'TBD', player1Id, player2Id, player3Id, player4Id,
       skillBalanceScore || null]
    )

    // Fetch with player names
    const full = await getInvitationById(id)
    res.status(201).json(full)
  } catch (error) {
    console.error('Error creating invitation:', error)
    res.status(500).json({ error: 'Failed to create invitation' })
  }
})

// PUT /api/matchmaking/invitations/:id/respond
// A player responds to their invitation
// Body: { athleteId, response: 'accepted' | 'declined' }
matchmakingRoutes.put('/invitations/:id/respond', async (req, res) => {
  try {
    const { athleteId, response } = req.body
    const { id } = req.params

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'response must be "accepted" or "declined"' })
    }

    // Find which player slot this athlete occupies
    const invResult = await query('SELECT * FROM match_invitations WHERE id = $1', [id])
    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' })
    }
    const inv = invResult.rows[0]

    const playerSlot = ['player1_id', 'player2_id', 'player3_id', 'player4_id']
      .find(slot => inv[slot] === athleteId)

    if (!playerSlot) {
      return res.status(403).json({ error: 'Athlete is not part of this invitation' })
    }

    const responseCol = playerSlot.replace('_id', '_response')

    // Update this player's response
    await query(
      `UPDATE match_invitations SET ${responseCol} = $1 WHERE id = $2`,
      [response, id]
    )

    // Re-fetch and compute overall status
    const updated = await query('SELECT * FROM match_invitations WHERE id = $1', [id])
    const u = updated.rows[0]

    const responses = [u.player1_response, u.player2_response, u.player3_response, u.player4_response]
    let newStatus = u.status
    if (responses.some(r => r === 'declined')) {
      newStatus = 'declined'
    } else if (responses.every(r => r === 'accepted')) {
      newStatus = 'confirmed'
    }

    if (newStatus !== u.status) {
      await query('UPDATE match_invitations SET status = $1 WHERE id = $2', [newStatus, id])
    }

    const full = await getInvitationById(id)
    res.json(full)
  } catch (error) {
    console.error('Error responding to invitation:', error)
    res.status(500).json({ error: 'Failed to respond to invitation' })
  }
})

// DELETE /api/matchmaking/invitations/:id
matchmakingRoutes.delete('/invitations/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM match_invitations WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting invitation:', error)
    res.status(500).json({ error: 'Failed to delete invitation' })
  }
})

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getInvitationById(id) {
  const result = await query(`
    SELECT
      mi.*,
      p1.name as player1_name, p1.rank as player1_rank,
      p2.name as player2_name, p2.rank as player2_rank,
      p3.name as player3_name, p3.rank as player3_rank,
      p4.name as player4_name, p4.rank as player4_rank
    FROM match_invitations mi
    LEFT JOIN athletes p1 ON p1.id = mi.player1_id
    LEFT JOIN athletes p2 ON p2.id = mi.player2_id
    LEFT JOIN athletes p3 ON p3.id = mi.player3_id
    LEFT JOIN athletes p4 ON p4.id = mi.player4_id
    WHERE mi.id = $1
  `, [id])
  return result.rows.length ? formatInvitation(result.rows[0]) : null
}

function formatInvitation(row) {
  return {
    id: row.id,
    proposedDate: row.proposed_date,
    proposedStartTime: row.proposed_start_time,
    proposedEndTime: row.proposed_end_time,
    venue: row.venue,
    status: row.status,
    skillBalanceScore: row.skill_balance_score,
    players: [
      { id: row.player1_id, name: row.player1_name, rank: row.player1_rank, response: row.player1_response },
      { id: row.player2_id, name: row.player2_name, rank: row.player2_rank, response: row.player2_response },
      { id: row.player3_id, name: row.player3_name, rank: row.player3_rank, response: row.player3_response },
      { id: row.player4_id, name: row.player4_name, rank: row.player4_rank, response: row.player4_response },
    ],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Generate all k-size combinations from an array
function combinations(arr, k) {
  if (k > arr.length) return []
  if (k === arr.length) return [arr]
  if (k === 1) return arr.map(x => [x])
  const result = []
  for (let i = 0; i <= arr.length - k; i++) {
    const sub = combinations(arr.slice(i + 1), k - 1)
    for (const c of sub) result.push([arr[i], ...c])
  }
  return result
}

// Compute skill balance score for a 4-player group split into two optimal teams.
// Lower score = more balanced match.
// Strategy: best pairing is top+bottom vs middle two (minimise rank sum difference)
function computeSkillBalance(players) {
  const ranks = players.map(p => p.athlete_rank).sort((a, b) => a - b)
  // Best split: [0,3] vs [1,2] (standard balanced pairing)
  const team1 = ranks[0] + ranks[3]
  const team2 = ranks[1] + ranks[2]
  return Math.abs(team1 - team2)
}
