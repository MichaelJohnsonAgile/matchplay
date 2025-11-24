import express from 'express'
import { store } from '../data/store.js'

export const leaderboardRoutes = express.Router()

// GET /api/leaderboard - Get overall leaderboard
leaderboardRoutes.get('/', (req, res) => {
  const { start, end } = req.query
  
  // Calculate actual stats from all completed matches across all game days
  const athleteStats = {}
  
  // Initialize stats for all athletes
  store.athletes.forEach(athlete => {
    athleteStats[athlete.id] = {
      id: athlete.id,
      name: athlete.name,
      rank: athlete.rank,
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDiff: 0,
        winPercentage: 0
      }
    }
  })
  
  // Calculate stats from all completed matches
  store.matches.forEach(match => {
    // Only count completed matches
    if (match.teamA.score === null || match.teamB.score === null) return
    
    const scoreA = match.teamA.score
    const scoreB = match.teamB.score
    
    // Process Team A players
    match.teamA.players.forEach(playerId => {
      if (athleteStats[playerId]) {
        athleteStats[playerId].stats.matchesPlayed++
        athleteStats[playerId].stats.pointsFor += scoreA
        athleteStats[playerId].stats.pointsAgainst += scoreB
        
        if (match.winner === 'teamA') {
          athleteStats[playerId].stats.wins++
        } else if (match.winner === 'teamB') {
          athleteStats[playerId].stats.losses++
        }
      }
    })
    
    // Process Team B players
    match.teamB.players.forEach(playerId => {
      if (athleteStats[playerId]) {
        athleteStats[playerId].stats.matchesPlayed++
        athleteStats[playerId].stats.pointsFor += scoreB
        athleteStats[playerId].stats.pointsAgainst += scoreA
        
        if (match.winner === 'teamB') {
          athleteStats[playerId].stats.wins++
        } else if (match.winner === 'teamA') {
          athleteStats[playerId].stats.losses++
        }
      }
    })
  })
  
  // Calculate derived stats
  Object.values(athleteStats).forEach(athlete => {
    athlete.stats.pointsDiff = athlete.stats.pointsFor - athlete.stats.pointsAgainst
    athlete.stats.winPercentage = athlete.stats.matchesPlayed > 0
      ? (athlete.stats.wins / athlete.stats.matchesPlayed) * 100
      : 0
  })
  
  // Sort by: 1) Win percentage, 2) Point differential, 3) Points for
  const leaderboard = Object.values(athleteStats)
    .sort((a, b) => {
      if (b.stats.winPercentage !== a.stats.winPercentage) {
        return b.stats.winPercentage - a.stats.winPercentage
      }
      if (b.stats.pointsDiff !== a.stats.pointsDiff) {
        return b.stats.pointsDiff - a.stats.pointsDiff
      }
      return b.stats.pointsFor - a.stats.pointsFor
    })
  
  res.json(leaderboard)
})

