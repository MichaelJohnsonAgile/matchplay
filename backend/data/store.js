// In-memory data store
// This will be replaced with Firestore in production

export const store = {
  athletes: [
    {
      id: 'ath-1',
      name: 'John Smith',
      email: 'john@example.com',
      status: 'active',
      rank: 1
    },
    {
      id: 'ath-2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      status: 'active',
      rank: 2
    },
    {
      id: 'ath-3',
      name: 'Mike Davis',
      email: 'mike@example.com',
      status: 'active',
      rank: 3
    },
    {
      id: 'ath-4',
      name: 'Emily Wilson',
      email: 'emily@example.com',
      status: 'active',
      rank: 4
    },
    {
      id: 'ath-5',
      name: 'David Brown',
      email: 'david@example.com',
      status: 'active',
      rank: 5
    },
    {
      id: 'ath-6',
      name: 'Lisa Anderson',
      email: 'lisa@example.com',
      status: 'active',
      rank: 6
    },
    {
      id: 'ath-7',
      name: 'Tom Martinez',
      email: 'tom@example.com',
      status: 'active',
      rank: 7
    },
    {
      id: 'ath-8',
      name: 'Jennifer Taylor',
      email: 'jennifer@example.com',
      status: 'active',
      rank: 8
    },
    {
      id: 'ath-9',
      name: 'Robert Garcia',
      email: 'robert@example.com',
      status: 'active',
      rank: 9
    },
    {
      id: 'ath-10',
      name: 'Maria Rodriguez',
      email: 'maria@example.com',
      status: 'active',
      rank: 10
    },
    {
      id: 'ath-11',
      name: 'Chris Lee',
      email: 'chris@example.com',
      status: 'active',
      rank: 11
    },
    {
      id: 'ath-12',
      name: 'Amanda White',
      email: 'amanda@example.com',
      status: 'active',
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

