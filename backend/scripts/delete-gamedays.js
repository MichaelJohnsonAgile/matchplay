#!/usr/bin/env node

/**
 * Delete Specific Game Days
 * Deletes the specified game days and all associated data (cascade)
 */

import { query } from '../database/db.js';

const gameDayIds = [
  'gd-e77f28fe-43d7-4f4e-b03c-79a48468e590',
  'gd-872af4c0-474a-48df-a353-97bb14a70a34'
];

async function deleteGameDays() {
  console.log('\n=== DELETING GAME DAYS ===\n');
  
  for (const id of gameDayIds) {
    try {
      // Get game day info first
      const gameDay = await query(
        'SELECT id, date, venue FROM gamedays WHERE id = $1',
        [id]
      );
      
      if (gameDay.rows.length === 0) {
        console.log(`✗ Game day not found: ${id}`);
        continue;
      }
      
      const gd = gameDay.rows[0];
      console.log(`Deleting: ${gd.venue} on ${gd.date}`);
      
      // Delete game day (cascade will handle related data)
      await query('DELETE FROM gamedays WHERE id = $1', [id]);
      
      console.log(`✓ Deleted: ${id}`);
      console.log();
    } catch (error) {
      console.error(`✗ Error deleting ${id}:`, error.message);
    }
  }
  
  console.log('=== DELETION COMPLETE ===\n');
}

async function main() {
  try {
    await deleteGameDays();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

