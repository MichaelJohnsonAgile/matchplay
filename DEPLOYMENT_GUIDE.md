# MatchPlay Deployment Guide - Render.com

This guide walks you through deploying both the backend and frontend to Render.com's free tier.

## Prerequisites
- GitHub account with the repository: https://github.com/MichaelJohnsonAgile/matchplay.git
- Render.com account (free - sign up at https://render.com)

---

## Part 1: Deploy Backend (Node.js/Express)

### Step 1: Create Web Service
1. Go to https://dashboard.render.com
2. Click **"New +"** button in the top right
3. Select **"Web Service"**

### Step 2: Connect GitHub Repository
1. Click **"Build and deploy from a Git repository"**
2. Click **"Connect account"** to connect GitHub (if not already connected)
3. Find and select **"matchplay"** repository
4. Click **"Connect"**

### Step 3: Configure Backend Service
Fill in the following settings:

**Basic Settings:**
- **Name**: `matchplay-backend` (or any name you prefer)
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **"Free"** (this is important!)

### Step 4: Environment Variables (Optional for now)
- **PORT**: Render automatically sets this, no need to add

### Step 5: Deploy
1. Click **"Create Web Service"** at the bottom
2. Wait for deployment (2-3 minutes)
3. Once deployed, you'll see a URL like: `https://matchplay-backend.onrender.com`

### Step 6: Test Backend
Click on the URL and add `/health` to test:
```
https://matchplay-backend.onrender.com/health
```

You should see:
```json
{"status":"ok","timestamp":"2025-11-24T..."}
```

**IMPORTANT**: Copy your backend URL - you'll need it for the frontend!

---

## Part 2: Deploy Frontend (React/Vite)

### Step 1: Update Frontend API URL
Before deploying the frontend, we need to update it to point to your Render backend.

The frontend needs to know where your backend is hosted. We'll set this up with an environment variable.

### Step 2: Create Static Site on Render
1. Go back to Render Dashboard
2. Click **"New +"** again
3. Select **"Static Site"**

### Step 3: Connect Same Repository
1. Select **"matchplay"** repository again
2. Click **"Connect"**

### Step 4: Configure Frontend Service
Fill in the following settings:

**Basic Settings:**
- **Name**: `matchplay` (or `matchplay-frontend`)
- **Branch**: `main`
- **Root Directory**: `frontend`

**Build Settings:**
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

### Step 5: Environment Variables
Click **"Advanced"** and add environment variable:
- **Key**: `VITE_API_URL`
- **Value**: `https://matchplay-backend.onrender.com` (use YOUR backend URL from Part 1)

### Step 6: Deploy
1. Click **"Create Static Site"**
2. Wait for build and deployment (2-4 minutes)
3. Once deployed, you'll get a URL like: `https://matchplay.onrender.com`

---

## Part 3: Update Frontend to Use Environment Variable

We need to update the frontend code to use the Render backend URL.

### Update `frontend/src/services/api.js`

Change this line:
```javascript
const API_BASE_URL = 'http://localhost:3001/api'
```

To:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3001/api'
```

This allows the app to:
- Use Render backend URL in production
- Use localhost when developing locally

### Commit and Push Changes
```bash
git add .
git commit -m "feat: add environment variable support for API URL (agent)"
git push origin main
```

Render will automatically redeploy both services when you push!

---

## Part 4: Verify Deployment

### Test Your App
1. Open your frontend URL: `https://matchplay.onrender.com`
2. Try creating a game day
3. Add some athletes
4. Generate matches

### Important Notes About Free Tier

**Backend Sleep Time:**
- Free tier backend sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Subsequent requests are fast

**To Keep Backend Awake (Optional):**
You can use a free service like UptimeRobot to ping your backend every 10 minutes:
1. Sign up at https://uptimerobot.com (free)
2. Add monitor for `https://matchplay-backend.onrender.com/health`
3. Set interval to 5 minutes

---

## Your URLs

After deployment, save these URLs:

**Frontend**: `https://matchplay.onrender.com`
**Backend**: `https://matchplay-backend.onrender.com`
**Backend Health Check**: `https://matchplay-backend.onrender.com/health`

---

## Troubleshooting

### Frontend Can't Connect to Backend
1. Check the backend URL in Render environment variables
2. Verify backend is running: visit `/health` endpoint
3. Check browser console for CORS errors

### Backend Won't Start
1. Check Render logs in the dashboard
2. Verify `package.json` has correct start script
3. Make sure `backend` folder has all dependencies

### Build Fails
1. Check build logs in Render dashboard
2. Verify `package.json` and `package-lock.json` are committed
3. Make sure root directory is set correctly

---

## Costs

**Current Setup: $0/month**
- Backend: Free tier (sleeps after 15 min)
- Frontend: Free tier (always on)
- Storage: In-memory (data resets on backend restart)

**To Add Persistence Later:**
If you want data to persist, you can add a free PostgreSQL database from Render (also free tier).

---

## Auto-Deployment

Your app is now set up for continuous deployment!

Every time you push to `main` branch:
1. Render automatically detects the changes
2. Rebuilds and redeploys affected services
3. Your app updates automatically

---

## Next Steps

1. Test the deployed application thoroughly
2. Share the URL with your pickleball group
3. Consider setting up UptimeRobot to prevent backend sleep
4. Add a database if you want persistent data storage

Need help? Check Render logs in the dashboard or ask for assistance!

