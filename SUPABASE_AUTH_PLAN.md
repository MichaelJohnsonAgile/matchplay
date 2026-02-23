# Supabase Authentication Plan for MatchPlay

## Current State

- **Frontend**: React 18 + Vite + Tailwind CSS, hosted on Render (static site)
- **Backend**: Express.js REST API, hosted on Render (web service)
- **Database**: PostgreSQL on Render (via `DATABASE_URL`)
- **Auth**: None — admin mode is toggled via `?admin=true` URL parameter (no password protection)

## Strategy

**Use Supabase solely for authentication.** Keep the existing database and hosting on Render. Supabase Auth will handle user sign-up, login, password reset, and JWT issuance. The Express backend will verify Supabase JWTs on protected routes.

This is the least disruptive approach — no database migration, no hosting changes, just bolting on a proper auth layer.

---

## Phase 1: Supabase Project Setup (Manual)

> These are one-time setup steps in the Supabase Dashboard.

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Note down these values** (found in Project Settings > API):
   - `SUPABASE_URL` — e.g. `https://xxxxx.supabase.co`
   - `SUPABASE_ANON_KEY` — the public anon key (safe for frontend)
   - `SUPABASE_JWT_SECRET` — found in Project Settings > API > JWT Settings (needed for backend JWT verification)
3. **Configure Auth providers** in Supabase Dashboard > Authentication > Providers:
   - Enable **Email/Password** (default)
   - Optionally enable **Google**, **Apple**, or **Magic Link** later
4. **Set the Site URL** in Authentication > URL Configuration:
   - Production: your Render frontend URL (e.g. `https://matchplay-frontend.onrender.com`)
   - Add `http://localhost:5173` as a redirect URL for local development

---

## Phase 2: Frontend Auth Integration

### 2.1 Install Supabase Client

```bash
cd frontend
npm install @supabase/supabase-js
```

### 2.2 Create Supabase Client (`frontend/src/services/supabase.js`)

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2.3 Create Auth Context (`frontend/src/contexts/AuthContext.jsx`)

A React context that:
- Listens to Supabase auth state changes (`onAuthStateChange`)
- Provides `user`, `session`, `loading`, `signIn`, `signUp`, `signOut` to all components
- Persists session automatically (Supabase handles this with localStorage)

### 2.4 Build Auth Pages

| Page/Component | Purpose |
|---|---|
| `LoginPage.jsx` | Email + password sign-in form |
| `SignUpPage.jsx` | Registration form (name, email, password) |
| `ForgotPasswordPage.jsx` | Password reset request |
| `ResetPasswordPage.jsx` | Set new password (from email link) |

All styled with Tailwind CSS to match the existing app aesthetic.

### 2.5 Add Route Protection

- Create a `<ProtectedRoute>` component that checks for an active session
- Wrap admin-only routes (game day management, athlete CRUD) in `<ProtectedRoute>`
- Public routes (leaderboard, viewing game days) remain accessible without login

### 2.6 Replace Admin Mode

Replace the current `?admin=true` URL parameter approach:

| Before | After |
|---|---|
| `useAdminMode()` checks URL param | `useAdminMode()` checks if user is authenticated |
| Anyone can add `?admin=true` | Must be logged in to access admin features |
| No password protection | Supabase handles credentials |

### 2.7 Attach JWT to API Calls

Update `frontend/src/services/api.js` to:
- Get the current session token from Supabase
- Include it as `Authorization: Bearer <token>` on requests to protected endpoints
- Handle 401 responses by redirecting to login

---

## Phase 3: Backend Auth Middleware

### 3.1 Install JWT Verification Library

```bash
cd backend
npm install jsonwebtoken
```

### 3.2 Create Auth Middleware (`backend/middleware/auth.js`)

```js
import jwt from 'jsonwebtoken'

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

### 3.3 Apply Middleware to Protected Routes

| Route | Protection |
|---|---|
| `GET /api/gamedays` | Public (read-only) |
| `POST /api/gamedays` | **Requires auth** |
| `PUT /api/gamedays/:id` | **Requires auth** |
| `DELETE /api/gamedays/:id` | **Requires auth** |
| `GET /api/athletes` | Public (read-only) |
| `POST /api/athletes` | **Requires auth** |
| `PUT /api/athletes/:id` | **Requires auth** |
| `GET /api/leaderboard` | Public |
| `POST /api/matches/:id/score` | **Requires auth** |
| All other write operations | **Requires auth** |

General rule: **GET = public, POST/PUT/DELETE = authenticated.**

### 3.4 Update CORS Configuration

Lock down CORS to known origins instead of `origin: '*'`:

```js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://matchplay-frontend.onrender.com' // your actual Render URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

---

## Phase 4: Link Supabase Users to Athletes (Optional Enhancement)

Currently, athletes are created manually in the app. Once auth exists, we can optionally:

1. **Add a `supabase_user_id` column** to the `athletes` table
2. **Auto-link** a Supabase user to their athlete profile at first login (match by email)
3. **Allow self-service profile updates** for authenticated athletes

This is not required for Phase 1 but sets the foundation for player self-service features (e.g. inputting availability for the matchmaking concept).

---

## Phase 5: Environment Variables & Deployment

### Frontend (Render Static Site)

Add these environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_API_URL` | Your backend URL (already set) |

### Backend (Render Web Service)

Add this environment variable in the Render dashboard:

| Variable | Value |
|---|---|
| `SUPABASE_JWT_SECRET` | Your Supabase JWT secret |
| `DATABASE_URL` | Already set |

### Local Development (`.env` files)

Create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

Create `backend/.env`:
```
DATABASE_URL=your-local-or-render-db-url
SUPABASE_JWT_SECRET=your-jwt-secret
```

---

## Implementation Order

| Step | Description | Effort |
|---|---|---|
| 1 | Create Supabase project & configure (manual) | 15 min |
| 2 | Install deps, create Supabase client, AuthContext | 1 hr |
| 3 | Build Login/SignUp/ForgotPassword pages | 2 hrs |
| 4 | Add ProtectedRoute, replace `useAdminMode` | 1 hr |
| 5 | Update `api.js` to attach JWT to requests | 30 min |
| 6 | Create backend auth middleware | 30 min |
| 7 | Apply middleware to protected routes | 1 hr |
| 8 | Tighten CORS config | 15 min |
| 9 | Set environment variables on Render | 15 min |
| 10 | Test end-to-end locally and on Render | 1 hr |
| **Total** | | **~7.5 hrs** |

---

## What This Gives You

- **Proper authentication** — no more `?admin=true` hack
- **Secure API** — write operations require a valid JWT
- **User management dashboard** — Supabase provides a built-in user management UI
- **Password reset flow** — handled by Supabase (emails, reset links)
- **Foundation for matchmaking** — once users have accounts, you can build availability input, notifications, and matchmaking on top
- **No database migration** — PostgreSQL stays on Render, Supabase is auth-only
- **Social login ready** — can add Google/Apple sign-in later via Supabase config

---

## Future: Toward the Matchmaking Vision

With auth in place, the path to the Padel matchmaking concept becomes:

1. **Availability input** — authenticated users submit weekly time slots
2. **Matching engine** — backend matches overlapping availability + skill levels
3. **Push notifications** — notify matched players (can use Supabase Realtime or a push service)
4. **Court booking integration** — API/scraping integration with court systems
5. **Self-service profiles** — players manage their own details, link to athlete records

Auth is the prerequisite for all of this. Get it right first, then layer on the matchmaking features.
