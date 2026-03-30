# Padel Matchmaker — Full App Plan

## Overview

A matchmaking app for Padel that automates the painful part of organising a game: finding who's free, when, and where. Players set their availability, the app finds overlapping slots, proposes balanced matches, and — once everyone confirms — books the court.

Think Call of Duty matchmaking lobby, but for Padel.

**This is a separate frontend** from the existing MatchPlay tournament management app. They share Supabase Auth and can share the same backend (extended) and database.

---

## Two Apps, One Platform

| | **MatchPlay** (existing) | **Padel Matchmaker** (new) |
|---|---|---|
| **Purpose** | Run organised game days, round-robins, tournaments | Find people to play with on any given day |
| **Users** | Organisers / admins | Players themselves |
| **Frontend** | `frontend/` (React + Vite) | `matchmaker/` (new React + Vite app) |
| **Backend** | `backend/` (Express) — extended with new routes | Same backend, new route groups |
| **Database** | Existing tables (athletes, gamedays, matches, teams) | New tables (profiles, availability, proposals, venues) |
| **Auth** | Supabase Auth (shared) | Supabase Auth (shared) |
| **Hosting** | Render | Render (second static site) |

The two apps complement each other: Matchmaker fills casual/pickup games, MatchPlay runs structured events.

---

## App Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Auth                         │
│              (shared across both apps)                   │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
    ┌──────────▼──────────┐ ┌────────▼────────────┐
    │   MatchPlay Frontend│ │ Matchmaker Frontend  │
    │   (existing)        │ │ (new — mobile-first) │
    │   Render static     │ │ Render static        │
    └──────────┬──────────┘ └────────┬────────────┘
               │                      │
               ▼                      ▼
    ┌─────────────────────────────────────────────┐
    │           Express Backend (extended)          │
    │                                               │
    │  /api/gamedays    (existing MatchPlay)        │
    │  /api/athletes    (existing MatchPlay)        │
    │  /api/matches     (existing MatchPlay)        │
    │  /api/leaderboard (existing MatchPlay)        │
    │  /api/teams       (existing MatchPlay)        │
    │                                               │
    │  /api/profiles    (new — Matchmaker)          │
    │  /api/availability(new — Matchmaker)          │
    │  /api/proposals   (new — Matchmaker)          │
    │  /api/venues      (new — Matchmaker)          │
    │  /api/matchmaking (new — Matchmaker)          │
    │                                               │
    │  Matchmaking Engine (cron / triggered)        │
    │  Notification Service                         │
    └──────────────────┬──────────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────────┐
    │          PostgreSQL (Render)                  │
    │                                               │
    │  Existing: athletes, gamedays, matches, etc.  │
    │  New: profiles, availability_slots,           │
    │       match_proposals, proposal_responses,    │
    │       venues, courts, bookings,               │
    │       player_preferences, notifications       │
    └─────────────────────────────────────────────┘
```

---

## Core User Flow

```
1. SIGN UP / LOG IN
   └─ Supabase Auth (email + password, social later)

2. SET UP PROFILE
   └─ Name, skill level, preferred venues, preferred times
   └─ Optionally link to existing MatchPlay athlete record

3. SET AVAILABILITY
   └─ Weekly recurring slots (e.g. "Tuesdays 6–8pm, Saturdays 9am–12pm")
   └─ One-off availability (e.g. "This Friday 5–7pm")
   └─ Quick "I'm free now" button for spontaneous games

4. MATCHMAKING ENGINE RUNS
   └─ Finds 4 players with overlapping time + venue
   └─ Balances by skill level where possible
   └─ Creates a match proposal

5. RECEIVE NOTIFICATION
   └─ Push notification: "Match found! Tue 6pm at City Padel"
   └─ In-app notification in the match feed

6. CONFIRM / DECLINE
   └─ Each player taps Confirm or Decline
   └─ If someone declines → engine finds a replacement
   └─ Timeout after X hours → auto-decline

7. ALL CONFIRMED → BOOK
   └─ App books the court (via API integration or manual confirmation)
   └─ All players get a confirmed booking notification
   └─ Match appears in "Upcoming" section

8. PLAY → RATE
   └─ After the match, optionally log the score
   └─ Skill ratings update (feeds back into future matchmaking)
```

---

## Data Model (New Tables)

### `profiles`

Player profiles, linked to Supabase Auth users. Separate from the existing `athletes` table (which is for MatchPlay tournament tracking).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Matches Supabase `auth.users.id` |
| `display_name` | VARCHAR(255) | |
| `email` | VARCHAR(255) | From Supabase Auth |
| `phone` | VARCHAR(50) | Optional, for SMS notifications |
| `skill_level` | DECIMAL(3,1) | 1.0 – 7.0 scale (standard Padel rating) |
| `skill_self_assessed` | BOOLEAN | Whether the rating is self-assessed or calculated |
| `preferred_hand` | VARCHAR(10) | 'left', 'right' |
| `preferred_side` | VARCHAR(10) | 'forehand', 'backhand', 'either' |
| `avatar_url` | TEXT | Profile photo |
| `athlete_id` | VARCHAR(50) | FK to `athletes.id` (optional link to MatchPlay) |
| `notifications_enabled` | BOOLEAN | |
| `push_token` | TEXT | For push notifications |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### `venues`

Padel venues/clubs.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | VARCHAR(255) | |
| `address` | TEXT | |
| `suburb` | VARCHAR(100) | For location filtering |
| `latitude` | DECIMAL(10,7) | |
| `longitude` | DECIMAL(10,7) | |
| `number_of_courts` | INTEGER | |
| `booking_url` | TEXT | Link to external booking system |
| `booking_api_type` | VARCHAR(50) | 'manual', 'playcourt', 'play_tonight', etc. |
| `booking_api_config` | JSONB | API keys, endpoint config for automated booking |
| `created_at` | TIMESTAMP | |

### `availability_slots`

When players are free to play.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `profile_id` | UUID (FK → profiles) | |
| `slot_type` | VARCHAR(20) | 'recurring' or 'one_off' |
| `day_of_week` | INTEGER | 0=Sun, 6=Sat (for recurring) |
| `specific_date` | DATE | For one-off slots |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `venue_id` | UUID (FK → venues) | Preferred venue for this slot (nullable = any) |
| `is_active` | BOOLEAN | Can toggle off without deleting |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### `match_proposals`

A proposed match that the engine has generated.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `status` | VARCHAR(20) | 'pending', 'confirmed', 'cancelled', 'expired', 'completed' |
| `proposed_date` | DATE | |
| `proposed_start` | TIME | |
| `proposed_end` | TIME | |
| `venue_id` | UUID (FK → venues) | |
| `court_number` | INTEGER | Nullable until booked |
| `skill_avg` | DECIMAL(3,1) | Average skill of proposed players |
| `skill_spread` | DECIMAL(3,1) | Max skill difference |
| `confirmation_deadline` | TIMESTAMP | After this, unconfirmed = expired |
| `booking_reference` | VARCHAR(100) | External booking system reference |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### `proposal_responses`

Each player's response to a match proposal.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `proposal_id` | UUID (FK → match_proposals) | |
| `profile_id` | UUID (FK → profiles) | |
| `team_position` | VARCHAR(20) | 'team_a_1', 'team_a_2', 'team_b_1', 'team_b_2' |
| `response` | VARCHAR(20) | 'pending', 'confirmed', 'declined' |
| `responded_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

### `notifications`

In-app notification log.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `profile_id` | UUID (FK → profiles) | |
| `type` | VARCHAR(50) | 'match_found', 'match_confirmed', 'match_cancelled', 'reminder', etc. |
| `title` | VARCHAR(255) | |
| `body` | TEXT | |
| `data` | JSONB | Payload (proposal_id, etc.) |
| `read` | BOOLEAN | |
| `created_at` | TIMESTAMP | |

### `player_preferences`

Fine-grained matchmaking preferences.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `profile_id` | UUID (FK → profiles) | UNIQUE |
| `min_skill` | DECIMAL(3,1) | Don't match me below this |
| `max_skill` | DECIMAL(3,1) | Don't match me above this |
| `preferred_venue_ids` | UUID[] | Array of venue IDs |
| `max_travel_km` | INTEGER | |
| `min_notice_hours` | INTEGER | Don't propose matches less than X hours away |
| `preferred_match_duration` | INTEGER | Minutes (60, 90, 120) |
| `updated_at` | TIMESTAMP | |

---

## Screen-by-Screen Breakdown

### Mobile-First Design

This app should feel native. Mobile-first, bottom tab navigation, pull-to-refresh, swipe gestures. Consider building as a PWA (Progressive Web App) so it can be installed on home screens and receive push notifications.

### Navigation (Bottom Tabs)

| Tab | Icon | Screen |
|---|---|---|
| **Play** | Racquet | Match feed — upcoming, pending, open proposals |
| **Calendar** | Calendar | Availability management |
| **Lobby** | People | Who's available right now / soon |
| **Profile** | Person | Profile, preferences, stats, settings |

### Screen Details

#### 1. Onboarding (first login only)

- Welcome screen with app concept
- **Step 1**: Display name, profile photo
- **Step 2**: Skill level (guided self-assessment with descriptions per level)
- **Step 3**: Preferred venues (search/select from list)
- **Step 4**: Set your first availability slots
- Skip allowed — can complete later

#### 2. Play Tab (Home / Match Feed)

The main screen. Three sections:

**Pending Proposals** (action required)
- Cards showing: date, time, venue, other players (with skill levels)
- Confirm / Decline buttons
- Countdown timer to confirmation deadline
- "CoD lobby" feel — see players joining in real-time

**Upcoming Matches** (confirmed)
- Date, time, venue, court number
- All 4 players shown
- Directions button (maps link)
- Cancel option (with penalty/notice rules)

**Recent Results**
- Past matches with scores
- Win/loss record

#### 3. Calendar Tab (Availability)

- Weekly view showing your availability blocks
- Tap a day to add/edit time slots
- Toggle recurring vs one-off
- Select preferred venue per slot (or "any")
- Visual indicator of how many others are available in overlapping times
- "I'm free now" quick button at the top

#### 4. Lobby Tab (Who's Around)

The "CoD lobby" concept:

- Shows players who are available in the next few hours
- Grouped by venue
- Shows skill level, preferred side
- "Invite to play" button to manually propose a match
- Real-time updates (Supabase Realtime or polling)
- Shows "3 of 4 players found for 6pm at City Padel — join?"

#### 5. Profile Tab

- Edit profile details
- Skill rating (self-assessed + calculated from match results)
- Match statistics (games played, win rate, frequent partners)
- Preferred venues management
- Notification preferences
- Matchmaking preferences (skill range, travel distance, notice time)
- Link to MatchPlay athlete profile (if applicable)
- Sign out

---

## Matchmaking Engine

The core brain of the app. Runs as either a scheduled job (cron) or is triggered when availability changes.

### Algorithm (High Level)

```
1. COLLECT all active availability slots for the target date/time window

2. GROUP by overlapping time windows + venue
   - Find all combinations of 4 players whose availability overlaps
     by at least the minimum match duration (e.g. 90 minutes)

3. SCORE each potential group:
   - Skill balance: prefer small spread between highest and lowest
   - Team balance: prefer even split (e.g. 5.0+3.0 vs 4.5+3.5)
   - Venue preference: prefer venues that more players listed
   - Recency: avoid matching the same 4 players repeatedly
   - Response history: prefer players who reliably confirm

4. RANK groups by score, pick the best

5. CREATE match_proposal + 4 proposal_responses (status: pending)

6. SEND notifications to all 4 players

7. WAIT for responses:
   - All confirm → book court, update status to 'confirmed'
   - Someone declines → find replacement from remaining pool
   - Timeout → expire proposal, try again with different group

8. REPEAT for all viable groups in the time window
```

### Trigger Points

| Trigger | Action |
|---|---|
| Player adds availability | Run engine for that time window |
| Daily at configurable time (e.g. 8am) | Run engine for next 48 hours |
| Player declines a proposal | Run engine to find replacement |
| "I'm free now" button pressed | Run engine for immediate window |

### Skill Balancing

Padel is doubles (2v2). The engine should aim for balanced teams:

- Sum of team skill levels should be close (e.g. 5.0+3.0 = 8.0 vs 4.5+3.5 = 8.0)
- Consider preferred side (forehand/backhand) for team composition
- Allow player preferences to constrain the skill range

---

## Court Booking Integration

### Phase 1: Manual (MVP)

- Proposal includes venue + time but no court number
- Once confirmed, app shows a "Book Now" button linking to the venue's booking website
- Players book manually and report back

### Phase 2: Deep Link / Redirect

- Pre-fill booking details in the venue's booking URL where possible
- One-tap booking flow

### Phase 3: API Integration

- Direct integration with court booking platforms (Play Tonight, PlayCourt, etc.)
- App checks real-time court availability before proposing matches
- Auto-books on confirmation
- Handles payments (split between 4 players or single payer)

Each venue's `booking_api_type` and `booking_api_config` in the database determines which integration to use.

---

## Notifications

### Push Notifications (PWA / Firebase)

| Event | Notification |
|---|---|
| Match proposal created | "Match found! Tue 6pm at City Padel. Tap to confirm." |
| All players confirmed | "You're on! Tue 6pm at City Padel, Court 3. See you there." |
| Player declined | "A player dropped out of your Tue 6pm match. Finding a replacement..." |
| Replacement found | "New player joined your Tue 6pm match. Tap to see details." |
| Proposal expired | "Match proposal expired. We'll try again with your next availability." |
| Reminder (2hrs before) | "Reminder: Padel at 6pm today at City Padel." |
| Score request (after match) | "How did your match go? Tap to log the score." |

### Implementation Options

| Approach | Pros | Cons |
|---|---|---|
| **Web Push (PWA)** | No app store needed, works from browser | iOS Safari support is limited |
| **Firebase Cloud Messaging** | Works on all platforms, free tier generous | Extra dependency |
| **Supabase Realtime** | Already in the stack, real-time in-app updates | Not push notifications (app must be open) |

**Recommendation**: Use Supabase Realtime for in-app live updates (lobby, confirmations), and Web Push or Firebase for background notifications. Start with in-app only for MVP.

---

## Tech Stack (Matchmaker Frontend)

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | React 18 + Vite | Same as MatchPlay — shared knowledge |
| **Styling** | Tailwind CSS | Same as MatchPlay |
| **Routing** | React Router v6 | Same as MatchPlay |
| **Auth** | @supabase/supabase-js | Shared Supabase project |
| **State** | React Context + hooks | Simple enough for MVP; upgrade to Zustand if needed |
| **Realtime** | Supabase Realtime | Live lobby updates, proposal status changes |
| **PWA** | vite-plugin-pwa | Installable, offline shell, push notification support |
| **Icons** | Lucide React or Heroicons | Lightweight, consistent |
| **Date/Time** | date-fns | Lightweight date manipulation |
| **Maps** | Google Maps embed or Leaflet | Venue locations, directions |

---

## API Routes (New)

All new routes sit alongside existing MatchPlay routes in the same Express backend.

### Profiles

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/profiles/me` | Required | Get current user's profile |
| PUT | `/api/profiles/me` | Required | Update profile |
| POST | `/api/profiles/me/onboarding` | Required | Complete onboarding |
| GET | `/api/profiles/:id` | Required | View another player's profile |

### Availability

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/availability` | Required | Get my availability slots |
| POST | `/api/availability` | Required | Add a new slot |
| PUT | `/api/availability/:id` | Required | Update a slot |
| DELETE | `/api/availability/:id` | Required | Remove a slot |
| POST | `/api/availability/free-now` | Required | Mark "I'm free now" (creates a one-off slot) |

### Match Proposals

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/proposals` | Required | Get my proposals (pending + upcoming) |
| GET | `/api/proposals/:id` | Required | Get proposal detail |
| POST | `/api/proposals/:id/respond` | Required | Confirm or decline |
| POST | `/api/proposals/:id/cancel` | Required | Cancel a confirmed match |
| POST | `/api/proposals/:id/score` | Required | Log match score |

### Venues

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/venues` | Public | List venues |
| GET | `/api/venues/:id` | Public | Venue detail |
| GET | `/api/venues/:id/availability` | Required | Check court availability (if API integrated) |

### Matchmaking

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/matchmaking/trigger` | Required | Manually trigger matchmaking for my availability |
| GET | `/api/matchmaking/lobby` | Required | Get "lobby" — who's available now/soon |

### Preferences

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/preferences` | Required | Get my matchmaking preferences |
| PUT | `/api/preferences` | Required | Update preferences |

---

## Implementation Phases

### Phase 0: Supabase Auth (already planned)

See `SUPABASE_AUTH_PLAN.md`. This is the prerequisite for everything below.

**Outcome**: Users can sign up, log in, and get JWTs.

---

### Phase 1: Foundation (MVP)

> Goal: Players can create profiles, set availability, and see who else is available. Manual match organisation.

**Backend**:
- New database tables: `profiles`, `venues`, `availability_slots`, `player_preferences`
- Database migration scripts
- API routes: profiles, availability, venues, preferences
- Seed a few venues

**Frontend** (`matchmaker/`):
- New Vite + React + Tailwind project
- Supabase Auth integration (shared with MatchPlay)
- Onboarding flow
- Profile page
- Availability calendar (set recurring + one-off slots)
- Lobby view (who's available when — read-only, no matchmaking yet)
- Bottom tab navigation
- Responsive, mobile-first design

**Estimated effort**: 2–3 weeks

---

### Phase 2: Matchmaking Engine

> Goal: The app automatically proposes matches and players confirm/decline.

**Backend**:
- New database tables: `match_proposals`, `proposal_responses`, `notifications`
- Matchmaking algorithm (overlap detection, skill balancing, team composition)
- Scheduled job (cron) to run engine periodically
- Trigger engine on availability changes
- Proposal lifecycle management (pending → confirmed/expired/cancelled)
- In-app notification creation

**Frontend**:
- Match feed / Play tab (pending proposals, upcoming matches)
- Proposal detail screen (see players, confirm/decline)
- Confirmation countdown UI
- Notification bell with unread count
- Match history section

**Estimated effort**: 3–4 weeks

---

### Phase 3: Real-time & Notifications

> Goal: Live lobby updates and push notifications so players don't miss proposals.

**Backend**:
- Supabase Realtime integration for live lobby + proposal status
- Push notification service (Web Push or Firebase)
- Notification preferences management
- Reminder system (2 hours before confirmed match)

**Frontend**:
- Real-time lobby updates (players appearing/disappearing)
- Real-time proposal status (see others confirming live — the "CoD lobby" moment)
- Push notification permission prompt + setup
- PWA manifest + service worker (installable on home screen)

**Estimated effort**: 2–3 weeks

---

### Phase 4: Court Booking Integration

> Goal: Automated or semi-automated court booking.

**Backend**:
- Venue booking API abstraction layer
- Integration with at least one platform (Play Tonight or similar)
- Court availability checking (before proposing matches)
- Auto-booking on full confirmation
- Booking cancellation handling

**Frontend**:
- Court availability display in proposals
- "Book Now" deep link for manual booking
- Booking confirmation display
- Payment split information (if applicable)

**Estimated effort**: 3–4 weeks (highly dependent on external API availability)

---

### Phase 5: Skill Rating & Match Quality

> Goal: Better matchmaking through data.

**Backend**:
- Elo-style or Glicko rating system based on match results
- Calculated skill ratings (supplement self-assessed)
- Match quality scoring and feedback
- "Preferred partners" and "avoid" lists
- Analytics: games played, win rate, favourite venues, most common partners

**Frontend**:
- Skill rating display with history graph
- Post-match rating screen
- Player statistics dashboard
- Match quality feedback ("How was the balance?")

**Estimated effort**: 2–3 weeks

---

### Phase 6: Social & Growth

> Goal: Make the app sticky and viral.

- Player search and friend system
- Direct match invitations (skip the engine, invite specific people)
- Group/club creation (e.g. "Tuesday Night Padel Crew")
- Share match results to socials
- Referral system
- Integration between Matchmaker and MatchPlay (tournament invitations)

**Estimated effort**: 3–4 weeks

---

## Timeline Summary

| Phase | What | Duration | Cumulative |
|---|---|---|---|
| 0 | Supabase Auth | 1 week | 1 week |
| 1 | Foundation (profiles, availability, lobby) | 2–3 weeks | 3–4 weeks |
| 2 | Matchmaking engine + proposals | 3–4 weeks | 6–8 weeks |
| 3 | Real-time + push notifications | 2–3 weeks | 8–11 weeks |
| 4 | Court booking integration | 3–4 weeks | 11–15 weeks |
| 5 | Skill rating system | 2–3 weeks | 13–18 weeks |
| 6 | Social features | 3–4 weeks | 16–22 weeks |

**MVP (Phases 0–2)**: ~6–8 weeks to a working matchmaking app.

**Full vision**: ~4–5 months.

---

## Directory Structure

```
/workspace
├── frontend/              # Existing MatchPlay tournament app
├── matchmaker/            # New Padel Matchmaker app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/    # Shared UI (Button, Card, Avatar, etc.)
│   │   │   ├── auth/      # Login, SignUp, ForgotPassword
│   │   │   ├── onboarding/# Onboarding wizard steps
│   │   │   ├── play/      # Match feed, proposal cards
│   │   │   ├── calendar/  # Availability management
│   │   │   ├── lobby/     # Live lobby view
│   │   │   └── profile/   # Profile, preferences, stats
│   │   ├── contexts/      # AuthContext, NotificationContext
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Top-level page components
│   │   ├── services/      # API client, Supabase client
│   │   ├── utils/         # Date helpers, skill formatting, etc.
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── manifest.json  # PWA manifest
│   │   └── icons/         # App icons for PWA
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/               # Shared Express backend (extended)
│   ├── database/
│   │   ├── schema.sql              # Existing MatchPlay schema
│   │   ├── matchmaker-schema.sql   # New Matchmaker tables
│   │   └── migrations/
│   │       ├── 001_add_teams_mode.sql
│   │       ├── 002_add_pairs_mode.sql
│   │       └── 003_add_matchmaker_tables.sql
│   ├── routes/
│   │   ├── athletes.js      # Existing
│   │   ├── gamedays.js      # Existing
│   │   ├── matches.js       # Existing
│   │   ├── leaderboard.js   # Existing
│   │   ├── teams.js         # Existing
│   │   ├── profiles.js      # New
│   │   ├── availability.js  # New
│   │   ├── proposals.js     # New
│   │   ├── venues.js        # New
│   │   ├── matchmaking.js   # New
│   │   └── preferences.js   # New
│   ├── middleware/
│   │   └── auth.js          # Supabase JWT verification
│   ├── services/
│   │   ├── matchmaking-engine.js  # Core algorithm
│   │   ├── notification.js        # Push + in-app notifications
│   │   └── booking.js             # Court booking integration
│   └── server.js
├── render.yaml            # Updated for 3 services
├── SUPABASE_AUTH_PLAN.md
└── MATCHMAKER_APP_PLAN.md  # This document
```

---

## Key Design Decisions to Make

| Decision | Options | Recommendation |
|---|---|---|
| **Separate DB or shared?** | Same PostgreSQL with new tables vs separate DB | Same DB, new tables — simpler ops |
| **Matchmaker as PWA or native?** | PWA vs React Native vs Expo | PWA first — fastest to ship, no app store needed. Go native later if traction warrants it |
| **Real-time tech** | Supabase Realtime vs WebSockets vs polling | Supabase Realtime — already in the stack |
| **Skill rating system** | Self-assessed only vs Elo vs Glicko-2 | Self-assessed for MVP, Glicko-2 once enough match data exists |
| **Court booking** | Manual first vs API integration | Manual first (Phase 1–2), API later (Phase 4) |
| **Notification delivery** | Web Push vs Firebase vs email only | Email + in-app for MVP, Web Push for Phase 3 |
| **Match size** | 4 players (doubles only) vs flexible | Doubles (4 players) — it's Padel. Option for "need 1 more" if 3 are confirmed |

---

## Risk & Considerations

| Risk | Mitigation |
|---|---|
| Not enough players for matchmaking to work | Start with a single venue/community. Manual invitations as fallback. Growth features in Phase 6 |
| Court booking APIs are proprietary/undocumented | Phase 1–2 work without booking integration. Deep links as intermediate step |
| Push notifications unreliable on iOS PWA | Email fallback. Consider native app wrapper (Capacitor) if needed |
| Skill levels are subjective (self-assessed) | Calibrate over time with match results. Show "self-assessed" badge until calculated |
| Players don't confirm in time | Configurable deadline. Over-propose (notify alternates). Track reliability scores |
| Same people matched repeatedly | Factor in match history. Penalise repeat pairings in the algorithm |
