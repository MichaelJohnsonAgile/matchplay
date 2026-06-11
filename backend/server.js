import express from 'express'
import cors from 'cors'
import { gameDayRoutes } from './routes/gamedays.js'
import { athleteRoutes } from './routes/athletes.js'
import { matchRoutes } from './routes/matches.js'
import { leaderboardRoutes } from './routes/leaderboard.js'
import { teamsRoutes } from './routes/teams.js'
import { courtsRoutes } from './routes/courts.js'
import { matchmakingRoutes } from './routes/matchmaking.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/gamedays', gameDayRoutes)
app.use('/api/gamedays', teamsRoutes)  // Teams routes nested under gamedays
app.use('/api/teams', teamsRoutes)     // Direct team routes
app.use('/api/athletes', athleteRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/courts', courtsRoutes)
app.use('/api/matchmaking', matchmakingRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

app.listen(PORT, () => {
  console.log(`\n🏓 MatchPlay Backend Server`)
  console.log(`📍 Running on http://localhost:${PORT}`)
  console.log(`🏥 Health check: http://localhost:${PORT}/health`)
  console.log(`📡 API base: http://localhost:${PORT}/api\n`)
})
