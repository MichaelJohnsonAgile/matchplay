# PostgreSQL Database Setup Guide

This guide will help you migrate from the in-memory data store to PostgreSQL on Render.com.

## Table of Contents
1. [Creating PostgreSQL Database on Render](#creating-postgresql-database-on-render)
2. [Initializing the Database](#initializing-the-database)
3. [Environment Variables](#environment-variables)
4. [Local Development](#local-development)
5. [Troubleshooting](#troubleshooting)

---

## Creating PostgreSQL Database on Render

### Step 1: Create New PostgreSQL Database

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** button → Select **"PostgreSQL"**
3. Configure your database:
   - **Name**: `matchplay-data` (or your preferred name)
   - **Database**: `matchplay`
   - **User**: Auto-generated
   - **Region**: Choose same region as your backend service
   - **Instance Type**: 
     - **Free** tier for testing/development
     - **Starter** or higher for production
4. Click **"Create Database"**
5. Wait for database to be provisioned (usually 1-2 minutes)

### Step 2: Get Database Connection String

Once created, Render will provide:
- **Internal Database URL** (for services in same region): `postgresql://user:password@host:5432/database`
- **External Database URL** (for external access): `postgresql://user:password@external-host:5432/database`

**Important**: Use the **Internal Database URL** for your backend service for better performance and security.

---

## Initializing the Database

### Using the Initialization Script (Recommended)

1. **Install dependencies** (if not already done):
   ```bash
   cd backend
   npm install
   ```

2. **Set DATABASE_URL environment variable in Render**:
   - Go to your Backend Web Service on Render
   - Navigate to **"Environment"** tab
   - Add environment variable:
     - **Key**: `DATABASE_URL`
     - **Value**: Your PostgreSQL **Internal Database URL**
   - Click **"Save Changes"**

3. **Initialize the database** (one-time setup):
   
   **Option A**: Connect to Render Shell
   ```bash
   # From Render Dashboard → Your Service → Shell
   npm run db:init
   ```
   
   **Option B**: Connect locally using External URL
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="your-external-database-url-here"
   npm run db:init
   ```

   This will:
   - Create all tables (athletes, gamedays, gameday_athletes, matches)
   - Set up indexes and triggers
   - Insert 12 sample athletes

---

## Environment Variables

### Backend Service on Render

Required environment variable:

| Key | Value | Description |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Internal Database URL from Render |
| `NODE_ENV` | `production` | Environment mode |

### Local Development (Optional)

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL=postgresql://localhost:5432/matchplay_dev
NODE_ENV=development
PORT=3001
```

Install dotenv and update `server.js`:
```bash
npm install dotenv
```

Add to top of `server.js`:
```javascript
import 'dotenv/config'
```

---

## Database Schema

### Tables Created

#### `athletes`
- Stores player information
- Fields: id, name, email, status, rank
- 12 sample athletes pre-populated

#### `gamedays`
- Stores game day events
- Fields: id, date, venue, status, format, settings

#### `gameday_athletes`
- Links athletes to game days (many-to-many)
- Composite key: (gameday_id, athlete_id)

#### `matches`
- Stores all matches
- Fields: id, gameday_id, round, match_group, teams, scores, winner

---

## Testing the Migration

### 1. Check Backend Logs on Render

After redeployment, look for:
```
✅ Database connection established
📍 Running on http://0.0.0.0:10000
```

### 2. Test API Endpoints

```bash
# Replace with your actual backend URL
curl https://your-backend.onrender.com/api/athletes
curl https://your-backend.onrender.com/health
```

Expected response from `/api/athletes`:
```json
[
  {
    "id": "ath-1",
    "name": "John Smith",
    "email": "john@example.com",
    "status": "active",
    "rank": 1
  },
  ...
]
```

---

## Troubleshooting

### Error: "Database connection failed"

**Solution**:
1. Verify `DATABASE_URL` is correct in Render environment variables
2. Ensure using **Internal Database URL** (not External)
3. Check database is active on Render dashboard
4. Restart the backend service

### Error: "relation 'athletes' does not exist"

**Solution**: Database not initialized
```bash
# Connect to Render shell and run:
npm run db:init
```

### Error: "password authentication failed"

**Solution**:
1. Go to Render database page
2. Copy fresh **Internal Database URL**
3. Update `DATABASE_URL` environment variable
4. Redeploy service

### Connection is slow

**Solution**:
1. Verify using **Internal URL** (not External)
2. Ensure backend and database in same region
3. Consider upgrading database tier

---

## Migration Checklist

Complete these steps in order:

- [ ] Create PostgreSQL database on Render
- [ ] Copy Internal Database URL
- [ ] Add `DATABASE_URL` to backend environment variables
- [ ] Deploy backend with updated code (with pg dependency)
- [ ] Run `npm run db:init` to initialize database
- [ ] Check Render logs for successful connection
- [ ] Test API endpoints
- [ ] Test frontend connectivity
- [ ] Verify data persistence (create game day, refresh page)

---

## Key Changes from In-Memory Store

### What Changed
- ✅ Data now persists across deployments
- ✅ All routes are now async/await
- ✅ Better error handling
- ✅ Production-ready database with indexes
- ✅ Sample data pre-loaded

### Files Added
- `backend/database/db.js` - Connection pool
- `backend/database/queries.js` - All database operations
- `backend/database/schema.sql` - Database schema
- `backend/database/init.js` - Initialization script
- `backend/DATABASE_SETUP.md` - This guide

### Files Updated
- `backend/routes/*.js` - All routes use database
- `backend/package.json` - Added pg dependency

### Files No Longer Needed
- `backend/data/store.js` - Can be safely deleted

---

## Backup and Recovery

Render automatically backs up your database:
- **Free tier**: 7 days of backups
- **Paid tiers**: 30+ days of backups

To restore:
1. Go to database on Render
2. **"Backups"** tab
3. Select backup
4. Click **"Restore"**

---

## Next Steps

After successful migration:

1. **Delete old store.js**: `backend/data/store.js` is no longer used
2. **Monitor logs**: Check for any database errors
3. **Test thoroughly**: Create game days, matches, etc.
4. **Set up monitoring**: Use Render metrics
5. **Plan for scaling**: Monitor database performance

---

## Support Resources

- [Render PostgreSQL Docs](https://render.com/docs/databases)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg) Docs](https://node-postgres.com/)

---

## Quick Reference

### Environment Variable Format
```
DATABASE_URL=postgresql://username:password@host:5432/database_name
```

### Initialize Database
```bash
npm run db:init
```

### Check Connection
```bash
node -e "import('./database/db.js').then(db => db.query('SELECT NOW()'))"
```

### View Logs
Render Dashboard → Your Service → Logs tab

