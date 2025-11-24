# MatchPlay

A modern pickleball league management system for organizing game days, tracking matches, and maintaining player leaderboards.

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Game Day Management**: Create and manage multiple game days throughout the season
- **Smart Match Generation**: Automated draw system with skill-based grouping
- **Round-by-Round Play**: Generate subsequent rounds based on previous results
- **Live Scoring**: Real-time match score tracking
- **Leaderboards**: View rankings for individual game days and overall season
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

**Frontend:**
- React 18
- Vite
- React Router
- Tailwind CSS

**Backend:**
- Node.js
- Express
- In-memory data store

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/MichaelJohnsonAgile/matchplay.git
cd matchplay
```

2. **Start the Backend**
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3001`

3. **Start the Frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

4. **Open your browser**
Navigate to `http://localhost:5173`

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions on deploying to Render.com (free tier).

**Live Demo**: Coming soon after deployment!

## Project Structure

```
matchplay/
├── backend/
│   ├── data/          # Data storage layer
│   ├── routes/        # API routes
│   ├── server.js      # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   └── utils/       # Utility functions
│   ├── index.html
│   └── package.json
└── README.md
```

## Usage Guide

### Creating a Game Day
1. Navigate to Dashboard
2. Click "Create Game Day"
3. Select date and configure settings
4. Add participating athletes

### Generating Matches
1. Open a game day
2. Go to "Athletes" tab and add players
3. Click "Generate Draw" to create Round 1 matches
4. Use "Generate Next Round" after completing rounds

### Scoring Matches
1. Navigate to "Matches" tab
2. Click on a match
3. Enter scores for both teams
4. Save to update leaderboard automatically

## Documentation

- [Allocation Rules](./ALLOCATION_RULES.md) - Match draw algorithm details
- [Round Generation](./ROUND_GENERATION_FEATURE.md) - Multi-round system overview
- [Updates Summary](./UPDATES_SUMMARY.md) - Recent changes and improvements
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Hosting instructions

## API Endpoints

### Game Days
- `GET /api/gamedays` - List all game days
- `POST /api/gamedays` - Create game day
- `GET /api/gamedays/:id` - Get game day details
- `POST /api/gamedays/:id/generate-draw` - Generate initial draw
- `POST /api/gamedays/:id/generate-next-round` - Generate next round

### Athletes
- `GET /api/athletes` - List all athletes
- `POST /api/athletes` - Create athlete
- `GET /api/gamedays/:id/athletes` - Get game day athletes

### Matches
- `GET /api/gamedays/:id/matches` - Get game day matches
- `PUT /api/matches/:id/score` - Update match score

### Leaderboard
- `GET /api/leaderboard` - Overall season leaderboard
- `GET /api/gamedays/:id/leaderboard` - Game day leaderboard

## Development

### Running Tests
```bash
cd backend
node test-draw.js
```

### Environment Variables

**Frontend** (`.env`):
```
VITE_API_URL=http://localhost:3001
```

**Backend** (`.env`):
```
PORT=3001
```

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT License - feel free to use this for your own pickleball league!

## Support

For issues or questions, please open a GitHub issue.

---

Made with ❤️ for the pickleball community

