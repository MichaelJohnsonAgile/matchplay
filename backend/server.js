import express from 'express'
import cors from 'cors'
import { gameDayRoutes } from './routes/gamedays.js'
import { athleteRoutes } from './routes/athletes.js'
import { matchRoutes } from './routes/matches.js'
import { leaderboardRoutes } from './routes/leaderboard.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/gamedays', gameDayRoutes)
app.use('/api/athletes', athleteRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/leaderboard', leaderboardRoutes)

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
