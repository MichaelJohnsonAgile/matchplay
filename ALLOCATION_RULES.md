# MatchPlay Group Allocation Rules

## Overview
Groups (courts) always have either 4 or 5 players. Extra players are distributed to the top courts first.

## Simple Allocation Rule

1. **Number of groups** = floor(athletes ÷ 4)
2. **Remainder** = athletes % 4
3. **Distribution**: Add 1 extra player to the top `remainder` groups

### Examples:
- **8 athletes**: 8÷4 = 2 groups, 0 remainder → 2 groups of 4
- **9 athletes**: 9÷4 = 2 groups, 1 remainder → Group 1: 5 players, Group 2: 4 players
- **10 athletes**: 10÷4 = 2 groups, 2 remainder → Group 1: 5 players, Group 2: 5 players
- **11 athletes**: 11÷4 = 2 groups, 3 remainder → Group 1: 5 players, Group 2: 5 players, (1 left over - need 12 for 3 groups)
- **12 athletes**: 12÷4 = 3 groups, 0 remainder → 3 groups of 4
- **13 athletes**: 13÷4 = 3 groups, 1 remainder → Group 1: 5, Groups 2-3: 4
- **14 athletes**: 14÷4 = 3 groups, 2 remainder → Groups 1-2: 5, Group 3: 4
- **15 athletes**: 15÷4 = 3 groups, 3 remainder → 3 groups of 5
- **16 athletes**: 16÷4 = 4 groups, 0 remainder → 4 groups of 4
- **17 athletes**: 17÷4 = 4 groups, 1 remainder → Group 1: 5, Groups 2-4: 4

## Valid Player Counts
- **8, 9, 10** → 2 groups ✅
- **11** → Doesn't work cleanly (2 groups can't hold 11)
- **12, 13, 14, 15** → 3 groups ✅
- **16, 17, 18, 19** → 4 groups ✅
- **20+** → 5+ groups ✅

**Note**: 11 athletes needs to go to either 12 (3 groups) or back to 10 (2 groups of 5)

## Match Generation (Round Robin)

Each round is a full **round robin** within each group where every player partners with different players.

### Formula
- **4-player group**: 3 matches (full round robin)
- **5-player group**: 5 matches (full round robin with rotating bye)

### 4-Player Groups (Round Robin - 3 matches)
Players: A, B, C, D

**Match 1**: A+B vs C+D  
**Match 2**: A+C vs B+D  
**Match 3**: A+D vs B+C

Each player partners with every other player once.

### 5-Player Groups (Round Robin - 5 matches, rotating bye)
Players: A, B, C, D, E

**Match 1**: A+B vs C+D (E bye)  
**Match 2**: A+C vs D+E (B bye)  
**Match 3**: A+D vs B+E (C bye)  
**Match 4**: A+E vs B+C (D bye)  
**Match 5**: B+D vs C+E (A bye)

Each player:
- Partners with every other player once
- Sits out (bye) once
- Plays in 4 matches

## Movement Rules Between Rounds

After a complete round robin in each group, players move based on their group performance:

### Performance Calculation
- **Win Percentage** in that round's matches (primary ranking)
- **Point Differential** (tiebreaker if needed)
- Top performers move up, bottom performers move down

### Movement Logic

#### "1 up, 1 down" (for groups of 4)
- Top 2 performers from each group move up
- Bottom 2 performers from each group move down
- Maintains group sizes of 4

#### "2 up, 2 down" (for groups of 5)
- Top 2 performers from each group move up
- Bottom 2 performers from each group move down
- Middle player stays or moves based on overall balance
- Maintains group sizes of 4-5

### Example: 3 Groups After Round 1
- **Group 1 (Top):** Top 2 stay in G1, Bottom 2 move to G2
- **Group 2 (Middle):** Top 2 move to G1, Bottom 2 move to G3
- **Group 3 (Bottom):** Top 2 move to G2, Bottom 2 stay in G3

After movement, each group plays a new round robin.

## API Endpoints

### Preview Allocation (Before Generating)
```
GET /api/gamedays/:id/draw-preview
```
Shows:
- How many groups will be created
- Size of each group
- Which athletes will be in each group
- Total matches that will be generated

### Generate Draw
```
POST /api/gamedays/:id/generate-draw
```
Actually creates the matches based on the allocation rules.

## Future Enhancements

### Round 2 & 3 Movement
After Round 1 completes:
- Winners move "1 up" (to higher group)
- Losers move "1 down" (to lower group)
- Groups reform and new matches generated
- Continues for configured number of rounds

### Edge Cases Still To Handle
- Groups with 6 players (if needed)
- "Bye" system if odd number of athletes
- Manual group adjustment before generation
- Mid-tournament athlete additions/withdrawals

## Design Philosophy

The allocation prioritizes:
1. **Fairness**: Similar skill levels compete together
2. **Balance**: Teams within groups are balanced by pairing high+low ranks
3. **Flexibility**: Works with any number of athletes 8+
4. **Simplicity**: Predictable, rank-based allocation
5. **Participation**: Everyone plays, no one sits out

