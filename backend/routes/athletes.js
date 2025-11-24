import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { store } from '../data/store.js'

export const athleteRoutes = express.Router()

// GET /api/athletes - Get all athletes
athleteRoutes.get('/', (req, res) => {
  const { status } = req.query
  
  let athletes = store.athletes
  
  if (status) {
    athletes = athletes.filter(a => a.status === status)
  }
  
  res.json(athletes)
})

// GET /api/athletes/:id - Get single athlete
athleteRoutes.get('/:id', (req, res) => {
  const athlete = store.athletes.find(a => a.id === req.params.id)
  if (!athlete) {
    return res.status(404).json({ error: 'Athlete not found' })
  }
  res.json(athlete)
})

// POST /api/athletes - Create new athlete
athleteRoutes.post('/', (req, res) => {
  const { name, email } = req.body
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }
  
  const newAthlete = {
    id: `ath-${uuidv4()}`,
    name,
    email: email || '',
    status: 'active',
    stats: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      winPercentage: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0
    },
    rank: store.athletes.length + 1
  }
  
  store.athletes.push(newAthlete)
  
  res.status(201).json(newAthlete)
})

// PUT /api/athletes/:id - Update athlete
athleteRoutes.put('/:id', (req, res) => {
  const index = store.athletes.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Athlete not found' })
  }
  
  store.athletes[index] = {
    ...store.athletes[index],
    ...req.body,
    id: req.params.id // Prevent ID from being changed
  }
  
  res.json(store.athletes[index])
})

// DELETE /api/athletes/:id - Delete athlete
athleteRoutes.delete('/:id', (req, res) => {
  const index = store.athletes.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Athlete not found' })
  }
  
  store.athletes.splice(index, 1)
  
  res.status(204).send()
})

