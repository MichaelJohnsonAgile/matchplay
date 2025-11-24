# Database Module

This directory contains all database-related code for the MatchPlay backend.

## Files

### `db.js`
Database connection pool and helper functions.
- Manages PostgreSQL connection pool
- Exports `query()` for simple queries
- Exports `getClient()` for transactions
- Handles connection errors and logging

### `queries.js`
All database query functions organized by entity.
- **Athletes**: CRUD operations
- **Game Days**: CRUD operations  
- **GameDay Athletes**: Link athletes to game days
- **Matches**: CRUD operations
- **Helpers**: Stats, leaderboards, standings

### `schema.sql`
Complete database schema with:
- Table definitions
- Indexes for performance
- Foreign key relationships
- Triggers for auto-updating timestamps
- Sample data (12 athletes)

### `init.js`
Database initialization script.
- Reads and executes `schema.sql`
- Creates all tables and indexes
- Inserts sample data

## Usage

### Initialize Database
```bash
npm run db:init
```

### Import in Routes
```javascript
import * as db from '../database/queries.js'

// Get all athletes
const athletes = await db.getAllAthletes()

// Create game day
const gameDay = await db.createGameDay(data)
```

## Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string

Example:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Schema Overview

```
athletes (1) ──< gameday_athletes >── (M) gamedays
                                          |
                                          └─< (M) matches
```

### Relationships
- Athletes ↔ GameDays: Many-to-Many via `gameday_athletes`
- GameDays → Matches: One-to-Many
- Matches → Athletes: References via player IDs

## Query Patterns

### Simple Query
```javascript
const athletes = await db.getAllAthletes()
```

### With Filters
```javascript
const matches = await db.getMatchesByGameDay(gameDayId, {
  round: 1,
  group: 2
})
```

### Stats Calculation
```javascript
const stats = await db.getGameDayStats(gameDayId)
const leaderboard = await db.getLeaderboard()
```

## Error Handling

All query functions throw errors on failure. Use try-catch:

```javascript
try {
  const athlete = await db.getAthleteById(id)
} catch (error) {
  console.error('Database error:', error)
  res.status(500).json({ error: 'Database error' })
}
```

## Performance

- Indexes on frequently queried columns
- Connection pooling (max 20 connections)
- Query logging in development
- Automatic connection cleanup

## Maintenance

### View Active Connections
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'matchplay';
```

### View Table Sizes
```sql
SELECT 
  schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Rebuild Indexes (if slow)
```sql
REINDEX DATABASE matchplay;
```

