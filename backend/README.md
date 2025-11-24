# MatchPlay Backend

Node.js/Express backend API for MatchPlay pickleball league management with PostgreSQL database.

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (local or Render)
- npm or yarn

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
# Then initialize database
npm run db:init
```

## Environment Variables

Create a `.env` file or set environment variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=development
PORT=3001
```

## Development

```bash
# Run with auto-reload
npm run dev

# Or run without auto-reload
npm start
```

Server will run on http://localhost:3001

## Database

### Initialize Database
```bash
npm run db:init
```

This creates all tables, indexes, and inserts sample data.

### Database Structure
- **PostgreSQL** with connection pooling
- **Tables**: athletes, gamedays, gameday_athletes, matches
- **Indexes**: Optimized for common queries
- **Sample data**: 12 athletes pre-loaded

See [database/README.md](database/README.md) for details.

### Database Setup Guide
For production deployment and detailed setup: [DATABASE_SETUP.md](DATABASE_SETUP.md)

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
- `GET /api/gamedays/:id/draw-preview` - Preview group allocation
- `POST /api/gamedays/:id/generate-draw` - Generate match draw
- `POST /api/gamedays/:id/generate-next-round` - Generate next round
- `POST /api/gamedays/:id/cancel-draw` - Cancel draw and delete matches
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

### Health Check
- `GET /health` - Server health check

## Project Structure

```
backend/
├── database/           # Database module
│   ├── db.js          # Connection pool
│   ├── queries.js     # All database queries
│   ├── schema.sql     # Database schema
│   ├── init.js        # Initialization script
│   └── README.md      # Database documentation
├── routes/            # API route handlers
│   ├── athletes.js
│   ├── gamedays.js
│   ├── matches.js
│   └── leaderboard.js
├── server.js          # Express app entry point
├── package.json
└── DATABASE_SETUP.md  # Database setup guide
```

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with `pg` driver
- **Architecture**: RESTful API
- **Deployment**: Render.com

## Development Notes

- All routes use async/await
- Database queries are in `database/queries.js`
- Connection pooling for performance
- Auto-updating timestamps on updates
- Comprehensive error handling

## Testing

```bash
# Test database connection
node -e "import('./database/db.js').then(db => db.query('SELECT NOW()'))"

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/athletes
```

## Deployment

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for deploying to Render.com.

Key steps:
1. Create PostgreSQL database on Render
2. Deploy backend with `DATABASE_URL` environment variable
3. Run `npm run db:init` to initialize database

## Troubleshooting

### Database connection failed
- Check `DATABASE_URL` is set correctly
- Verify database is running
- Ensure correct SSL settings for production

### Tables not found
- Run `npm run db:init` to create tables

### Port already in use
- Change `PORT` environment variable
- Or kill process: `npx kill-port 3001`

## License

MIT

