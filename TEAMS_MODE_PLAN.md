# Teams Mode Implementation Plan

## Overview
Add a new "Teams" game mode where athletes are split into 2 or 4 teams, with each person partnering with their teammates against other teams. Team standings track wins and point differential.

---

## Requirements Summary

### Team Structure
- **2 or 4 teams** (configurable at game day creation)
- **Minimum 4 players per team, maximum 5 players per team**
- **Auto-balanced by rank** using serpentine draft (1,4,5,8 vs 2,3,6,7)
- **Uneven numbers**: Extra player rotates as bye within their team

### Match Structure
- **Every possible partnership** within each team plays once
- **Matches paired by similar combined rank** (within 1-2 rank points)
  - Example: Rank 1+8 (sum=9) vs Rank 2+7 (sum=9)
- **Points to win**: 7, 9, 11, 15, or 21 (configurable, default 7 for teams mode)
- **Single round only** (no multi-round movement)

### Leaderboard
- **Team KPI view** with bullet charts
- Track: Team wins, losses, win rate %, point differential
- Visual goal: Racing towards >50% win rate

### User Flow
1. Create Game Day → Select "Teams" format
2. Athletes Tab → Add athletes
3. **NEW: Teams Tab** → Auto-generate teams (or manual override)
4. Matches Tab → Generate matches based on team partnerships
5. Play matches, view team leaderboard

---

## Phase 1: Database Schema Updates

### 1.1 New Tables

#### Teams Table
```sql
CREATE TABLE teams (
    id VARCHAR(50) PRIMARY KEY,
    gameday_id VARCHAR(50) REFERENCES gamedays(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    team_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gameday_id, team_number)
);

CREATE INDEX idx_teams_gameday ON teams(gameday_id);
```

#### Team Members Junction Table
```sql
CREATE TABLE team_members (
    team_id VARCHAR(50) REFERENCES teams(id) ON DELETE CASCADE,
    athlete_id VARCHAR(50) REFERENCES athletes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, athlete_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_athlete ON team_members(athlete_id);
```

### 1.2 Update Existing Tables

#### GameDays Table
```sql
-- Add column for number of teams (only used in teams mode)
ALTER TABLE gamedays 
ADD COLUMN number_of_teams INTEGER DEFAULT 2 CHECK (number_of_teams IN (2, 4));
```

#### Matches Table
```sql
-- Add columns to track which organizational team each player belongs to
ALTER TABLE matches 
ADD COLUMN team_a_team_id VARCHAR(50) REFERENCES teams(id),
ADD COLUMN team_b_team_id VARCHAR(50) REFERENCES teams(id);

CREATE INDEX idx_matches_team_a_team ON matches(team_a_team_id);
CREATE INDEX idx_matches_team_b_team ON matches(team_b_team_id);
```

**Note**: In teams mode:
- `match_group` will be 0 (not used)
- `round` will always be 1
- `team_a_team_id` and `team_b_team_id` track organizational teams

---

## Phase 2: Backend Implementation

### 2.1 Database Queries (database/queries.js)

**New Query Functions:**

```javascript
// Teams CRUD
createTeam(team) // { id, gameDayId, teamNumber, teamName }
getTeamById(teamId)
getTeamsByGameDay(gameDayId)
updateTeam(teamId, updates)
deleteTeam(teamId)

// Team Members
addAthleteToTeam(teamId, athleteId)
removeAthleteFromTeam(teamId, athleteId)
getTeamMembers(teamId) // Returns athletes with rank
getAthleteTeam(gameDayId, athleteId) // Which team is athlete on?

// Team Stats
getTeamStats(teamId) // wins, losses, pointsFor, pointsAgainst, winRate
getTeamStandings(gameDayId) // All teams with stats, sorted by wins then diff
```

### 2.2 Teams Route (routes/teams.js)

**New API Endpoints:**

```
POST   /api/gamedays/:id/teams/generate          Generate teams (auto-balanced)
GET    /api/gamedays/:id/teams                   Get all teams for game day
GET    /api/teams/:teamId                        Get team details
POST   /api/teams/:teamId/members                Add athlete to team
DELETE /api/teams/:teamId/members/:athleteId     Remove athlete from team
PUT    /api/teams/:teamId                        Update team (e.g., rename)
DELETE /api/teams/:teamId                        Delete team
GET    /api/gamedays/:id/teams/standings         Get team standings/KPIs
```

### 2.3 Team Generation Algorithm

**Endpoint**: `POST /api/gamedays/:id/teams/generate`

**Logic**:

```javascript
// Input: gameday with numberOfTeams (2 or 4)
// Output: Teams created with balanced athletes

function generateTeams(gameDayId, numberOfTeams) {
  // 1. Get athletes for game day, sorted by rank
  const athletes = await getGameDayAthletes(gameDayId).sort((a,b) => a.rank - b.rank)
  
  // 2. Validate: min 4 per team, max 5 per team
  const minAthletes = numberOfTeams * 4
  const maxAthletes = numberOfTeams * 5
  
  if (athletes.length < minAthletes) {
    throw new Error(`Need at least ${minAthletes} athletes for ${numberOfTeams} teams`)
  }
  
  if (athletes.length > maxAthletes) {
    throw new Error(`Too many athletes. Max ${maxAthletes} for ${numberOfTeams} teams`)
  }
  
  // 3. Serpentine draft allocation
  const teams = Array.from({ length: numberOfTeams }, () => [])
  let currentTeam = 0
  let direction = 1 // 1 = forward, -1 = backward
  
  for (const athlete of athletes) {
    teams[currentTeam].push(athlete)
    
    // Move to next team (serpentine pattern)
    if (currentTeam === numberOfTeams - 1 && direction === 1) {
      direction = -1 // Reverse at end
    } else if (currentTeam === 0 && direction === -1) {
      direction = 1 // Reverse at start
    } else {
      currentTeam += direction
    }
  }
  
  // 4. Create team records in database
  const createdTeams = []
  for (let i = 0; i < teams.length; i++) {
    const team = await createTeam({
      id: `team-${uuidv4()}`,
      gameDayId,
      teamNumber: i + 1,
      teamName: `Team ${i + 1}`
    })
    
    // Add members
    for (const athlete of teams[i]) {
      await addAthleteToTeam(team.id, athlete.id)
    }
    
    createdTeams.push(team)
  }
  
  return createdTeams
}
```

**Example**: 12 athletes, 2 teams
- Ranks: 1,2,3,4,5,6,7,8,9,10,11,12
- Team 1: 1,4,5,8,9,12 (serpentine)
- Team 2: 2,3,6,7,10,11 (serpentine)

### 2.4 Match Generation Algorithm (Teams Mode)

**Endpoint**: `POST /api/gamedays/:id/generate-draw`

**Logic** (when format === 'teams'):

```javascript
async function generateTeamsMatches(gameDayId, gameDay) {
  const teams = await getTeamsByGameDay(gameDayId)
  
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams to generate matches')
  }
  
  // Get all team members
  const teamMembers = await Promise.all(
    teams.map(async team => ({
      team,
      athletes: await getTeamMembers(team.id)
    }))
  )
  
  // 1. Generate all possible partnerships for each team
  const teamPartnerships = teamMembers.map(({ team, athletes }) => {
    const pairs = []
    for (let i = 0; i < athletes.length; i++) {
      for (let j = i + 1; j < athletes.length; j++) {
        pairs.push({
          team,
          player1: athletes[i],
          player2: athletes[j],
          combinedRank: athletes[i].rank + athletes[j].rank,
          bye: null
        })
      }
    }
    
    // Handle 5-player teams (one player sits out each match as bye)
    if (athletes.length === 5) {
      // Each pair needs to know who has bye
      // Rotate bye through all 5 players
      let byeIndex = 0
      pairs.forEach(pair => {
        pair.bye = athletes[byeIndex]
        byeIndex = (byeIndex + 1) % athletes.length
      })
    }
    
    return { team, pairs }
  })
  
  // 2. Create match pairings
  // For 2 teams: Team A pairs vs Team B pairs
  // For 4 teams: Round-robin team matchups
  
  const matches = []
  
  if (teams.length === 2) {
    // Simple: Team 0 vs Team 1
    const team0Pairs = teamPartnerships[0].pairs
    const team1Pairs = teamPartnerships[1].pairs
    
    // Match pairs by similar combined rank
    const sortedTeam0 = [...team0Pairs].sort((a, b) => a.combinedRank - b.combinedRank)
    const sortedTeam1 = [...team1Pairs].sort((a, b) => a.combinedRank - b.combinedRank)
    
    // Pair them up (should have same count or within 1)
    const maxMatches = Math.max(sortedTeam0.length, sortedTeam1.length)
    
    for (let i = 0; i < maxMatches; i++) {
      const pair0 = sortedTeam0[i % sortedTeam0.length]
      const pair1 = sortedTeam1[i % sortedTeam1.length]
      
      matches.push({
        id: `match-${uuidv4()}`,
        gameDayId,
        round: 1,
        group: 0, // Not used in teams mode
        court: null,
        teamA: {
          players: [pair0.player1.id, pair0.player2.id],
          score: null
        },
        teamB: {
          players: [pair1.player1.id, pair1.player2.id],
          score: null
        },
        teamATeamId: pair0.team.id,
        teamBTeamId: pair1.team.id,
        bye: null, // Handle byes if needed
        status: 'pending',
        winner: null,
        timestamp: null
      })
    }
    
  } else if (teams.length === 4) {
    // Round-robin team matchups: 
    // Team 1 vs 2, Team 1 vs 3, Team 1 vs 4, Team 2 vs 3, Team 2 vs 4, Team 3 vs 4
    
    for (let i = 0; i < teamPartnerships.length; i++) {
      for (let j = i + 1; j < teamPartnerships.length; j++) {
        const teamA = teamPartnerships[i]
        const teamB = teamPartnerships[j]
        
        // Match pairs by rank
        const sortedA = [...teamA.pairs].sort((a, b) => a.combinedRank - b.combinedRank)
        const sortedB = [...teamB.pairs].sort((a, b) => a.combinedRank - b.combinedRank)
        
        const maxMatches = Math.max(sortedA.length, sortedB.length)
        
        for (let k = 0; k < maxMatches; k++) {
          const pairA = sortedA[k % sortedA.length]
          const pairB = sortedB[k % sortedB.length]
          
          matches.push({
            id: `match-${uuidv4()}`,
            gameDayId,
            round: 1,
            group: 0,
            court: null,
            teamA: {
              players: [pairA.player1.id, pairA.player2.id],
              score: null
            },
            teamB: {
              players: [pairB.player1.id, pairB.player2.id],
              score: null
            },
            teamATeamId: pairA.team.id,
            teamBTeamId: pairB.team.id,
            bye: null,
            status: 'pending',
            winner: null,
            timestamp: null
          })
        }
      }
    }
  }
  
  // 3. Save matches to database
  for (const match of matches) {
    await createMatch(match)
  }
  
  return matches
}
```

### 2.5 Team Stats Calculation

**Endpoint**: `GET /api/gamedays/:id/teams/standings`

```javascript
async function getTeamStandings(gameDayId) {
  const teams = await getTeamsByGameDay(gameDayId)
  const matches = await getMatchesByGameDay(gameDayId)
  
  const standings = await Promise.all(teams.map(async team => {
    let wins = 0
    let losses = 0
    let pointsFor = 0
    let pointsAgainst = 0
    let matchesPlayed = 0
    
    // Get members for context
    const members = await getTeamMembers(team.id)
    
    // Calculate from completed matches
    matches.filter(m => m.winner !== null).forEach(match => {
      if (match.teamATeamId === team.id) {
        matchesPlayed++
        pointsFor += match.teamA.score || 0
        pointsAgainst += match.teamB.score || 0
        if (match.winner === 'teamA') wins++
        else losses++
      } else if (match.teamBTeamId === team.id) {
        matchesPlayed++
        pointsFor += match.teamB.score || 0
        pointsAgainst += match.teamA.score || 0
        if (match.winner === 'teamB') wins++
        else losses++
      }
    })
    
    const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0
    const pointDiff = pointsFor - pointsAgainst
    
    return {
      teamId: team.id,
      teamNumber: team.team_number,
      teamName: team.team_name,
      members: members.map(m => ({ id: m.id, name: m.name, rank: m.rank })),
      wins,
      losses,
      matchesPlayed,
      pointsFor,
      pointsAgainst,
      pointDiff,
      winRate: Math.round(winRate * 10) / 10, // One decimal
      goalProgress: Math.min(winRate / 50, 1) // Progress to 50% goal (0-1)
    }
  }))
  
  // Sort by wins, then point diff
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointDiff - a.pointDiff
  })
  
  return standings
}
```

---

## Phase 3: Frontend Implementation

### 3.1 Game Day Creation Form (pages/Dashboard.jsx)

**Updates:**

1. **Format Dropdown**: Add "Teams" option alongside "Group"
   ```jsx
   <select name="format">
     <option value="group">Group (Courts)</option>
     <option value="teams">Teams</option>
   </select>
   ```

2. **Conditional Settings**: Show different settings based on format
   ```jsx
   {format === 'teams' && (
     <div>
       <label>Number of Teams</label>
       <select name="numberOfTeams">
         <option value="2">2 Teams</option>
         <option value="4">4 Teams</option>
       </select>
     </div>
   )}
   
   {format === 'group' && (
     <div>
       <label>Number of Rounds</label>
       <input type="number" name="rounds" defaultValue={3} />
       
       <label>Movement Between Rounds</label>
       <select name="movementRule">
         <option value="auto">Auto</option>
         <option value="1">1 up, 1 down</option>
         <option value="2">2 up, 2 down</option>
       </select>
     </div>
   )}
   ```

3. **Points to Win**: Add more options
   ```jsx
   <select name="pointsToWin">
     <option value="7">7 Points</option>
     <option value="9">9 Points</option>
     <option value="11">11 Points</option>
     <option value="15">15 Points</option>
     <option value="21">21 Points</option>
   </select>
   ```

### 3.2 New Teams Tab Component (components/gameday/TeamsTab.jsx)

**File**: `frontend/src/components/gameday/TeamsTab.jsx`

```jsx
import { useState, useEffect } from 'react'
import { Alert } from '../Alert'

export function TeamsTab({ gameDayId, settings }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  useEffect(() => {
    loadTeams()
  }, [gameDayId])
  
  async function loadTeams() {
    try {
      const response = await fetch(`/api/gamedays/${gameDayId}/teams`)
      const data = await response.json()
      setTeams(data)
    } catch (err) {
      setError('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }
  
  async function handleGenerateTeams() {
    setGenerating(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/gamedays/${gameDayId}/teams/generate`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate teams')
      }
      
      const data = await response.json()
      setTeams(data.teams)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }
  
  if (loading) return <div>Loading teams...</div>
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teams</h2>
        {teams.length === 0 && (
          <button
            onClick={handleGenerateTeams}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? 'Generating...' : 'Generate Teams'}
          </button>
        )}
        {teams.length > 0 && (
          <button
            onClick={handleGenerateTeams}
            disabled={generating}
            className="btn-secondary"
          >
            Regenerate Teams
          </button>
        )}
      </div>
      
      {error && <Alert type="error" message={error} />}
      
      {teams.length === 0 && !error && (
        <Alert 
          type="info" 
          message="No teams created yet. Add athletes first, then generate teams."
        />
      )}
      
      {/* Team Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <div key={team.teamId} className="card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{team.teamName}</h3>
              <span className="badge">
                {team.members.length} player{team.members.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-2">
              {team.members.map((member, idx) => (
                <div 
                  key={member.id} 
                  className="flex justify-between p-2 bg-gray-50 rounded"
                >
                  <span>{member.name}</span>
                  <span className="text-sm text-gray-500">Rank {member.rank}</span>
                </div>
              ))}
            </div>
            
            {/* Show average rank */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Avg Rank: {(team.members.reduce((sum, m) => sum + m.rank, 0) / team.members.length).toFixed(1)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3.3 Update GameDay Page (pages/GameDay.jsx)

**Add Teams Tab:**

```jsx
import { TeamsTab } from '../components/gameday/TeamsTab'

// In tab navigation
const tabs = gameDay.settings.format === 'teams' 
  ? ['Athletes', 'Teams', 'Matches', 'Leaderboard']
  : ['Athletes', 'Groups', 'Matches', 'Leaderboard']

// In tab content
{activeTab === 'Teams' && gameDay.settings.format === 'teams' && (
  <TeamsTab 
    gameDayId={gameDay.id} 
    settings={gameDay.settings}
  />
)}
```

### 3.4 Update Matches Tab (components/gameday/MatchesTab.jsx)

**Handle Teams Mode:**

1. Don't show round selector (always round 1)
2. Don't show group filter (no groups in teams mode)
3. Show team affiliation on matches
4. Generate draw button validates teams exist

```jsx
// At top of component
const isTeamsMode = settings.format === 'teams'

// Generate draw validation
async function handleGenerateDraw() {
  if (isTeamsMode) {
    // Check teams exist
    const teamsResponse = await fetch(`/api/gamedays/${gameDayId}/teams`)
    const teams = await teamsResponse.json()
    
    if (teams.length === 0) {
      setError('Please generate teams first (Teams tab)')
      return
    }
  }
  
  // ... rest of generate logic
}

// Display matches with team badges
{matches.map(match => (
  <div key={match.id} className="match-card">
    {isTeamsMode && (
      <div className="flex gap-2 mb-2">
        <span className="badge badge-blue">{match.teamATeamName}</span>
        <span>vs</span>
        <span className="badge badge-red">{match.teamBTeamName}</span>
      </div>
    )}
    
    <div className="match-teams">
      {/* ... existing match display ... */}
    </div>
  </div>
))}
```

### 3.5 New Team Leaderboard Component (components/gameday/TeamLeaderboard.jsx)

**File**: `frontend/src/components/gameday/TeamLeaderboard.jsx`

```jsx
import { useState, useEffect } from 'react'

export function TeamLeaderboard({ gameDayId }) {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadStandings()
    
    // Refresh every 10 seconds during active game
    const interval = setInterval(loadStandings, 10000)
    return () => clearInterval(interval)
  }, [gameDayId])
  
  async function loadStandings() {
    try {
      const response = await fetch(`/api/gamedays/${gameDayId}/teams/standings`)
      const data = await response.json()
      setStandings(data)
    } catch (err) {
      console.error('Failed to load standings:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <div>Loading standings...</div>
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Team Standings</h2>
      
      <div className="grid gap-6">
        {standings.map((team, index) => (
          <div key={team.teamId} className="card">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-400">#{index + 1}</span>
                  <h3 className="text-2xl font-bold">{team.teamName}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {team.members.map(m => m.name).join(', ')}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {team.wins}-{team.losses}
                </div>
                <div className="text-sm text-gray-500">
                  {team.winRate.toFixed(1)}% Win Rate
                </div>
              </div>
            </div>
            
            {/* Win Rate Progress Bar (Bullet Chart Style) */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Win Rate Progress</span>
                <span className="font-semibold">{team.winRate.toFixed(1)}%</span>
              </div>
              
              <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
                {/* Goal marker at 50% */}
                <div 
                  className="absolute h-full w-1 bg-gray-400 z-10"
                  style={{ left: '50%' }}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                    Goal 50%
                  </div>
                </div>
                
                {/* Progress bar */}
                <div 
                  className={`h-full transition-all duration-500 ${
                    team.winRate >= 50 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(team.winRate, 100)}%` }}
                />
                
                {/* Current value indicator */}
                <div 
                  className="absolute h-full w-1 bg-black"
                  style={{ left: `${Math.min(team.winRate, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{team.wins}</div>
                <div className="text-xs text-gray-500">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{team.losses}</div>
                <div className="text-xs text-gray-500">Losses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{team.pointsFor}</div>
                <div className="text-xs text-gray-500">Points For</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  team.pointDiff > 0 ? 'text-green-600' : 
                  team.pointDiff < 0 ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {team.pointDiff > 0 ? '+' : ''}{team.pointDiff}
                </div>
                <div className="text-xs text-gray-500">Point Diff</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3.6 Update API Service (services/api.js)

```javascript
// Teams endpoints
export const teamsApi = {
  generate: (gameDayId) =>
    fetch(`${API_URL}/gamedays/${gameDayId}/teams/generate`, { method: 'POST' })
      .then(handleResponse),
  
  getAll: (gameDayId) =>
    fetch(`${API_URL}/gamedays/${gameDayId}/teams`)
      .then(handleResponse),
  
  getStandings: (gameDayId) =>
    fetch(`${API_URL}/gamedays/${gameDayId}/teams/standings`)
      .then(handleResponse),
  
  addMember: (teamId, athleteId) =>
    fetch(`${API_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId })
    }).then(handleResponse),
  
  removeMember: (teamId, athleteId) =>
    fetch(`${API_URL}/teams/${teamId}/members/${athleteId}`, { method: 'DELETE' })
      .then(handleResponse)
}
```

---

## Phase 4: Testing Plan

### 4.1 Unit Tests

**Team Generation:**
- 8 athletes, 2 teams → 4 per team
- 10 athletes, 2 teams → 5 per team
- 12 athletes, 2 teams → 6 per team (ERROR: max 5)
- 12 athletes, 4 teams → 3 per team
- 16 athletes, 4 teams → 4 per team
- 17 athletes, 4 teams → team 1 has 5, others have 4
- 13 athletes, 2 teams → 7 per team (ERROR: max 5)

**Match Generation:**
- 2 teams of 4: 6 pairs each = 6 matches minimum
- 2 teams of 5: 10 pairs each = 10 matches minimum
- Verify rank-based pairing works correctly

### 4.2 Integration Tests

1. Create game day with teams mode
2. Add 12 athletes
3. Generate 2 teams
4. Verify team balance (serpentine draft)
5. Generate matches
6. Verify match count and pairings
7. Enter match scores
8. Verify team standings update
9. Verify leaderboard KPIs display correctly

### 4.3 Edge Cases

- [ ] Exactly 8 athletes (2 teams of 4)
- [ ] Exactly 16 athletes (4 teams of 4)
- [ ] 9 athletes, 2 teams (one has 5, one has 4)
- [ ] 13 athletes, 4 teams (one has 4, three have 3 - ERROR)
- [ ] Generate teams before adding athletes
- [ ] Generate matches before generating teams
- [ ] Regenerate teams after matches created
- [ ] Delete team with matches

---

## Phase 5: Documentation Updates

### Files to Update:

1. **README.md**: Add Teams mode to features list
2. **ALLOCATION_RULES.md**: Add teams allocation algorithm
3. Create **TEAMS_MODE_GUIDE.md** with:
   - How to set up teams mode
   - Team generation algorithm explanation
   - Match pairing algorithm
   - Leaderboard interpretation

---

## Phase 6: Deployment Checklist

### Database Migration

1. Run migration script to add new tables
2. Update existing gamedays table
3. Test rollback procedure

### Backend Deployment

1. Deploy new database queries
2. Deploy teams routes
3. Update gamedays route logic
4. Test API endpoints

### Frontend Deployment

1. Deploy updated Dashboard (game day creation)
2. Deploy new TeamsTab component
3. Deploy TeamLeaderboard component
4. Deploy updated MatchesTab
5. Test UI flows

### Verification

- [ ] Create teams mode game day
- [ ] Generate teams
- [ ] Generate matches
- [ ] Score matches
- [ ] View leaderboard
- [ ] Verify no regression in group mode

---

## Implementation Order

**Week 1: Database & Backend Core**
1. Day 1-2: Database schema updates + migration script
2. Day 3-4: Database queries (teams CRUD)
3. Day 5: Team generation algorithm

**Week 2: Backend Match Logic**
1. Day 1-2: Match generation for teams mode
2. Day 3: Team stats calculation
3. Day 4: API endpoints (teams routes)
4. Day 5: Testing & fixes

**Week 3: Frontend**
1. Day 1: Game day creation form updates
2. Day 2: Teams Tab component
3. Day 3: Team Leaderboard component
4. Day 4: Update Matches Tab for teams mode
5. Day 5: Integration testing

**Week 4: Polish & Deploy**
1. Day 1-2: Bug fixes, edge cases
2. Day 3: Documentation
3. Day 4: Deployment to staging
4. Day 5: Production deployment

---

## Success Criteria

- [ ] Can create game day with "Teams" format
- [ ] Can select 2 or 4 teams
- [ ] Can select points to win (7/9/11/15/21)
- [ ] Teams auto-generate with serpentine draft
- [ ] Teams are balanced by rank (avg rank similar)
- [ ] Matches generate with rank-based pairing
- [ ] Every partnership plays once
- [ ] Team leaderboard shows KPI view with bullet charts
- [ ] Win rate progress visualized towards 50% goal
- [ ] No regression in existing "Group" mode
- [ ] Mobile responsive

---

## Future Enhancements

- [ ] Manual team assignment (drag & drop)
- [ ] Custom team names/colors
- [ ] Head-to-head team comparison view
- [ ] Export team results to CSV
- [ ] Team chat/comments
- [ ] Multi-round teams mode (rematch)
- [ ] Team trophies/achievements

---

**Document Version:** 1.0  
**Date:** November 24, 2025  
**Status:** Planning Complete - Ready for Implementation

