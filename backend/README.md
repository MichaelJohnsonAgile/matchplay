# MatchPlay Backend

Node.js/Express backend API for MatchPlay pickleball league management.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server will run on http://localhost:3001

## API Endpoints

### Game Days
- `GET /api/gamedays` - Get all game days
- `GET /api/gamedays/:id` - Get single game day
- `POST /api/gamedays` - Create new game day
- `PUT /api/gamedays/:id` - Update game day
- `DELETE /api/gamedays/:id` - Delete game day
- `GET /api/gamedays/:id/athletes` - Get athletes for game day
- `POST /api/gamedays/:id/athletes` - Add athletes to game day
- `DELETE /api/gamedays/:id/athletes/:athleteId` - Remove athlete from game day
- `POST /api/gamedays/:id/generate-draw` - Generate match draw
- `GET /api/gamedays/:id/matches` - Get matches for game day
- `GET /api/gamedays/:id/leaderboard` - Get group leaderboard

### Athletes
- `GET /api/athletes` - Get all athletes
- `GET /api/athletes/:id` - Get single athlete
- `POST /api/athletes` - Create new athlete
- `PUT /api/athletes/:id` - Update athlete
- `DELETE /api/athletes/:id` - Delete athlete

### Matches
- `GET /api/matches/:id` - Get single match
- `PUT /api/matches/:id/score` - Update match score
- `PUT /api/matches/:id/status` - Update match status

### Leaderboard
- `GET /api/leaderboard` - Get overall leaderboard

## Data Storage

Currently uses in-memory storage. Data will be lost on server restart.
Will be replaced with Cloud Firestore in production.

