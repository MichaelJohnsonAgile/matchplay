#!/usr/bin/env node

/**
 * Apply Rankings to Production Database
 * This script updates athlete rankings in the database based on historical data
 * 
 * Usage:
 *   node apply-rankings.js
 * 
 * For production database:
 *   DATABASE_URL="your-postgres-url" node apply-rankings.js
 */

import { query } from '../database/db.js';

// Final rankings with Michael Johnson adjusted to rank #5
const athleteRankings = [
  { name: 'Michael Boss', rank: 1, wins: 17, losses: 9, matches: 26 },
  { name: 'Daniel Stone', rank: 2, wins: 15, losses: 11, matches: 26 },
  { name: 'Andrew England', rank: 3, wins: 14, losses: 4, matches: 18 },
  { name: 'Terence Wood', rank: 4, wins: 14, losses: 11, matches: 25 },
  { name: 'Michael Johnson', rank: 5, wins: 20, losses: 18, matches: 38 },
  { name: 'Glendon glendon.evarts@hotmail.com', rank: 6, wins: 13, losses: 5, matches: 18 },
  { name: 'Mario De Oliveira', rank: 7, wins: 13, losses: 11, matches: 24 },
  { name: 'Bobby Tomas', rank: 8, wins: 13, losses: 17, matches: 30 },
  { name: 'Lisa Wandl', rank: 9, wins: 10, losses: 8, matches: 18 },
  { name: 'Steven Collins', rank: 10, wins: 10, losses: 8, matches: 18 },
  { name: 'Salvador Torres', rank: 11, wins: 10, losses: 10, matches: 20 },
  { name: 'Glenn Andresson', rank: 12, wins: 9, losses: 11, matches: 20 },
  { name: 'Liam Mills', rank: 13, wins: 9, losses: 11, matches: 20 },
  { name: 'Gwo Yaw Wong', rank: 14, wins: 7, losses: 5, matches: 12 },
  { name: 'christopher plastow', rank: 15, wins: 7, losses: 7, matches: 14 },
  { name: 'TAMIM EHSAN', rank: 16, wins: 7, losses: 10, matches: 17 },
  { name: 'Garry Twine', rank: 17, wins: 7, losses: 11, matches: 18 },
  { name: 'John Rae', rank: 18, wins: 6, losses: 1, matches: 7 },
  { name: 'Andrew Wiltshire', rank: 19, wins: 6, losses: 2, matches: 8 },
  { name: 'Scott Browne', rank: 20, wins: 6, losses: 6, matches: 12 },
  { name: 'Blair Allen', rank: 21, wins: 6, losses: 6, matches: 12 },
  { name: 'David Ridgway', rank: 22, wins: 6, losses: 6, matches: 12 },
  { name: 'Anna Davis', rank: 23, wins: 5, losses: 1, matches: 6 },
  { name: 'Darren Read', rank: 24, wins: 5, losses: 1, matches: 6 },
  { name: 'Clement Charbonneau', rank: 25, wins: 4, losses: 2, matches: 6 },
  { name: 'Courtenay Farquharson', rank: 26, wins: 4, losses: 2, matches: 6 },
  { name: 'Scott Heffernan', rank: 27, wins: 4, losses: 8, matches: 12 },
  { name: 'Jun Yan', rank: 28, wins: 4, losses: 8, matches: 12 },
  { name: 'Josche Stewart', rank: 29, wins: 4, losses: 8, matches: 12 },
  { name: 'Chad Mackinlay', rank: 30, wins: 4, losses: 13, matches: 17 },
  { name: 'Scott Grenenger', rank: 31, wins: 4, losses: 15, matches: 19 },
  { name: 'John Glen', rank: 32, wins: 3, losses: 2, matches: 5 },
  { name: 'Steven Ng', rank: 33, wins: 3, losses: 3, matches: 6 },
  { name: 'Kevin Godfrey', rank: 34, wins: 3, losses: 3, matches: 6 },
  { name: 'Noella Charbonneau', rank: 35, wins: 3, losses: 3, matches: 6 },
  { name: 'James Henderson', rank: 36, wins: 3, losses: 3, matches: 6 },
  { name: 'Paula Mackinlay', rank: 37, wins: 2, losses: 4, matches: 6 },
  { name: 'Brett Mackinlay', rank: 38, wins: 2, losses: 4, matches: 6 },
  { name: 'Grant Shearer', rank: 39, wins: 2, losses: 4, matches: 6 },
  { name: 'Tim Hudson', rank: 40, wins: 2, losses: 4, matches: 6 },
  { name: 'Peter Loadman', rank: 41, wins: 2, losses: 4, matches: 6 },
  { name: 'Harry Tullett', rank: 42, wins: 2, losses: 10, matches: 12 },
  { name: 'Karen McCarthy', rank: 43, wins: 0, losses: 0, matches: 0 },
  { name: 'Colin Weir', rank: 44, wins: 0, losses: 0, matches: 0 },
  { name: 'Anton von Aulock', rank: 45, wins: 0, losses: 0, matches: 0 },
  { name: 'Kunal Gupta', rank: 46, wins: 0, losses: 0, matches: 0 },
  { name: 'Peter Smyth', rank: 47, wins: 0, losses: 0, matches: 0 },
  { name: 'Lachlan Oldfield', rank: 48, wins: 0, losses: 0, matches: 0 },
  { name: 'Emma Hawkins', rank: 49, wins: 0, losses: 0, matches: 0 },
  { name: 'Marcello Sequeira', rank: 50, wins: 0, losses: 0, matches: 0 },
  { name: 'Limuel Swanson', rank: 51, wins: 0, losses: 0, matches: 0 },
  { name: 'Nicholas Byrne', rank: 52, wins: 0, losses: 0, matches: 0 },
  { name: 'Thomas Truong', rank: 53, wins: 0, losses: 0, matches: 0 },
  { name: 'Jayden Clark', rank: 54, wins: 0, losses: 0, matches: 0 },
  { name: 'Sandy Cruise', rank: 55, wins: 0, losses: 0, matches: 0 },
  { name: 'Onur Kerimoglu', rank: 56, wins: 0, losses: 0, matches: 0 },
  { name: 'Mitch Abagi', rank: 57, wins: 0, losses: 0, matches: 0 },
  { name: 'Sam Abagi', rank: 58, wins: 0, losses: 0, matches: 0 },
  { name: 'Mike Shimerda', rank: 59, wins: 0, losses: 0, matches: 0 }
];

async function applyRankings() {
  console.log('\n=== APPLYING ATHLETE RANKINGS TO DATABASE ===\n');
  
  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  for (const athlete of athleteRankings) {
    try {
      // Find athlete by name (case-insensitive)
      const findResult = await query(
        'SELECT id, name, rank FROM athletes WHERE LOWER(name) = LOWER($1)',
        [athlete.name]
      );
      
      if (findResult.rows.length > 0) {
        const dbAthlete = findResult.rows[0];
        const oldRank = dbAthlete.rank;
        
        // Update the rank
        await query(
          'UPDATE athletes SET rank = $1 WHERE id = $2',
          [athlete.rank, dbAthlete.id]
        );
        
        const winPct = athlete.matches > 0 ? ((athlete.wins / athlete.matches) * 100).toFixed(1) : '0.0';
        console.log(`✓ Rank ${athlete.rank.toString().padStart(2)}: ${athlete.name.padEnd(35)} (${oldRank} → ${athlete.rank}) - ${athlete.wins}W-${athlete.losses}L (${winPct}%)`);
        updatedCount++;
      } else {
        console.log(`✗ Not found: ${athlete.name}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${athlete.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n=== UPDATE COMPLETE ===`);
  console.log(`✓ Athletes updated: ${updatedCount}`);
  console.log(`✗ Athletes not found: ${notFoundCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`Total processed: ${athleteRankings.length}`);
}

async function main() {
  try {
    await applyRankings();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

