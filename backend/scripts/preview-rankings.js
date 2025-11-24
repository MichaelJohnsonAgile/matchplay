#!/usr/bin/env node

/**
 * Preview Rankings Script
 * Shows what athletes will be matched WITHOUT updating anything
 */

import { query } from '../database/db.js';

// Final rankings with Michael Johnson adjusted to rank #5
const athleteRankings = [
  { name: 'Michael Boss', rank: 1, wins: 17, losses: 9, matches: 26 },
  { name: 'Daniel Stone', rank: 2, wins: 15, losses: 11, matches: 26 },
  { name: 'Andrew England', rank: 3, wins: 14, losses: 4, matches: 18 },
  { name: 'Terence Wood', rank: 4, wins: 14, losses: 11, matches: 25 },
  { name: 'Michael Johnson', rank: 5, wins: 20, losses: 18, matches: 38 }
];

async function previewRankings() {
  console.log('\n=== PREVIEW: TOP 5 RANKING MATCHES ===\n');
  
  for (const athlete of athleteRankings) {
    try {
      // Find athlete by name (case-insensitive)
      const findResult = await query(
        'SELECT id, name, rank FROM athletes WHERE LOWER(name) = LOWER($1)',
        [athlete.name]
      );
      
      if (findResult.rows.length > 0) {
        const dbAthlete = findResult.rows[0];
        console.log(`✓ MATCH FOUND`);
        console.log(`  Script name: "${athlete.name}"`);
        console.log(`  DB name:     "${dbAthlete.name}"`);
        console.log(`  DB ID:       ${dbAthlete.id}`);
        console.log(`  Current rank: ${dbAthlete.rank} → New rank: ${athlete.rank}`);
        console.log();
      } else {
        console.log(`✗ NO MATCH`);
        console.log(`  Script name: "${athlete.name}"`);
        console.log(`  Not found in database`);
        console.log();
      }
    } catch (error) {
      console.error(`✗ Error checking ${athlete.name}:`, error.message);
    }
  }
  
  console.log('=== END PREVIEW ===\n');
  console.log('This was a preview only. No data was changed.');
  console.log('If matches look correct, run: node scripts/apply-rankings.js --apply\n');
}

async function main() {
  try {
    await previewRankings();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

