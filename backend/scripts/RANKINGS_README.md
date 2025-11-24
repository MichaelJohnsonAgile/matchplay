# Athlete Rankings Scripts

This directory contains scripts for managing athlete rankings in the MatchPlay system.

## Scripts

### `update-rankings.js`
Development script that calculates and displays rankings based on historical match data.

**Usage:**
```bash
node scripts/update-rankings.js           # Display rankings only
node scripts/update-rankings.js --apply   # Apply rankings to database
```

**Ranking Logic:**
- Primary: Total wins (most wins = highest rank)
- Tiebreaker: Win percentage
- **Special adjustment**: Michael Johnson is manually placed at rank #5

### `apply-rankings.js`
Production-ready script that applies stored rankings to the database. This script contains the finalized rankings with all adjustments already applied.

**Usage:**

For local development:
```bash
node scripts/apply-rankings.js
```

For production (Render):
```bash
DATABASE_URL="your-postgres-connection-string" node scripts/apply-rankings.js
```

## Current Rankings (Top 10)

| Rank | Name                | Wins | Losses | Matches | Win %  |
|------|---------------------|------|--------|---------|--------|
| 1    | Michael Boss        | 17   | 9      | 26      | 65.4%  |
| 2    | Daniel Stone        | 15   | 11     | 26      | 57.7%  |
| 3    | Andrew England      | 14   | 4      | 18      | 77.8%  |
| 4    | Terence Wood        | 14   | 11     | 25      | 56.0%  |
| 5    | Michael Johnson     | 20   | 18     | 38      | 52.6%  |
| 6    | Glendon             | 13   | 5      | 18      | 72.2%  |
| 7    | Mario De Oliveira   | 13   | 11     | 24      | 54.2%  |
| 8    | Bobby Tomas         | 13   | 17     | 30      | 43.3%  |
| 9    | Lisa Wandl          | 10   | 8      | 18      | 55.6%  |
| 10   | Steven Collins      | 10   | 8      | 18      | 55.6%  |

## Notes

- Rankings are based on historical match data from the existing league
- All 59 athletes have been ranked
- Athletes with no match history (0-0 records) are ranked 43-59
- To update rankings in production, you'll need the DATABASE_URL from your Render PostgreSQL instance

