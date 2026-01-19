// API service layer for backend communication
// Base URL will come from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3001/api'

// Helper function for making API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }
  
  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      // Try to parse error response body
      let errorData
      try {
        errorData = await response.json()
      } catch (e) {
        // If response body is not JSON
        errorData = { error: `${response.status} ${response.statusText}` }
      }
      
      const error = new Error(errorData.message || errorData.error || `API Error: ${response.status}`)
      error.status = response.status
      error.data = errorData
      throw error
    }
    
    // Handle 204 No Content responses (common for DELETE operations)
    if (response.status === 204) {
      return null
    }
    
    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    // If no JSON content, return null
    return null
  } catch (error) {
    console.error('API Request failed:', error)
    
    // If it's a network error (no response)
    if (!error.status) {
      const netError = new Error('Network error. Unable to connect to server. The service may be starting up.')
      netError.originalError = error
      throw netError
    }
    
    throw error
  }
}

// Game Day APIs
export const gameDayAPI = {
  // Get all game days
  async getAll() {
    return apiRequest('/gamedays')
  },
  
  // Get single game day by ID
  async getById(id) {
    return apiRequest(`/gamedays/${id}`)
  },
  
  // Create new game day
  async create(gameDayData) {
    return apiRequest('/gamedays', {
      method: 'POST',
      body: JSON.stringify(gameDayData),
    })
  },
  
  // Update game day
  async update(id, gameDayData) {
    return apiRequest(`/gamedays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gameDayData),
    })
  },
  
  // Delete game day
  async delete(id) {
    return apiRequest(`/gamedays/${id}`, {
      method: 'DELETE',
    })
  },
  
  // Generate match draw for a game day
  async generateDraw(id) {
    return apiRequest(`/gamedays/${id}/generate-draw`, {
      method: 'POST',
    })
  },
  
  // Cancel draw and delete all matches for a game day
  async cancelDraw(id) {
    return apiRequest(`/gamedays/${id}/cancel-draw`, {
      method: 'POST',
    })
  },
  
  // Generate next round based on previous round results
  async generateNextRound(id) {
    return apiRequest(`/gamedays/${id}/generate-next-round`, {
      method: 'POST',
    })
  },
  
  // Get game day leaderboard
  async getLeaderboard(id, round = null) {
    const endpoint = round 
      ? `/gamedays/${id}/leaderboard?round=${round}`
      : `/gamedays/${id}/leaderboard`
    return apiRequest(endpoint)
  },
}

// Athlete APIs
export const athleteAPI = {
  // Get all athletes
  async getAll() {
    return apiRequest('/athletes')
  },
  
  // Get single athlete by ID
  async getById(id) {
    return apiRequest(`/athletes/${id}`)
  },
  
  // Create new athlete
  async create(athleteData) {
    return apiRequest('/athletes', {
      method: 'POST',
      body: JSON.stringify(athleteData),
    })
  },
  
  // Update athlete
  async update(id, athleteData) {
    return apiRequest(`/athletes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(athleteData),
    })
  },
  
  // Delete athlete
  async delete(id) {
    return apiRequest(`/athletes/${id}`, {
      method: 'DELETE',
    })
  },
  
  // Get athletes for a specific game day
  async getForGameDay(gameDayId) {
    return apiRequest(`/gamedays/${gameDayId}/athletes`)
  },
  
  // Add athletes to a game day
  async addToGameDay(gameDayId, athleteIds) {
    return apiRequest(`/gamedays/${gameDayId}/athletes`, {
      method: 'POST',
      body: JSON.stringify({ athleteIds }),
    })
  },
  
  // Remove athlete from game day
  async removeFromGameDay(gameDayId, athleteId) {
    return apiRequest(`/gamedays/${gameDayId}/athletes/${athleteId}`, {
      method: 'DELETE',
    })
  },
}

// Match APIs
export const matchAPI = {
  // Get all matches for a game day
  async getForGameDay(gameDayId, filters = {}) {
    const params = new URLSearchParams(filters).toString()
    const endpoint = params 
      ? `/gamedays/${gameDayId}/matches?${params}`
      : `/gamedays/${gameDayId}/matches`
    return apiRequest(endpoint)
  },
  
  // Get single match by ID
  async getById(id) {
    return apiRequest(`/matches/${id}`)
  },
  
  // Update match score
  async updateScore(id, scoreData) {
    return apiRequest(`/matches/${id}/score`, {
      method: 'PUT',
      body: JSON.stringify(scoreData),
    })
  },
  
  // Update match status
  async updateStatus(id, status) {
    return apiRequest(`/matches/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },
  
  // Update match players (admin)
  async updatePlayers(id, playerData) {
    return apiRequest(`/matches/${id}/players`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    })
  },
}

// Leaderboard APIs
export const leaderboardAPI = {
  // Get overall season leaderboard
  async getOverall() {
    return apiRequest('/leaderboard')
  },
  
  // Get leaderboard for specific date range
  async getForDateRange(startDate, endDate) {
    return apiRequest(`/leaderboard?start=${startDate}&end=${endDate}`)
  },
}

// Teams APIs
export const teamsAPI = {
  // Generate teams for a game day
  async generate(gameDayId) {
    return apiRequest(`/gamedays/${gameDayId}/teams/generate`, {
      method: 'POST',
    })
  },
  
  // Get all teams for a game day
  async getForGameDay(gameDayId) {
    return apiRequest(`/gamedays/${gameDayId}/teams`)
  },
  
  // Get team standings/leaderboard
  async getStandings(gameDayId) {
    return apiRequest(`/gamedays/${gameDayId}/teams/standings`)
  },
  
  // Get single team by ID
  async getById(teamId) {
    return apiRequest(`/teams/${teamId}`)
  },
  
  // Update team (e.g., rename)
  async update(teamId, teamData) {
    return apiRequest(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    })
  },
  
  // Add athlete to team
  async addMember(teamId, athleteId) {
    return apiRequest(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ athleteId }),
    })
  },
  
  // Remove athlete from team
  async removeMember(teamId, athleteId) {
    return apiRequest(`/teams/${teamId}/members/${athleteId}`, {
      method: 'DELETE',
    })
  },
  
  // Delete team
  async delete(teamId) {
    return apiRequest(`/teams/${teamId}`, {
      method: 'DELETE',
    })
  },
  
  // ============= PAIRS MODE =============
  
  // Create a new pair (pairs mode)
  async createPair(gameDayId, athlete1Id, athlete2Id) {
    return apiRequest(`/gamedays/${gameDayId}/pairs`, {
      method: 'POST',
      body: JSON.stringify({ athlete1Id, athlete2Id }),
    })
  },
  
  // Get pair standings (pairs mode)
  async getPairStandings(gameDayId) {
    return apiRequest(`/gamedays/${gameDayId}/pairs/standings`)
  },
  
  // Get available athletes not yet in a pair (pairs mode)
  async getAvailableAthletes(gameDayId) {
    return apiRequest(`/gamedays/${gameDayId}/pairs/available`)
  },
  
  // Delete a pair (pairs mode)
  async deletePair(gameDayId, pairId) {
    return apiRequest(`/gamedays/${gameDayId}/pairs/${pairId}`, {
      method: 'DELETE',
    })
  },
}

