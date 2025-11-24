# MatchPlay - PostgreSQL Migration Complete! 

## What We Accomplished

The MatchPlay application has been successfully migrated from in-memory storage to PostgreSQL database for persistent data storage on Render.com.

## Migration Summary

### Database Infrastructure
- PostgreSQL schema with 4 tables
- Connection pooling for performance
- Indexes for fast queries
- Sample data (12 athletes) included
- Auto-updating timestamps
- Foreign key relationships with cascade deletes

### Code Updates
- All routes converted to async/await
- Database query functions in `database/queries.js`
- Connection pool in `database/db.js`
- Initialization script: `npm run db:init`

### Documentation Created
- `backend/DATABASE_SETUP.md` - Complete setup guide
- `backend/database/README.md` - Database module docs
- `POSTGRES_MIGRATION.md` - Migration summary
- Updated `DEPLOYMENT_GUIDE.md` with database steps
- Updated `backend/README.md` with new structure

## Deployment Steps on Render.com

### Step 1: Install Dependencies Locally (Optional)
```bash
cd matchplay/backend
npm install
```

This will install the new `pg` (PostgreSQL driver) package.

### Step 2: Push Code to GitHub
```bash
git add .
git commit -m "feat: migrate to PostgreSQL database (agent)"
git push origin main
```

Render will automatically redeploy your backend with the new code.

### Step 3: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Settings:
   - **Name**: `matchplay-db`
   - **Database**: `matchplay`
   - **Region**: **Same as your backend** (e.g., Oregon)
   - **Instance Type**: **Free**
4. Click **"Create Database"**
5. Wait 1-2 minutes

### Step 4: Get Database Connection String

1. Once database is ready, find **"Connections"** section
2. Copy the **Internal Database URL**
   - Format: `postgresql://user:password@host/database`
   - Example: `postgresql://matchplay_user:xxxxx@dpg-xxxxx-a.oregon-postgres.render.com/matchplay`

### Step 5: Configure Backend with Database URL

1. Go to your **Backend Web Service** (matchplay-backend)
2. Click **"Environment"** in left sidebar
3. Click **"Add Environment Variable"**
4. Enter:
   - **Key**: `DATABASE_URL`
   - **Value**: [Paste the Internal Database URL]
5. Click **"Save Changes"**
6. Backend will automatically redeploy (2-3 minutes)

### Step 6: Initialize the Database

After backend finishes redeploying:

**Method 1: Via Render Shell (Easiest)**
1. Go to your backend service
2. Click **"Shell"** tab
3. Type: `npm run db:init`
4. Press Enter
5. Look for: ✅ Database schema created successfully

**Method 2: Via Local Terminal**
```bash
cd matchplay/backend
$env:DATABASE_URL="[External Database URL from Render]"
npm run db:init
```

### Step 7: Verify Everything Works

1. Check backend logs:
   - Go to backend service → "Logs"
   - Look for: `✅ Database connection established`

2. Test API:
   ```
   https://your-backend.onrender.com/api/athletes
   ```
   Should return 12 sample athletes

3. Test Frontend:
   - Open your frontend URL
   - Create a game day
   - Add athletes
   - Refresh page - data should persist!

## What's Different Now?

### Before (In-Memory Storage)
- Data lost on backend restart
- Data lost when backend sleeps
- Data lost on every deployment
- Not suitable for production

### After (PostgreSQL Database)
- Data persists forever
- Survives restarts and sleep
- Survives deployments
- Production-ready
- Free tier: 1GB storage

## File Structure Changes

### New Files
```
backend/
├── database/
│   ├── db.js              # Connection pool
│   ├── queries.js         # Database queries
│   ├── schema.sql         # Database schema
│   ├── init.js            # Initialization
│   └── README.md          # Docs
├── DATABASE_SETUP.md      # Setup guide
└── [Updated all routes]
```

### Files You Can Delete (After Testing)
```
backend/data/store.js      # Old in-memory store
```

## Environment Variables Required

For backend service on Render:
- `DATABASE_URL` - PostgreSQL connection string (Internal URL)
- `NODE_ENV` - Set to "production" (Render sets this automatically)

## Testing Locally (Optional)

### Option 1: Use Render Database
```bash
cd matchplay/backend
$env:DATABASE_URL="[External Database URL]"
npm run dev
```

### Option 2: Local PostgreSQL
```bash
# Install PostgreSQL locally, then:
createdb matchplay_dev
$env:DATABASE_URL="postgresql://localhost:5432/matchplay_dev"
npm run db:init
npm run dev
```

## Troubleshooting

### Backend won't start after adding DATABASE_URL
- Check Render logs for specific error
- Verify DATABASE_URL is the **Internal** URL
- Ensure backend and database in same region

### "relation 'athletes' does not exist"
- Database not initialized
- Run `npm run db:init` via Render Shell

### Data not persisting
- Verify DATABASE_URL is set correctly
- Check backend logs for database connection errors
- Ensure database initialization completed

### Connection timeout
- Verify using Internal URL (not External)
- Check database is active in Render dashboard

## Success Indicators

You know it's working when:
- ✅ Backend logs show: "Database connection established"
- ✅ `/api/athletes` returns 12 athletes
- ✅ Created data persists after page refresh
- ✅ Data survives backend restart
- ✅ No "store is not defined" errors

## Next Steps

1. Test all features thoroughly
2. Create some game days with real data
3. Generate matches and enter scores
4. Verify everything persists
5. Share with your pickleball group!

## Costs

Everything remains **FREE**:
- Backend: Free tier
- Frontend: Free tier
- Database: Free tier (1GB storage)

Total: **$0/month**

## Documentation

- **Setup Guide**: `backend/DATABASE_SETUP.md`
- **Database Docs**: `backend/database/README.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **Migration Summary**: `POSTGRES_MIGRATION.md`

## Need Help?

1. Check the troubleshooting sections in the docs
2. Review Render logs (Backend service → Logs)
3. Verify environment variables are set correctly
4. Ensure database initialization completed

---

**Congratulations!** Your MatchPlay application now has enterprise-grade persistent storage and is ready for production use! 🎉

