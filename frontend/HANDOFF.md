# MatchPlay Frontend - Handoff Document

## Project Overview
React-based mobile-first application for pickleball scoring and league management.

## Current Status (Phase 3 In Progress)

### What's Built ✅
- **Tech Stack**: React 18 + Vite + Tailwind CSS + React Router
- **Mobile-First Design**: White background, black text/borders, touch-optimized
- **Backend API**: Node.js + Express backend running on port 3001

#### Dashboard/Home Page
- List of all game days (upcoming, in-progress, completed)
- Status indicators and quick stats
- "Create Game Day" button with modal form
- Click game day card to navigate to detail page
- Real API integration with error handling

#### Game Day Creation
- Form with date picker, venue (default: Evolve North Narrabeen), number of courts
- Scoring rules configuration (points to win, win by margin)
- Number of rounds selector
- Validation and API integration
- Redirects to new game day on success

#### Athletes Tab
- Overall season leaderboard table
- Columns: Rank, Initial Group, Athlete, Games Played, Wins, Losses, + (Points For), - (Points Against), +/- (Point Diff)
- "Add +" button opens modal to select athletes
- "Generate Draw" button to create matches (Round 1 only)
- Edit/Remove actions for each athlete row
- Real data from API with loading states
- Flexible group allocation (4 or 5 player groups with byes)

#### Matches Tab
- Group and Round dropdown filters
- **Group Leaderboard** showing Position, Athlete, W, L, +/-
  - Dynamically calculated from match results
  - Position 1: Green highlighting (light when scoring, solid when complete)
  - Last position: Red highlighting (light when scoring, solid when complete)
  - Real-time updates as scores are entered
- Match cards showing **actual athlete names**
- Team pairings displayed (Player 1 & Player 2)
- **Bye player** displayed for 5-player groups
- Click match card to open score entry modal
- Score persistence to backend API
- Winner/loser highlighting (green/red backgrounds)

### File Structure
```
matchplay/
├── backend/
│   ├── data/
│   │   └── store.js                # In-memory data store
│   ├── routes/
│   │   ├── athletes.js            # Athlete CRUD endpoints
│   │   ├── gamedays.js            # Game day & draw generation
│   │   ├── leaderboard.js         # Leaderboard endpoints
│   │   └── matches.js             # Match scoring endpoints
│   ├── package.json
│   ├── server.js                  # Express server
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── gameday/
│   │   │   │   ├── AthletesTab.jsx      # Athletes management
│   │   │   │   └── MatchesTab.jsx       # Match scoring
│   │   │   ├── Modal.jsx                # Reusable modal
│   │   │   ├── Skeleton.jsx             # Loading skeletons
│   │   │   └── Tabs.jsx                 # Tab navigation
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx            # Home page
│   │   │   └── GameDay.jsx              # Game day detail
│   │   ├── services/
│   │   │   └── api.js                   # API service layer
│   │   ├── App.jsx                      # Router
│   │   ├── main.jsx                     # Entry point
│   │   └── index.css                    # Tailwind + custom styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
```

## Next Steps (Phase 4)

### Priority 1: Generate Rounds 2 & 3 (Up Next)
**Goal**: Implement full round generation with group movement

**Tasks**:
- [ ] Implement "1 up, 1 down" movement logic (for 4-player groups)
- [ ] Implement "2 up, 2 down" movement logic (when any 5-player groups exist)
- [ ] Automatically reallocate groups after each round completes
- [ ] Generate matches for Rounds 2 and 3 based on results
- [ ] Handle tie scenarios in group standings
- [ ] Add "Generate Next Round" button
- [ ] Show round completion status

**Estimated Time**: 6-8 hours

**Technical Notes:**
- Movement triggered when all matches in a round are complete
- Top/bottom groups need special handling (can't move up/down)
- Bye rotation: Different player gets bye in each round for 5-player groups

---

### Priority 2: Update Season Leaderboard (Up Next)
**Goal**: Update athlete season stats after matches complete

**Tasks**:
- [ ] Recalculate athlete stats when game day completes
- [ ] Update wins, losses, points for/against
- [ ] Recalculate rankings based on performance
- [ ] Add "Finalize Game Day" button
- [ ] Show before/after rank changes
- [ ] Store historical snapshots

**Estimated Time**: 3-4 hours

---

### Priority 3: Court Assignment & Scheduling
**Goal**: Assign matches to specific courts with time estimates

**Tasks**:
- [ ] Assign matches to court numbers
- [ ] Optimize court usage (balance load)
- [ ] Add estimated start times
- [ ] Show court-by-court view
- [ ] Add "Next up" indicators
- [ ] Court status tracking (in use/available)

**Estimated Time**: 4-5 hours

---

### Priority 3: Data Persistence
**Goal**: Replace in-memory storage with database

**Tasks**:
- [ ] Set up Cloud Firestore
- [ ] Migrate data store to Firestore collections
- [ ] Update all API routes to use Firestore
- [ ] Add real-time listeners for live updates

**Estimated Time**: 5-6 hours

---

### Priority 4: Deployment
**Goal**: Deploy to production

**Tasks**:
- [ ] Deploy backend to Google Cloud Run
- [ ] Deploy frontend to Vercel
- [ ] Configure environment variables
- [ ] Set up custom domain (optional)
- [ ] Test production deployment

**Estimated Time**: 3-4 hours

---

### Priority 5: Additional Features
**Optional enhancements**:
- [ ] Edit game day settings
- [ ] Delete game day (with confirmation)
- [ ] Athlete profile/detail pages
- [ ] Game day status transitions
- [ ] Admin authentication
- [ ] Export leaderboard to CSV
- [ ] Historical game day archive

---

## Technical Notes

### Running the Application

**Backend:**
```bash
cd matchplay/backend
npm install
npm run dev
```
Backend runs on `http://localhost:3001`

**Frontend:**
```bash
cd matchplay/frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000` (or similar)

### Key Dependencies

**Frontend:**
- `react`: ^18.3.1
- `react-router-dom`: ^6.20.0
- `tailwindcss`: ^3.4.0
- `vite`: ^5.0.8

**Backend:**
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `uuid`: ^9.0.1
- `nodemon`: ^3.0.1 (dev)

### Design Guidelines
- **Colors**: White background, black text/borders only (except buttons)
- **Buttons**: Black background with white text for primary actions
- **Mobile-First**: All layouts optimized for touch and small screens
- **No Mock Data**: Use skeleton loaders, never hardcoded data

### State Management
Currently using component state (useState) and API calls. Backend uses in-memory storage (data resets on server restart).

**Future considerations:**
- Context API for global game day state
- React Query for server state management
- Cloud Firestore for persistent data storage

### Backend API
Base URL: `http://localhost:3001/api`

**Current endpoints:**
- `GET /api/gamedays` - List all game days
- `POST /api/gamedays` - Create game day
- `GET /api/gamedays/:id` - Get game day details
- `POST /api/gamedays/:id/generate-draw` - Generate matches (Round 1 only)
- `GET /api/gamedays/:id/athletes` - Get athletes for game day
- `POST /api/gamedays/:id/athletes` - Add athletes to game day
- `DELETE /api/gamedays/:id/athletes/:athleteId` - Remove athlete
- `GET /api/gamedays/:id/matches` - Get matches (with filters)
- `GET /api/athletes` - List all athletes
- `POST /api/athletes` - Create athlete
- `PUT /api/athletes/:id` - Update athlete
- `DELETE /api/athletes/:id` - Delete athlete
- `PUT /api/matches/:id/score` - Update match score
- `GET /api/leaderboard` - Get overall leaderboard

**Data Storage:**
- In-memory storage in `backend/data/store.js`
- Includes 12 pre-seeded athletes with stats
- Data persists during server session only

---

## Questions/Clarifications Needed

1. **Round 2 & 3 Generation**: Implement automatic "1 up, 1 down" movement or manual?
2. **Real-time Updates**: Should leaderboards update live during game day?
3. **Deployment**: Ready to deploy or more features needed first?
4. **Authentication**: Simple password or more robust solution?
5. **Data Persistence**: Move to Firestore now or later?

---

## Contact
- Requirements Document: `MatchPlay_Requirements.md`
- Frontend: `matchplay/frontend/`
- Backend: `matchplay/backend/`
- Design: Mobile-first, minimal black & white

---

**Status**: Phase 3 Complete - Athlete Names, Bye Display, Group Leaderboard Complete
**Last Updated**: November 24, 2025

