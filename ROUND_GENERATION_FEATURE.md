# Round 2 & 3 Generation Feature

## Overview
This document describes the implementation of the automatic round generation feature with configurable movement rules for MatchPlay.

## What Was Implemented

### 1. Removed Courts Configuration
- **Removed** the "Number of Courts" field from the game day creation form
- Courts are now **calculated automatically** based on the number of athletes
- Calculation: `Math.floor(numAthletes / 4)` (one court per group)

### 2. Movement Rule Configuration
Added configurable movement rules for player progression between rounds:

**Options:**
- **Auto (default)**: Automatically uses "2 up, 2 down" if any group has 5 players, otherwise "1 up, 1 down"
- **1 up, 1 down**: Top 1 player moves up, bottom 1 moves down
- **2 up, 2 down**: Top 2 players move up, bottom 2 move down

**Configuration Location:**
- Game Day creation form → "Movement Between Rounds" dropdown

### 3. Backend Movement Logic

#### Movement Algorithm
The system calculates group standings after each round based on:
1. **Primary**: Number of wins
2. **Tiebreaker 1**: Point differential (+/-)
3. **Tiebreaker 2**: Total points scored

#### Movement Rules
- **Top Group**: Top performers stay, bottom performers move down
- **Middle Groups**: Top performers move up, bottom move down, middle stay
- **Bottom Group**: Top performers move up, bottom stay

#### Round Generation
- Validates all matches in previous round are complete
- Calculates standings for each group
- Redistributes athletes based on movement rule
- Generates new round robin matches for reorganized groups

### 4. Frontend UI Changes

#### Game Day Creation
- Removed courts input field
- Added "Movement Between Rounds" dropdown selector
- Movement rule is saved with game day settings

#### Matches Tab
When all matches in the current round are complete AND there are more rounds to generate:

**A banner appears:**
```
🟢 Round [N] Complete!
All matches are complete. Generate Round [N+1] to continue.
[Generate Round N+1 Button]
```

**Button Action:**
- Calls backend to generate next round
- Automatically redistributes athletes based on performance
- Generates new matches
- Switches view to newly created round

### 5. API Endpoints

#### New Endpoint: Generate Next Round
```
POST /api/gamedays/:id/generate-next-round
```

**Functionality:**
- Finds latest completed round
- Validates all matches are finished
- Applies movement logic
- Creates matches for next round
- Returns success with match count

**Response:**
```json
{
  "message": "Round 2 generated successfully",
  "success": true,
  "round": 2,
  "matchesGenerated": 9,
  "groups": 3
}
```

**Error Cases:**
- No previous round exists
- Not all matches completed
- Maximum rounds already generated

#### Updated Endpoint: Create Game Day
```
POST /api/gamedays
```

**New Field:**
```json
{
  "movementRule": "auto" | "1" | "2"
}
```

## How to Use

### Creating a Game Day with Movement Rule

1. Navigate to Dashboard
2. Click "Create Game Day"
3. Fill in:
   - Date
   - Venue
   - Scoring rules (points to win, win by margin)
   - Number of rounds
   - **Movement Between Rounds** (select from dropdown)
4. Click "Create Game Day"

### Playing Through Multiple Rounds

#### Round 1
1. Add athletes to game day (Athletes tab)
2. Click "Generate Draw"
3. Switch to Matches tab
4. Enter scores for all matches
5. View group standings update in real-time

#### Round 2 (and subsequent rounds)
1. Once all Round 1 matches are complete, a **green banner** appears
2. Click "**Generate Round [N+1]**" button
3. System automatically:
   - Ranks athletes in each group
   - Moves top performers up
   - Moves bottom performers down
   - Creates new groups
   - Generates new round robin matches
4. View automatically switches to new round
5. Enter scores for Round 2 matches
6. Repeat for Round 3, etc.

## Movement Examples

### Example: 12 Athletes, 3 Groups, "1 up, 1 down"

**Round 1 Initial Groups (by rank):**
- Group 1: Athletes 1, 2, 3, 4 (top tier)
- Group 2: Athletes 5, 6, 7, 8 (middle tier)
- Group 3: Athletes 9, 10, 11, 12 (bottom tier)

**After Round 1 (assuming certain results):**
- Group 1 Winner: Athlete 2 (stays in Group 1)
- Group 1 Loser: Athlete 4 (moves to Group 2)
- Group 2 Winner: Athlete 6 (moves to Group 1)
- Group 2 Loser: Athlete 8 (moves to Group 3)
- Group 3 Winner: Athlete 9 (moves to Group 2)
- Group 3 Loser: Athlete 12 (stays in Group 3)

**Round 2 New Groups:**
- Group 1: Athletes 1, 2, 3, 6 (top performers)
- Group 2: Athletes 4, 5, 7, 9 (middle performers)
- Group 3: Athletes 8, 10, 11, 12 (bottom performers)

### Example: 13 Athletes, 3 Groups (one with 5), "2 up, 2 down" (auto)

**System automatically uses "2 up, 2 down"** because one group has 5 players.

**Round 1 Initial Groups:**
- Group 1: Athletes 1, 2, 3, 4, 5 (5 players)
- Group 2: Athletes 6, 7, 8, 9 (4 players)
- Group 3: Athletes 10, 11, 12, 13 (4 players)

**Movement:**
- Top 2 from each group move up (or stay if top group)
- Bottom 2 from each group move down (or stay if bottom group)
- Middle players stay in same tier

## Technical Implementation Details

### Key Files Modified

#### Frontend
- `matchplay/frontend/src/pages/Dashboard.jsx` - Game day creation form
- `matchplay/frontend/src/components/gameday/MatchesTab.jsx` - Round generation UI
- `matchplay/frontend/src/services/api.js` - API client methods

#### Backend
- `matchplay/backend/routes/gamedays.js` - Movement logic and endpoints
- `matchplay/backend/data/store.js` - Dynamic courts calculation

### Helper Functions (Backend)

**`getEffectiveMovementRule(gameDay, allocation)`**
- Determines whether to use 1 or 2 up/down based on settings and group sizes

**`calculateGroupStandings(gameDayId, round, groupNumber)`**
- Computes win/loss/point stats for each athlete in a group
- Sorts by wins, then point differential

**`generateNextRound(gameDayId, previousRound)`**
- Main orchestrator for round generation
- Validates completion
- Redistributes athletes
- Generates new matches

**`generateGroupMatches(group, gameDayId, round, groupNumber)`**
- Creates round robin matches for 4 or 5 player groups
- Handles bye rotation for 5-player groups

## Testing Recommendations

### Test Case 1: Basic 3-Round Game (12 athletes)
1. Create game day with 3 rounds, "Auto" movement
2. Add 12 athletes (creates 3 groups of 4)
3. Generate draw
4. Complete Round 1 matches
5. Generate Round 2 (should use "1 up, 1 down")
6. Complete Round 2 matches
7. Generate Round 3
8. Verify movement logic is correct

### Test Case 2: 5-Player Group (13 athletes)
1. Create game day with "Auto" movement
2. Add 13 athletes (creates 1 group of 5, 2 groups of 4)
3. Generate draw
4. Verify system uses "2 up, 2 down" automatically
5. Complete Round 1
6. Generate Round 2
7. Verify correct redistribution

### Test Case 3: Manual Movement Rule
1. Create game day with "2 up, 2 down" forced
2. Add 12 athletes (3 groups of 4)
3. Verify it uses "2 up, 2 down" even with all 4-player groups

## Known Limitations

1. **No mid-game movement rule changes**: Movement rule is set at game day creation
2. **Minimum group size**: Groups must have at least 4 players to generate matches
3. **No partial round generation**: All groups in a round must be generated together

## Future Enhancements

- [ ] Support for manual athlete reordering between rounds
- [ ] Detailed movement history/audit trail
- [ ] Visual movement diagram showing who moved where
- [ ] Undo round generation
- [ ] Support for custom movement patterns
- [ ] Mid-game movement rule adjustment

## Success Criteria

✅ Courts removed from game day creation  
✅ Movement rule dropdown added and functional  
✅ Backend calculates courts dynamically  
✅ Movement logic correctly redistributes athletes  
✅ Round 2 generation endpoint works  
✅ Round 3+ generation works (recursive logic)  
✅ UI shows "Generate Next Round" button when appropriate  
✅ No linting errors  
✅ Backend server runs without errors

---

**Version:** 1.0  
**Date:** November 24, 2025  
**Status:** Complete ✅

