#!/usr/bin/env node

/**
 * Update Game Day Status to Completed
 * For game days where all matches are complete but status is still "upcoming"
 */

import { query } from '../database/db.js';

async function updateCompletedGameDays() {
  console.log('\n=== CHECKING FOR COMPLETED GAME DAYS ===\n');
  
  try {
    // Find all game days that are not completed
    const gameDaysResult = await query(
      `SELECT id, date, venue, status FROM gamedays WHERE status != 'completed' ORDER BY date`
    );
    
    for (const gameDay of gameDaysResult.rows) {
      // Check if all matches are complete
      const matchesResult = await query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN winner IS NOT NULL THEN 1 END) as completed 
         FROM matches WHERE gameday_id = $1`,
        [gameDay.id]
      );
      
      const total = parseInt(matchesResult.rows[0].total);
      const completed = parseInt(matchesResult.rows[0].completed);
      
      if (total > 0 && total === completed) {
        // All matches complete - update status
        await query(
          `UPDATE gamedays SET status = 'completed' WHERE id = $1`,
          [gameDay.id]
        );
        console.log(`✓ Updated: ${gameDay.venue} (${gameDay.date}) - ${completed}/${total} matches complete`);
      } else if (total > 0) {
        console.log(`  Pending: ${gameDay.venue} (${gameDay.date}) - ${completed}/${total} matches complete`);
      }
    }
    
    console.log('\n=== DONE ===\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  try {
    await updateCompletedGameDays();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

