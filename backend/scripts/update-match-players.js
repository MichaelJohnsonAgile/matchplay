// Script to update players in a specific match
// Usage: node scripts/update-match-players.js

import db from '../database/db.js'
const { query, closePool } = db

const MATCH_ID = '6e785397'

// Player replacements
const replacements = [
  { oldName: 'Bobby Tomas', newName: 'Michael Johnson' },
  { oldName: 'Josche Stewart', newName: 'Terence Wood' }
]

async function updateMatchPlayers() {
  console.log(`\n=== Updating Match ${MATCH_ID} ===\n`)
  
  try {
    // First, get the current match details
    const matchResult = await query(
      `SELECT m.*, 
        a1.name as team_a_p1_name, a2.name as team_a_p2_name,
        a3.name as team_b_p1_name, a4.name as team_b_p2_name
       FROM matches m
       LEFT JOIN athletes a1 ON m.team_a_player1 = a1.id
       LEFT JOIN athletes a2 ON m.team_a_player2 = a2.id
       LEFT JOIN athletes a3 ON m.team_b_player1 = a3.id
       LEFT JOIN athletes a4 ON m.team_b_player2 = a4.id
       WHERE m.id LIKE $1`,
      [`${MATCH_ID}%`]
    )
    
    if (matchResult.rows.length === 0) {
      console.log(`Match not found with ID starting with: ${MATCH_ID}`)
      return
    }
    
    const match = matchResult.rows[0]
    console.log('Current match players:')
    console.log(`  Team A: ${match.team_a_p1_name} & ${match.team_a_p2_name}`)
    console.log(`  Team B: ${match.team_b_p1_name} & ${match.team_b_p2_name}`)
    console.log('')
    
    // Get athlete IDs for replacements
    for (const { oldName, newName } of replacements) {
      // Find old player
      const oldPlayerResult = await query(
        'SELECT id, name FROM athletes WHERE LOWER(name) = LOWER($1)',
        [oldName]
      )
      
      if (oldPlayerResult.rows.length === 0) {
        console.log(`Old player not found: ${oldName}`)
        continue
      }
      
      // Find new player
      const newPlayerResult = await query(
        'SELECT id, name FROM athletes WHERE LOWER(name) = LOWER($1)',
        [newName]
      )
      
      if (newPlayerResult.rows.length === 0) {
        console.log(`New player not found: ${newName}`)
        continue
      }
      
      const oldPlayerId = oldPlayerResult.rows[0].id
      const newPlayerId = newPlayerResult.rows[0].id
      
      console.log(`Replacing ${oldName} (${oldPlayerId}) with ${newName} (${newPlayerId})`)
      
      // Determine which column to update
      let columnToUpdate = null
      if (match.team_a_player1 === oldPlayerId) {
        columnToUpdate = 'team_a_player1'
      } else if (match.team_a_player2 === oldPlayerId) {
        columnToUpdate = 'team_a_player2'
      } else if (match.team_b_player1 === oldPlayerId) {
        columnToUpdate = 'team_b_player1'
      } else if (match.team_b_player2 === oldPlayerId) {
        columnToUpdate = 'team_b_player2'
      }
      
      if (!columnToUpdate) {
        console.log(`  Player ${oldName} not found in this match!`)
        continue
      }
      
      // Update the match
      await query(
        `UPDATE matches SET ${columnToUpdate} = $1 WHERE id = $2`,
        [newPlayerId, match.id]
      )
      
      console.log(`  ✓ Updated ${columnToUpdate}`)
    }
    
    // Show updated match
    const updatedResult = await query(
      `SELECT m.*, 
        a1.name as team_a_p1_name, a2.name as team_a_p2_name,
        a3.name as team_b_p1_name, a4.name as team_b_p2_name
       FROM matches m
       LEFT JOIN athletes a1 ON m.team_a_player1 = a1.id
       LEFT JOIN athletes a2 ON m.team_a_player2 = a2.id
       LEFT JOIN athletes a3 ON m.team_b_player1 = a3.id
       LEFT JOIN athletes a4 ON m.team_b_player2 = a4.id
       WHERE m.id = $1`,
      [match.id]
    )
    
    const updated = updatedResult.rows[0]
    console.log('\nUpdated match players:')
    console.log(`  Team A: ${updated.team_a_p1_name} & ${updated.team_a_p2_name}`)
    console.log(`  Team B: ${updated.team_b_p1_name} & ${updated.team_b_p2_name}`)
    
    console.log('\n✓ Match updated successfully!')
    
  } catch (error) {
    console.error('Error updating match:', error)
  } finally {
    await closePool()
  }
}

updateMatchPlayers()

