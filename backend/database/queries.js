import { query } from './db.js'

// ============= ATHLETES =============

export async function getAllAthletes(status = null) {
  let sql = 'SELECT * FROM athletes'
  const params = []
  
  if (status) {
    sql += ' WHERE status = $1'
    params.push(status)
  }
  
  sql += ' ORDER BY rank ASC'
  
  const result = await query(sql, params)
  return result.rows
}

export async function getAthleteById(id) {
  const result = await query('SELECT * FROM athletes WHERE id = $1', [id])
  return result.rows[0] || null
}

export async function createAthlete(athleteData) {
  const { id, name, email, status, rank } = athleteData
  const result = await query(
    `INSERT INTO athletes (id, name, email, status, rank) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [id, name, email || '', status || 'active', rank]
  )
  return result.rows[0]
}

export async function updateAthlete(id, athleteData) {
  const { name, email, status, rank } = athleteData
  const result = await query(
    `UPDATE athletes 
     SET name = COALESCE($2, name),
         email = COALESCE($3, email),
         status = COALESCE($4, status),
         rank = COALESCE($5, rank)
     WHERE id = $1
     RETURNING *`,
    [id, name, email, status, rank]
  )
  return result.rows[0] || null
}

export async function deleteAthlete(id) {
  const result = await query('DELETE FROM athletes WHERE id = $1', [id])
  return result.rowCount > 0
}

// ============= GAME DAYS =============

export async function getAllGameDays() {
  const result = await query(
    `SELECT 
      id, date, venue, status, format,
      points_to_win, win_by_margin, number_of_rounds, movement_rule, number_of_teams,
      created_at, updated_at
     FROM gamedays 
     ORDER BY date DESC`
  )
  return result.rows
}

export async function getGameDayById(id) {
  const result = await query(
    `SELECT 
      id, date, venue, status, format,
      points_to_win, win_by_margin, number_of_rounds, movement_rule, number_of_teams,
      created_at, updated_at
     FROM gamedays 
     WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function createGameDay(gameDayData) {
  const { id, date, venue, status, format, pointsToWin, winByMargin, numberOfRounds, movementRule, numberOfTeams } = gameDayData
  const result = await query(
    `INSERT INTO gamedays 
      (id, date, venue, status, format, points_to_win, win_by_margin, number_of_rounds, movement_rule, number_of_teams)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      id, 
      date, 
      venue, 
      status || 'upcoming',
      format || 'group',
      pointsToWin || 11,
      winByMargin || 2,
      numberOfRounds || 3,
      movementRule || 'auto',
      numberOfTeams || 2
    ]
  )
  return result.rows[0]
}

export async function updateGameDay(id, gameDayData) {
  const { date, venue, status, format, pointsToWin, winByMargin, numberOfRounds, movementRule, numberOfTeams } = gameDayData
  const result = await query(
    `UPDATE gamedays 
     SET date = COALESCE($2, date),
         venue = COALESCE($3, venue),
         status = COALESCE($4, status),
         format = COALESCE($5, format),
         points_to_win = COALESCE($6, points_to_win),
         win_by_margin = COALESCE($7, win_by_margin),
         number_of_rounds = COALESCE($8, number_of_rounds),
         movement_rule = COALESCE($9, movement_rule),
         number_of_teams = COALESCE($10, number_of_teams)
     WHERE id = $1
     RETURNING *`,
    [id, date, venue, status, format, pointsToWin, winByMargin, numberOfRounds, movementRule, numberOfTeams]
  )
  return result.rows[0] || null
}

export async function deleteGameDay(id) {
  // Cascade delete will handle related records
  const result = await query('DELETE FROM gamedays WHERE id = $1', [id])
  return result.rowCount > 0
}

// ============= GAMEDAY ATHLETES =============

export async function getGameDayAthletes(gameDayId) {
  const result = await query(
    `SELECT a.id, a.name, a.email, a.status, a.rank
     FROM athletes a
     INNER JOIN gameday_athletes ga ON a.id = ga.athlete_id
     WHERE ga.gameday_id = $1
     ORDER BY a.rank ASC`,
    [gameDayId]
  )
  return result.rows
}

export async function addAthletesToGameDay(gameDayId, athleteIds) {
  const values = athleteIds.map((athleteId, idx) => 
    `($1, $${idx + 2})`
  ).join(', ')
  
  const sql = `
    INSERT INTO gameday_athletes (gameday_id, athlete_id)
    VALUES ${values}
    ON CONFLICT (gameday_id, athlete_id) DO NOTHING
  `
  
  const result = await query(sql, [gameDayId, ...athleteIds])
  return result.rowCount
}

export async function removeAthleteFromGameDay(gameDayId, athleteId) {
  const result = await query(
    'DELETE FROM gameday_athletes WHERE gameday_id = $1 AND athlete_id = $2',
    [gameDayId, athleteId]
  )
  return result.rowCount > 0
}

export async function getGameDayAthleteCount(gameDayId) {
  const result = await query(
    'SELECT COUNT(*) as count FROM gameday_athletes WHERE gameday_id = $1',
    [gameDayId]
  )
  return parseInt(result.rows[0].count)
}

// ============= MATCHES =============

export async function getMatchById(id) {
  const result = await query('SELECT * FROM matches WHERE id = $1', [id])
  if (result.rows.length === 0) return null
  
  return formatMatchFromDb(result.rows[0])
}

export async function getMatchesByGameDay(gameDayId, filters = {}) {
  let sql = 'SELECT * FROM matches WHERE gameday_id = $1'
  const params = [gameDayId]
  let paramIndex = 2
  
  if (filters.round) {
    sql += ` AND round = $${paramIndex++}`
    params.push(filters.round)
  }
  
  if (filters.group) {
    sql += ` AND match_group = $${paramIndex++}`
    params.push(filters.group)
  }
  
  sql += ' ORDER BY round ASC, match_group ASC, id ASC'
  
  const result = await query(sql, params)
  return result.rows.map(formatMatchFromDb)
}

export async function createMatch(matchData) {
  const {
    id,
    gameDayId,
    round,
    group,
    court,
    teamA,
    teamB,
    teamATeamId,
    teamBTeamId,
    bye,
    status,
    winner,
    timestamp
  } = matchData
  
  const result = await query(
    `INSERT INTO matches 
      (id, gameday_id, round, match_group, court, 
       team_a_player1, team_a_player2, team_a_score,
       team_b_player1, team_b_player2, team_b_score,
       team_a_team_id, team_b_team_id,
       bye_athlete, status, winner, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      id,
      gameDayId,
      round,
      group,
      court,
      teamA.players[0],
      teamA.players[1],
      teamA.score,
      teamB.players[0],
      teamB.players[1],
      teamB.score,
      teamATeamId || null,
      teamBTeamId || null,
      bye || null,
      status || 'pending',
      winner || null,
      timestamp || null
    ]
  )
  
  return formatMatchFromDb(result.rows[0])
}

export async function updateMatch(id, matchData) {
  const { teamAScore, teamBScore, status, winner, timestamp, court } = matchData
  
  const result = await query(
    `UPDATE matches 
     SET team_a_score = COALESCE($2, team_a_score),
         team_b_score = COALESCE($3, team_b_score),
         status = COALESCE($4, status),
         winner = COALESCE($5, winner),
         timestamp = COALESCE($6, timestamp),
         court = COALESCE($7, court)
     WHERE id = $1
     RETURNING *`,
    [id, teamAScore, teamBScore, status, winner, timestamp, court]
  )
  
  if (result.rows.length === 0) return null
  return formatMatchFromDb(result.rows[0])
}

export async function deleteMatchesByGameDay(gameDayId) {
  const result = await query('DELETE FROM matches WHERE gameday_id = $1', [gameDayId])
  return result.rowCount
}

// ============= HELPER FUNCTIONS =============

// Format database row to match API format
function formatMatchFromDb(row) {
  return {
    id: row.id,
    gameDayId: row.gameday_id,
    round: row.round,
    group: row.match_group,
    court: row.court,
    teamA: {
      players: [row.team_a_player1, row.team_a_player2],
      score: row.team_a_score
    },
    teamB: {
      players: [row.team_b_player1, row.team_b_player2],
      score: row.team_b_score
    },
    teamATeamId: row.team_a_team_id,
    teamBTeamId: row.team_b_team_id,
    bye: row.bye_athlete,
    status: row.status,
    winner: row.winner,
    timestamp: row.timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Get game day statistics
export async function getGameDayStats(gameDayId) {
  const [athleteCountResult, matchCountResult, gameDayResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM gameday_athletes WHERE gameday_id = $1', [gameDayId]),
    query('SELECT COUNT(*) as count FROM matches WHERE gameday_id = $1', [gameDayId]),
    query('SELECT number_of_rounds FROM gamedays WHERE id = $1', [gameDayId])
  ])
  
  const athleteCount = parseInt(athleteCountResult.rows[0].count)
  const matchCount = parseInt(matchCountResult.rows[0].count)
  const rounds = gameDayResult.rows[0]?.number_of_rounds || 0
  
  // Calculate courts based on number of athletes (groups of 4)
  const calculatedCourts = Math.max(1, Math.floor(athleteCount / 4))
  
  return {
    athleteCount,
    matchCount,
    rounds,
    courts: calculatedCourts
  }
}

// Calculate leaderboard from all completed matches
// Group weighting for Weighted Win %
// Group 1 (top court) = 1.5x, Group 2 = 1.25x, Group 3+ = 1.0x
const GROUP_WEIGHTS = {
  1: 1.5,
  2: 1.25,
  default: 1.0
}

function getGroupWeight(groupNumber) {
  return GROUP_WEIGHTS[groupNumber] || GROUP_WEIGHTS.default
}

export async function getLeaderboard() {
  const result = await query(`
    SELECT 
      a.id,
      a.name,
      a.rank,
      COUNT(DISTINCT CASE 
        WHEN m.team_a_score IS NOT NULL AND m.team_b_score IS NOT NULL 
        THEN m.id 
        ELSE NULL 
      END) as matches_played,
      COUNT(DISTINCT CASE 
        WHEN (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
           OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        THEN m.id 
        ELSE NULL 
      END) as wins,
      COUNT(DISTINCT CASE 
        WHEN (m.winner = 'teamB' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
           OR (m.winner = 'teamA' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        THEN m.id 
        ELSE NULL 
      END) as losses,
      -- Wins by group for weighted calculation
      COUNT(DISTINCT CASE 
        WHEN m.match_group = 1 AND (
          (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
          OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        ) THEN m.id ELSE NULL 
      END) as group1_wins,
      COUNT(DISTINCT CASE 
        WHEN m.match_group = 2 AND (
          (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
          OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        ) THEN m.id ELSE NULL 
      END) as group2_wins,
      COUNT(DISTINCT CASE 
        WHEN m.match_group >= 3 AND (
          (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
          OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        ) THEN m.id ELSE NULL 
      END) as group3plus_wins,
      COALESCE(SUM(
        CASE 
          WHEN m.team_a_score IS NOT NULL AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id) THEN m.team_a_score
          WHEN m.team_b_score IS NOT NULL AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id) THEN m.team_b_score
          ELSE 0
        END
      ), 0) as points_for,
      COALESCE(SUM(
        CASE 
          WHEN m.team_a_score IS NOT NULL AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id) THEN m.team_b_score
          WHEN m.team_b_score IS NOT NULL AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id) THEN m.team_a_score
          ELSE 0
        END
      ), 0) as points_against
    FROM athletes a
    LEFT JOIN matches m ON (
      (m.team_a_player1 = a.id OR m.team_a_player2 = a.id OR
       m.team_b_player1 = a.id OR m.team_b_player2 = a.id)
      AND m.team_a_score IS NOT NULL 
      AND m.team_b_score IS NOT NULL
    )
    WHERE a.status = 'active'
    GROUP BY a.id, a.name, a.rank
  `)
  
  // Map rows to athlete objects with calculated stats
  const athletes = result.rows.map(row => {
    const matchesPlayed = parseInt(row.matches_played) || 0
    const wins = parseInt(row.wins) || 0
    const losses = parseInt(row.losses) || 0
    const pointsFor = parseInt(row.points_for) || 0
    const pointsAgainst = parseInt(row.points_against) || 0
    
    // Calculate weighted wins (only weight wins, not matches - so Group 1 wins are worth more)
    const group1Wins = parseInt(row.group1_wins) || 0
    const group2Wins = parseInt(row.group2_wins) || 0
    const group3PlusWins = parseInt(row.group3plus_wins) || 0
    
    const weightedWins = (group1Wins * getGroupWeight(1)) + 
                         (group2Wins * getGroupWeight(2)) + 
                         (group3PlusWins * getGroupWeight(3))
    
    return {
      id: row.id,
      name: row.name,
      rank: row.rank,
      stats: {
        matchesPlayed,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        pointsDiff: pointsFor - pointsAgainst,
        winPercentage: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0,
        // Weighted Win % = weighted wins / total matches (Group 1 wins count 1.5x, etc.)
        weightedWinPercentage: matchesPlayed > 0 ? (weightedWins / matchesPlayed) * 100 : 0,
        // Breakdown for transparency
        group1Wins,
        group2Wins,
        group3PlusWins
      }
    }
  })
  
  // Sort by Weighted Win % (descending), then by +/- as tie-breaker (descending)
  athletes.sort((a, b) => {
    // Primary sort: Weighted Win percentage (higher is better)
    const weightedWinPctDiff = b.stats.weightedWinPercentage - a.stats.weightedWinPercentage
    if (weightedWinPctDiff !== 0) return weightedWinPctDiff
    
    // Tie-breaker: Points differential (higher is better)
    return b.stats.pointsDiff - a.stats.pointsDiff
  })
  
  return athletes
}

// Sync athlete ranks based on overall performance (Weighted Win %, then +/- tie-breaker)
export async function syncAthleteRanks() {
  // Get all athletes with their stats including group-level wins for weighting
  const result = await query(`
    SELECT 
      a.id,
      a.name,
      -- Total matches played
      COUNT(DISTINCT CASE 
        WHEN m.team_a_score IS NOT NULL AND m.team_b_score IS NOT NULL 
        THEN m.id 
        ELSE NULL 
      END) as matches_played,
      -- Wins by group for weighted calculation
      COUNT(DISTINCT CASE 
        WHEN m.match_group = 1 AND (
          (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
          OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        ) THEN m.id ELSE NULL 
      END) as group1_wins,
      COUNT(DISTINCT CASE 
        WHEN m.match_group = 2 AND (
          (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
          OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        ) THEN m.id ELSE NULL 
      END) as group2_wins,
      COUNT(DISTINCT CASE 
        WHEN m.match_group >= 3 AND (
          (m.winner = 'teamA' AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id))
          OR (m.winner = 'teamB' AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id))
        ) THEN m.id ELSE NULL 
      END) as group3plus_wins,
      COALESCE(SUM(
        CASE 
          WHEN m.team_a_score IS NOT NULL AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id) THEN m.team_a_score
          WHEN m.team_b_score IS NOT NULL AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id) THEN m.team_b_score
          ELSE 0
        END
      ), 0) as points_for,
      COALESCE(SUM(
        CASE 
          WHEN m.team_a_score IS NOT NULL AND (m.team_a_player1 = a.id OR m.team_a_player2 = a.id) THEN m.team_b_score
          WHEN m.team_b_score IS NOT NULL AND (m.team_b_player1 = a.id OR m.team_b_player2 = a.id) THEN m.team_a_score
          ELSE 0
        END
      ), 0) as points_against
    FROM athletes a
    LEFT JOIN matches m ON (
      (m.team_a_player1 = a.id OR m.team_a_player2 = a.id OR
       m.team_b_player1 = a.id OR m.team_b_player2 = a.id)
      AND m.team_a_score IS NOT NULL 
      AND m.team_b_score IS NOT NULL
    )
    WHERE a.status = 'active'
    GROUP BY a.id, a.name
  `)
  
  // Calculate stats and sort by Weighted Win % (desc), then +/- (desc)
  const athletes = result.rows.map(row => {
    const matchesPlayed = parseInt(row.matches_played) || 0
    const group1Wins = parseInt(row.group1_wins) || 0
    const group2Wins = parseInt(row.group2_wins) || 0
    const group3PlusWins = parseInt(row.group3plus_wins) || 0
    const pointsFor = parseInt(row.points_for) || 0
    const pointsAgainst = parseInt(row.points_against) || 0
    
    // Calculate weighted wins (only weight wins, not matches)
    const weightedWins = (group1Wins * getGroupWeight(1)) + 
                         (group2Wins * getGroupWeight(2)) + 
                         (group3PlusWins * getGroupWeight(3))
    
    return {
      id: row.id,
      name: row.name,
      // Weighted Win % = weighted wins / total matches (Group 1 wins count 1.5x, etc.)
      weightedWinPercentage: matchesPlayed > 0 ? (weightedWins / matchesPlayed) * 100 : 0,
      pointsDiff: pointsFor - pointsAgainst
    }
  })
  
  // Sort by Weighted Win % (descending), then by +/- as tie-breaker (descending)
  athletes.sort((a, b) => {
    const weightedWinPctDiff = b.weightedWinPercentage - a.weightedWinPercentage
    if (weightedWinPctDiff !== 0) return weightedWinPctDiff
    return b.pointsDiff - a.pointsDiff
  })
  
  // Update ranks in database based on sorted order
  for (let i = 0; i < athletes.length; i++) {
    const newRank = i + 1
    await query(
      'UPDATE athletes SET rank = $1 WHERE id = $2',
      [newRank, athletes[i].id]
    )
  }
  
  console.log(`Synced ranks for ${athletes.length} athletes based on Weighted Win % and +/-`)
  return athletes.length
}

// Get game-day-specific athlete stats
export async function getGameDayAthleteStats(gameDayId, athleteId) {
  const result = await query(`
    SELECT 
      COUNT(DISTINCT m.id) as matches_played,
      COUNT(DISTINCT m.id) FILTER (
        WHERE (m.winner = 'teamA' AND (m.team_a_player1 = $2 OR m.team_a_player2 = $2))
           OR (m.winner = 'teamB' AND (m.team_b_player1 = $2 OR m.team_b_player2 = $2))
      ) as wins,
      COUNT(DISTINCT m.id) FILTER (
        WHERE (m.winner = 'teamB' AND (m.team_a_player1 = $2 OR m.team_a_player2 = $2))
           OR (m.winner = 'teamA' AND (m.team_b_player1 = $2 OR m.team_b_player2 = $2))
      ) as losses,
      COALESCE(SUM(
        CASE 
          WHEN m.team_a_player1 = $2 OR m.team_a_player2 = $2 THEN m.team_a_score
          WHEN m.team_b_player1 = $2 OR m.team_b_player2 = $2 THEN m.team_b_score
          ELSE 0
        END
      ), 0) as points_for,
      COALESCE(SUM(
        CASE 
          WHEN m.team_a_player1 = $2 OR m.team_a_player2 = $2 THEN m.team_b_score
          WHEN m.team_b_player1 = $2 OR m.team_b_player2 = $2 THEN m.team_a_score
          ELSE 0
        END
      ), 0) as points_against
    FROM matches m
    WHERE m.gameday_id = $1 
      AND (m.team_a_player1 = $2 OR m.team_a_player2 = $2 OR m.team_b_player1 = $2 OR m.team_b_player2 = $2)
      AND m.team_a_score IS NOT NULL 
      AND m.team_b_score IS NOT NULL
      AND (m.bye_athlete IS NULL OR m.bye_athlete != $2)
  `, [gameDayId, athleteId])
  
  const row = result.rows[0]
  
  return {
    matchesPlayed: parseInt(row.matches_played),
    wins: parseInt(row.wins),
    losses: parseInt(row.losses),
    pointsFor: parseInt(row.points_for),
    pointsAgainst: parseInt(row.points_against),
    pointsDiff: parseInt(row.points_for) - parseInt(row.points_against)
  }
}

// ============= TEAMS =============

export async function createTeam(teamData) {
  const { id, gameDayId, teamNumber, teamName, teamColor } = teamData
  const result = await query(
    `INSERT INTO teams (id, gameday_id, team_number, team_name, team_color)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, gameDayId, teamNumber, teamName, teamColor]
  )
  return result.rows[0]
}

export async function getTeamById(teamId) {
  const result = await query('SELECT * FROM teams WHERE id = $1', [teamId])
  return result.rows[0] || null
}

export async function getTeamsByGameDay(gameDayId) {
  const result = await query(
    'SELECT * FROM teams WHERE gameday_id = $1 ORDER BY team_number ASC',
    [gameDayId]
  )
  return result.rows
}

export async function updateTeam(teamId, updates) {
  const { teamName, teamColor } = updates
  const result = await query(
    `UPDATE teams 
     SET team_name = COALESCE($2, team_name),
         team_color = COALESCE($3, team_color)
     WHERE id = $1
     RETURNING *`,
    [teamId, teamName, teamColor]
  )
  return result.rows[0] || null
}

export async function deleteTeam(teamId) {
  const result = await query('DELETE FROM teams WHERE id = $1', [teamId])
  return result.rowCount > 0
}

export async function deleteTeamsByGameDay(gameDayId) {
  const result = await query('DELETE FROM teams WHERE gameday_id = $1', [gameDayId])
  return result.rowCount
}

// ============= TEAM MEMBERS =============

export async function addAthleteToTeam(teamId, athleteId) {
  const result = await query(
    `INSERT INTO team_members (team_id, athlete_id)
     VALUES ($1, $2)
     ON CONFLICT (team_id, athlete_id) DO NOTHING
     RETURNING *`,
    [teamId, athleteId]
  )
  return result.rowCount > 0
}

export async function removeAthleteFromTeam(teamId, athleteId) {
  const result = await query(
    'DELETE FROM team_members WHERE team_id = $1 AND athlete_id = $2',
    [teamId, athleteId]
  )
  return result.rowCount > 0
}

export async function getTeamMembers(teamId) {
  const result = await query(
    `SELECT a.id, a.name, a.email, a.rank, a.status
     FROM athletes a
     INNER JOIN team_members tm ON a.id = tm.athlete_id
     WHERE tm.team_id = $1
     ORDER BY a.rank ASC`,
    [teamId]
  )
  return result.rows
}

export async function getAthleteTeam(gameDayId, athleteId) {
  const result = await query(
    `SELECT t.*
     FROM teams t
     INNER JOIN team_members tm ON t.id = tm.team_id
     WHERE t.gameday_id = $1 AND tm.athlete_id = $2`,
    [gameDayId, athleteId]
  )
  return result.rows[0] || null
}

// ============= TEAM STATS =============

export async function getTeamStats(teamId) {
  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE m.winner = 'teamA' AND m.team_a_team_id = $1) +
      COUNT(*) FILTER (WHERE m.winner = 'teamB' AND m.team_b_team_id = $1) as wins,
      
      COUNT(*) FILTER (WHERE m.winner = 'teamB' AND m.team_a_team_id = $1) +
      COUNT(*) FILTER (WHERE m.winner = 'teamA' AND m.team_b_team_id = $1) as losses,
      
      COALESCE(SUM(CASE WHEN m.team_a_team_id = $1 THEN m.team_a_score ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN m.team_b_team_id = $1 THEN m.team_b_score ELSE 0 END), 0) as points_for,
      
      COALESCE(SUM(CASE WHEN m.team_a_team_id = $1 THEN m.team_b_score ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN m.team_b_team_id = $1 THEN m.team_a_score ELSE 0 END), 0) as points_against,
      
      COUNT(*) FILTER (WHERE 
        (m.team_a_team_id = $1 OR m.team_b_team_id = $1) AND 
        m.winner IS NOT NULL
      ) as matches_played
    FROM matches m
    WHERE m.team_a_team_id = $1 OR m.team_b_team_id = $1
  `, [teamId])
  
  const row = result.rows[0]
  const wins = parseInt(row.wins) || 0
  const losses = parseInt(row.losses) || 0
  const pointsFor = parseInt(row.points_for) || 0
  const pointsAgainst = parseInt(row.points_against) || 0
  const matchesPlayed = parseInt(row.matches_played) || 0
  
  return {
    wins,
    losses,
    pointsFor,
    pointsAgainst,
    pointDiff: pointsFor - pointsAgainst,
    matchesPlayed,
    winRate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0
  }
}

export async function getTeamStandings(gameDayId) {
  const teams = await getTeamsByGameDay(gameDayId)
  
  const standings = await Promise.all(teams.map(async (team) => {
    const members = await getTeamMembers(team.id)
    const stats = await getTeamStats(team.id)
    
    return {
      teamId: team.id,
      teamNumber: team.team_number,
      teamName: team.team_name,
      teamColor: team.team_color,
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        rank: m.rank
      })),
      ...stats,
      goalProgress: Math.min(stats.winRate / 50, 1) // Progress towards 50% goal
    }
  }))
  
  // Sort by wins, then point diff
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointDiff - a.pointDiff
  })
  
  return standings
}

