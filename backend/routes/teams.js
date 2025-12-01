import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import * as db from '../database/queries.js'

export const teamsRoutes = express.Router()

// POST /api/gamedays/:id/teams/generate - Generate teams for game day
teamsRoutes.post('/:id/teams/generate', async (req, res) => {
  try {
    const gameDayId = req.params.id
    const gameDay = await db.getGameDayById(gameDayId)
    
    if (!gameDay) {
      return res.status(404).json({ error: 'Game day not found' })
    }
    
    if (gameDay.format !== 'teams') {
      return res.status(400).json({ error: 'Game day must be in teams format' })
    }
    
    // Sync athlete ranks from main leaderboard before generating teams
    await db.syncAthleteRanks()
    
    // Get athletes sorted by rank (now reflecting current season standings)
    const athletes = await db.getGameDayAthletes(gameDayId)
    const numAthletes = athletes.length
    const numberOfTeams = gameDay.number_of_teams
    
    // Basic validation - need at least 2 athletes
    if (numAthletes < 2) {
      return res.status(400).json({
        error: `Need at least 2 athletes to generate teams`,
        currentCount: numAthletes
      })
    }
    
    // Delete existing teams if any
    await db.deleteTeamsByGameDay(gameDayId)
    
    // Serpentine draft allocation
    const teamArrays = Array.from({ length: numberOfTeams }, () => [])
    let currentTeam = 0
    let direction = 1 // 1 = forward, -1 = backward
    
    for (const athlete of athletes) {
      teamArrays[currentTeam].push(athlete)
      
      // Move to next team (serpentine pattern)
      if (currentTeam === numberOfTeams - 1 && direction === 1) {
        direction = -1 // Reverse at end
      } else if (currentTeam === 0 && direction === -1) {
        direction = 1 // Reverse at start
      } else {
        currentTeam += direction
      }
    }
    
    // Team configuration based on count
    const teamConfigs = numberOfTeams === 2 
      ? [
          { name: 'Blue Team', color: 'blue', number: 1 },
          { name: 'Red Team', color: 'red', number: 2 }
        ]
      : [
          { name: 'Blue Team', color: 'blue', number: 1 },
          { name: 'Red Team', color: 'red', number: 2 },
          { name: 'Green Team', color: 'green', number: 3 },
          { name: 'Yellow Team', color: 'yellow', number: 4 }
        ]
    
    // Create team records
    const createdTeams = []
    for (let i = 0; i < teamArrays.length; i++) {
      const config = teamConfigs[i]
      const team = await db.createTeam({
        id: `team-${uuidv4()}`,
        gameDayId,
        teamNumber: config.number,
        teamName: config.name,
        teamColor: config.color
      })
      
      // Add members
      for (const athlete of teamArrays[i]) {
        await db.addAthleteToTeam(team.id, athlete.id)
      }
      
      // Get members with stats
      const members = await db.getTeamMembers(team.id)
      const avgRank = members.reduce((sum, m) => sum + m.rank, 0) / members.length
      
      createdTeams.push({
        teamId: team.id,
        teamNumber: team.team_number,
        teamName: team.team_name,
        teamColor: team.team_color,
        members: members.map(m => ({ id: m.id, name: m.name, rank: m.rank })),
        avgRank: Math.round(avgRank * 10) / 10
      })
    }
    
    res.json({
      message: 'Teams generated successfully',
      teams: createdTeams,
      numberOfTeams: createdTeams.length
    })
    
  } catch (error) {
    console.error('Error generating teams:', error)
    res.status(500).json({ error: 'Failed to generate teams' })
  }
})

// GET /api/gamedays/:id/teams - Get teams for a game day
teamsRoutes.get('/:id/teams', async (req, res) => {
  try {
    const teams = await db.getTeamsByGameDay(req.params.id)
    
    const teamsWithMembers = await Promise.all(teams.map(async (team) => {
      const members = await db.getTeamMembers(team.id)
      const avgRank = members.length > 0 
        ? members.reduce((sum, m) => sum + m.rank, 0) / members.length 
        : 0
      
      return {
        teamId: team.id,
        teamNumber: team.team_number,
        teamName: team.team_name,
        teamColor: team.team_color,
        members: members.map(m => ({ id: m.id, name: m.name, rank: m.rank })),
        avgRank: Math.round(avgRank * 10) / 10
      }
    }))
    
    res.json(teamsWithMembers)
  } catch (error) {
    console.error('Error getting teams:', error)
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
})

// GET /api/gamedays/:id/teams/standings - Get team standings/leaderboard
teamsRoutes.get('/:id/teams/standings', async (req, res) => {
  try {
    const standings = await db.getTeamStandings(req.params.id)
    res.json(standings)
  } catch (error) {
    console.error('Error getting team standings:', error)
    res.status(500).json({ error: 'Failed to fetch team standings' })
  }
})

// GET /api/teams/:teamId - Get single team details
teamsRoutes.get('/:teamId', async (req, res) => {
  try {
    const team = await db.getTeamById(req.params.teamId)
    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }
    
    const members = await db.getTeamMembers(team.id)
    const stats = await db.getTeamStats(team.id)
    
    res.json({
      teamId: team.id,
      teamNumber: team.team_number,
      teamName: team.team_name,
      teamColor: team.team_color,
      members,
      ...stats
    })
  } catch (error) {
    console.error('Error getting team:', error)
    res.status(500).json({ error: 'Failed to fetch team' })
  }
})

// PUT /api/teams/:teamId - Update team (e.g., rename)
teamsRoutes.put('/:teamId', async (req, res) => {
  try {
    const { teamName, teamColor } = req.body
    const updatedTeam = await db.updateTeam(req.params.teamId, { teamName, teamColor })
    
    if (!updatedTeam) {
      return res.status(404).json({ error: 'Team not found' })
    }
    
    res.json({
      teamId: updatedTeam.id,
      teamNumber: updatedTeam.team_number,
      teamName: updatedTeam.team_name,
      teamColor: updatedTeam.team_color
    })
  } catch (error) {
    console.error('Error updating team:', error)
    res.status(500).json({ error: 'Failed to update team' })
  }
})

// POST /api/teams/:teamId/members - Add athlete to team
teamsRoutes.post('/:teamId/members', async (req, res) => {
  try {
    const { athleteId } = req.body
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required' })
    }
    
    const added = await db.addAthleteToTeam(req.params.teamId, athleteId)
    if (!added) {
      return res.status(400).json({ error: 'Athlete already in team or invalid IDs' })
    }
    
    const members = await db.getTeamMembers(req.params.teamId)
    res.json({ message: 'Athlete added to team', members })
  } catch (error) {
    console.error('Error adding athlete to team:', error)
    res.status(500).json({ error: 'Failed to add athlete to team' })
  }
})

// DELETE /api/teams/:teamId/members/:athleteId - Remove athlete from team
teamsRoutes.delete('/:teamId/members/:athleteId', async (req, res) => {
  try {
    const removed = await db.removeAthleteFromTeam(req.params.teamId, req.params.athleteId)
    if (!removed) {
      return res.status(404).json({ error: 'Athlete not found in team' })
    }
    
    const members = await db.getTeamMembers(req.params.teamId)
    res.json({ message: 'Athlete removed from team', members })
  } catch (error) {
    console.error('Error removing athlete from team:', error)
    res.status(500).json({ error: 'Failed to remove athlete from team' })
  }
})

// DELETE /api/teams/:teamId - Delete team
teamsRoutes.delete('/:teamId', async (req, res) => {
  try {
    const deleted = await db.deleteTeam(req.params.teamId)
    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' })
    }
    
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting team:', error)
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

