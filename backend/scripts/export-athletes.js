#!/usr/bin/env node

/**
 * Export Athletes from Database
 * Downloads all athlete names and current ranks from the database
 */

import { query } from '../database/db.js';

async function exportAthletes() {
  console.log('\n=== ATHLETES IN DATABASE ===\n');
  
  try {
    const result = await query(
      'SELECT id, name, rank, email FROM athletes ORDER BY rank ASC'
    );
    
    if (result.rows.length === 0) {
      console.log('No athletes found in database.');
      return;
    }
    
    console.log(`Found ${result.rows.length} athletes:\n`);
    console.log('Rank | ID        | Name');
    console.log('-----|-----------|---------------------------------------------');
    
    result.rows.forEach(athlete => {
      const rank = String(athlete.rank).padStart(4);
      const id = athlete.id.padEnd(10);
      console.log(`${rank} | ${id} | ${athlete.name}`);
    });
    
    console.log('\n=== NAMES ONLY (for copy/paste) ===\n');
    result.rows.forEach(athlete => {
      console.log(`"${athlete.name}",`);
    });
    
    console.log('\n=== END ===');
    
  } catch (error) {
    console.error('Error exporting athletes:', error.message);
  }
}

async function main() {
  try {
    await exportAthletes();
    process.exit(0);
  } catch (error) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}

main();

