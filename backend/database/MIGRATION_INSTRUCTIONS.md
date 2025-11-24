# Teams Mode Database Migration - Render Instructions

## How to Run the Migration on Render

### Option 1: Using Render Dashboard (Recommended)

1. Go to your Render Dashboard: https://dashboard.render.com
2. Navigate to your PostgreSQL database
3. Click on "Connect" → "PSQL Command"
4. Copy the connection string
5. In your local terminal, run:
   ```bash
   psql "your-connection-string-here"
   ```
6. Once connected, copy and paste the entire contents of `backend/database/migrations/001_add_teams_mode.sql`
7. Press Enter to execute
8. Type `\q` to exit

### Option 2: Using Render Shell

1. Go to your Render Dashboard
2. Navigate to your web service (MatchPlay backend)
3. Click on "Shell" tab
4. Run:
   ```bash
   psql $DATABASE_URL -f backend/database/migrations/001_add_teams_mode.sql
   ```

### Option 3: Manually via SQL Console (If Available)

1. Some Render plans include a SQL console
2. Open it and paste the migration SQL directly
3. Execute

## Verification

After running the migration, verify with:

```sql
-- Check teams table exists
SELECT * FROM teams LIMIT 1;

-- Check team_members table exists
SELECT * FROM team_members LIMIT 1;

-- Check gamedays has number_of_teams column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'gamedays' AND column_name = 'number_of_teams';

-- Check matches has team reference columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'matches' AND column_name IN ('team_a_team_id', 'team_b_team_id');
```

Expected output: All queries should succeed without errors.

## Rollback (If Needed)

If something goes wrong, you can rollback with:

```sql
-- Remove new columns from matches
ALTER TABLE matches DROP COLUMN IF EXISTS team_a_team_id;
ALTER TABLE matches DROP COLUMN IF EXISTS team_b_team_id;

-- Remove new column from gamedays
ALTER TABLE gamedays DROP COLUMN IF EXISTS number_of_teams;

-- Drop new tables (cascade will remove constraints)
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
```

## When to Run

Run this migration **AFTER** all the backend code changes are deployed, but **BEFORE** trying to create a Teams mode game day.

The existing "Group" mode will continue to work normally whether this migration has been run or not.

