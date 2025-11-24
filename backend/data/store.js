// In-memory data store
// This will be replaced with Firestore in production

export const store = {
  athletes: [
    {
      id: 'ath-1',
      name: 'John Smith',
      email: 'john@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 45,
        wins: 28,
        losses: 17,
        winPercentage: 62.2,
        pointsFor: 495,
        pointsAgainst: 437,
        pointsDiff: 58
      },
      rank: 1
    },
    {
      id: 'ath-2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 25,
        losses: 18,
        winPercentage: 58.1,
        pointsFor: 470,
        pointsAgainst: 442,
        pointsDiff: 28
      },
      rank: 2
    },
    {
      id: 'ath-3',
      name: 'Mike Davis',
      email: 'mike@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 24,
        losses: 19,
        winPercentage: 55.8,
        pointsFor: 460,
        pointsAgainst: 445,
        pointsDiff: 15
      },
      rank: 3
    },
    {
      id: 'ath-4',
      name: 'Emily Wilson',
      email: 'emily@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 22,
        losses: 21,
        winPercentage: 51.2,
        pointsFor: 450,
        pointsAgainst: 448,
        pointsDiff: 2
      },
      rank: 4
    },
    {
      id: 'ath-5',
      name: 'David Brown',
      email: 'david@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 21,
        losses: 22,
        winPercentage: 48.8,
        pointsFor: 448,
        pointsAgainst: 450,
        pointsDiff: -2
      },
      rank: 5
    },
    {
      id: 'ath-6',
      name: 'Lisa Anderson',
      email: 'lisa@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 20,
        losses: 23,
        winPercentage: 46.5,
        pointsFor: 445,
        pointsAgainst: 455,
        pointsDiff: -10
      },
      rank: 6
    },
    {
      id: 'ath-7',
      name: 'Tom Martinez',
      email: 'tom@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 19,
        losses: 24,
        winPercentage: 44.2,
        pointsFor: 440,
        pointsAgainst: 460,
        pointsDiff: -20
      },
      rank: 7
    },
    {
      id: 'ath-8',
      name: 'Jennifer Taylor',
      email: 'jennifer@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 18,
        losses: 25,
        winPercentage: 41.9,
        pointsFor: 435,
        pointsAgainst: 465,
        pointsDiff: -30
      },
      rank: 8
    },
    {
      id: 'ath-9',
      name: 'Robert Garcia',
      email: 'robert@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 17,
        losses: 26,
        winPercentage: 39.5,
        pointsFor: 430,
        pointsAgainst: 470,
        pointsDiff: -40
      },
      rank: 9
    },
    {
      id: 'ath-10',
      name: 'Maria Rodriguez',
      email: 'maria@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 16,
        losses: 27,
        winPercentage: 37.2,
        pointsFor: 425,
        pointsAgainst: 475,
        pointsDiff: -50
      },
      rank: 10
    },
    {
      id: 'ath-11',
      name: 'Chris Lee',
      email: 'chris@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 15,
        losses: 28,
        winPercentage: 34.9,
        pointsFor: 420,
        pointsAgainst: 480,
        pointsDiff: -60
      },
      rank: 11
    },
    {
      id: 'ath-12',
      name: 'Amanda White',
      email: 'amanda@example.com',
      status: 'active',
      stats: {
        matchesPlayed: 43,
        wins: 14,
        losses: 29,
        winPercentage: 32.6,
        pointsFor: 415,
        pointsAgainst: 485,
        pointsDiff: -70
      },
      rank: 12
    }
  ],

  gameDays: [],

  matches: []
}

// Helper functions to calculate derived data
export function getGameDayStats(gameDayId) {
  const gameDay = store.gameDays.find(gd => gd.id === gameDayId)
  if (!gameDay) return null

  const matches = store.matches.filter(m => m.gameDayId === gameDayId)
  
  // Calculate courts based on number of athletes (groups of 4)
  const numAthletes = gameDay.athletes.length
  const calculatedCourts = Math.max(1, Math.floor(numAthletes / 4))
  
  return {
    athleteCount: gameDay.athletes.length,
    matchCount: matches.length,
    rounds: gameDay.settings.numberOfRounds,
    courts: calculatedCourts
  }
}

