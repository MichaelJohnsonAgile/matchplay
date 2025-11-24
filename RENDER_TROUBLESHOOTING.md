# Render Deployment Troubleshooting Guide

## Issue: "Generate Draw" Button Not Working

If the "Generate Draw" button isn't working on your Render deployment, it's most likely a **database connection issue**. Follow these steps to diagnose and fix the problem.

---

## Step 1: Check Backend Logs

1. Go to https://dashboard.render.com
2. Click on your **Backend Service** (e.g., `matchplay-backend`)
3. Click on the **Logs** tab
4. Look for errors like:
   - `ECONNREFUSED`
   - `Database connection failed`
   - `⚠️  WARNING: DATABASE_URL environment variable not set!`

---

## Step 2: Verify Database Setup

### Check if Database Exists

1. In Render Dashboard, look for a **PostgreSQL** service (e.g., `matchplay-data`)
2. If you don't see one, you need to create it:
   - Click **"New +"** → **"PostgreSQL"**
   - Name: `matchplay-data`
   - Database: `matchplay`
   - **Region**: **Must match your backend region** (important!)
   - Instance Type: **Free**
   - Click **"Create Database"**

### Get Database Connection URL

1. Click on your PostgreSQL database
2. Scroll down to **"Connections"** section
3. Copy the **"Internal Database URL"**
   - Should look like: `postgresql://matchplay_user:xxxxx@dpg-xxxxx-a/matchplay`
   - **Important**: Use the INTERNAL URL, not the External URL

---

## Step 3: Configure Backend Environment Variable

1. Go to your **Backend Service** (matchplay-backend)
2. Click **"Environment"** tab in the left sidebar
3. Look for `DATABASE_URL` variable
4. If it doesn't exist or is wrong:
   - Click **"Add Environment Variable"**
   - Key: `DATABASE_URL`
   - Value: Paste the **Internal Database URL** from Step 2
   - Click **"Save Changes"**
5. The backend will automatically redeploy (wait 2-3 minutes)

---

## Step 4: Initialize Database Schema

After the backend redeploys, you need to create the database tables.

### Method A: Using Render Shell (Recommended)

1. Go to your **Backend Service**
2. Click **"Shell"** tab in the left sidebar
3. Wait for shell to connect
4. Run:
   ```bash
   npm run db:init
   ```
5. You should see:
   ```
   ✅ Database schema created successfully
   ✅ 12 sample athletes imported
   ```

### Method B: From Your Local Machine

If Render Shell doesn't work, you can initialize from your computer:

1. Copy the **External Database URL** from your PostgreSQL database
2. Open PowerShell on your computer
3. Navigate to the backend folder:
   ```powershell
   cd matchplay/backend
   ```
4. Set the DATABASE_URL and run init:
   ```powershell
   $env:DATABASE_URL="paste-external-url-here"
   npm run db:init
   ```

---

## Step 5: Verify It's Working

1. Check backend logs for: `✅ Database connection established`
2. Test the API endpoint:
   ```
   https://your-backend-url.onrender.com/api/athletes
   ```
3. You should see JSON with 12 sample athletes
4. Try the **"Generate Draw"** button again in your app

---

## Common Issues and Solutions

### Issue: "Database connection failed" in logs

**Cause**: `DATABASE_URL` not set or incorrect

**Solution**: 
- Verify `DATABASE_URL` environment variable in backend service
- Make sure you used the **Internal** URL, not External
- Ensure backend and database are in the **same region**

### Issue: "Database not initialized" or "relation does not exist"

**Cause**: Database tables haven't been created

**Solution**: 
- Run `npm run db:init` in Render Shell (Step 4)

### Issue: Backend takes 30+ seconds to respond

**Cause**: Free tier backend "sleeps" after 15 minutes of inactivity

**Solution**: 
- This is normal for Render's free tier
- First request after sleep will be slow (30-60 seconds)
- Subsequent requests will be fast
- **Optional**: Use UptimeRobot (free) to ping your backend every 10 minutes to keep it awake:
  1. Sign up at https://uptimerobot.com
  2. Add monitor for: `https://your-backend-url.onrender.com/health`
  3. Set interval to 10 minutes

### Issue: "CORS error" in browser console

**Cause**: CORS configuration issue

**Solution**: 
- This should be fixed with the latest backend updates
- If still occurring, check that backend `server.js` has proper CORS configuration
- Redeploy backend after confirming CORS settings

### Issue: Frontend shows old data after backend update

**Cause**: Browser cache

**Solution**: 
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear browser cache

### Issue: Page refresh returns "Not Found" (404)

**Cause**: Static site not redirecting client-side routes to index.html

**Solution**: 
1. Verify `frontend/public/_redirects` file exists with content:
   ```
   /*    /index.html   200
   ```
2. If missing, the file has been added in the latest updates
3. Commit and push changes to GitHub:
   ```bash
   git add .
   git commit -m "fix: add SPA redirect rules for Render"
   git push origin main
   ```
4. Render will automatically redeploy frontend
5. Wait 2-3 minutes for deployment
6. Try refreshing page again

---

## Quick Checklist

Use this checklist to verify everything is set up correctly:

- [ ] PostgreSQL database created on Render
- [ ] Database is in the **same region** as backend
- [ ] `DATABASE_URL` environment variable set in backend service
- [ ] Used **Internal** database URL (not External)
- [ ] Backend redeployed after setting DATABASE_URL
- [ ] `npm run db:init` executed successfully
- [ ] Backend logs show: `✅ Database connection established`
- [ ] `/api/athletes` endpoint returns 12 athletes
- [ ] Frontend `VITE_API_URL` points to correct backend URL
- [ ] Frontend redeployed after any changes

---

## Recent Updates (November 2024)

The following improvements have been made to help with deployment issues:

### Backend Improvements:
1. **Better error logging**: More detailed console logs during draw generation
2. **Database detection**: Warns if `DATABASE_URL` not set
3. **Specific error codes**: Returns clear error messages for common database issues
4. **CORS configuration**: Explicit CORS headers to prevent cross-origin issues
5. **Connection timeout**: Increased from 2s to 5s for slower connections

### Frontend Improvements:
1. **Better error parsing**: Shows specific error messages from backend
2. **User-friendly messages**: Translates technical errors to helpful messages
3. **Network error handling**: Detects when backend is unreachable
4. **Loading states**: Shows when backend is processing request

---

## Still Having Issues?

If you've followed all steps and it's still not working:

1. **Check Render Status**: https://status.render.com
2. **Review all logs**: Both backend and database logs in Render dashboard
3. **Try manual database connection**: Use a PostgreSQL client (like DBeaver or pgAdmin) with the External URL to verify database is accessible
4. **Contact support**: Render has good free tier support

---

## Monitoring Your Deployment

### Health Checks

Your backend has a health check endpoint:
```
https://your-backend-url.onrender.com/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-11-24T..."
}
```

### Database Usage

Monitor your database usage in Render Dashboard:
- Free tier: 1 GB storage
- View current usage in PostgreSQL service dashboard
- Automatic backups for 90 days

---

## Additional Resources

- **Full Deployment Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Database Setup**: [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md)
- **Database Module**: [backend/database/README.md](backend/database/README.md)
- **Render Documentation**: https://render.com/docs

---

**Last Updated**: November 24, 2024

