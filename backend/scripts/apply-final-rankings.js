#!/usr/bin/env node

/**
 * Apply Final Rankings to Database
 * 
 * This script updates athlete rankings based on:
 * 1. Total wins (primary)
 * 2. Win percentage (tiebreaker)
 * 3. Total matches played (secondary tiebreaker)
 * 
 * Special adjustment: Michael Johnson manually moved to rank #5
 * 
 * Usage: node scripts/apply-final-rankings.js
 */

import { query } from '../database/db.js';

// Rankings calculated from historical data with Michael Johnson at rank #5
const finalRankings = [
  { rank: 1, name: 'Michael Boss', wins: 17, losses: 9, matches: 26 },
  { rank: 2, name: 'Daniel Stone', wins: 15, losses: 11, matches: 26 },
  { rank: 3, name: 'Andrew England', wins: 14, losses: 4, matches: 18 },
  { rank: 4, name: 'Terence Wood', wins: 14, losses: 11, matches: 25 },
  { rank: 5, name: 'Michael Johnson', wins: 20, losses: 18, matches: 38 },
  { rank: 6, name: 'Glendon Evarts', wins: 13, losses: 5, matches: 18 },
  { rank: 7, name: 'Mario De Oliveira', wins: 13, losses: 11, matches: 24 },
  { rank: 8, name: 'Bobby Tomas', wins: 13, losses: 17, matches: 30 },
  { rank: 9, name: 'Lisa Wandl', wins: 10, losses: 8, matches: 18 },
  { rank: 10, name: 'Steven Collins', wins: 10, losses: 8, matches: 18 },
  { rank: 11, name: 'Salvador Torres', wins: 10, losses: 10, matches: 20 },
  { rank: 12, name: 'Glenn Andresson', wins: 9, losses: 11, matches: 20 },
  { rank: 13, name: 'Liam Mills', wins: 9, losses: 11, matches: 20 },
  { rank: 14, name: 'Gwo Yaw Wong', wins: 7, losses: 5, matches: 12 },
  { rank: 15, name: 'Christopher Plastow', wins: 7, losses: 7, matches: 14 },
  { rank: 16, name: 'Tamim Ehsan', wins: 7, losses: 10, matches: 17 },
  { rank: 17, name: 'Garry Twine', wins: 7, losses: 11, matches: 18 },
  { rank: 18, name: 'John Rae', wins: 6, losses: 1, matches: 7 },
  { rank: 19, name: 'Andrew Wiltshire', wins: 6, losses: 2, matches: 8 },
  { rank: 20, name: 'Scott Browne', wins: 6, losses: 6, matches: 12 },
  { rank: 21, name: 'Blair Allen', wins: 6, losses: 6, matches: 12 },
  { rank: 22, name: 'David Ridgway', wins: 6, losses: 6, matches: 12 },
  { rank: 23, name: 'Anna Davis', wins: 5, losses: 1, matches: 6 },
  { rank: 24, name: 'Darren Read', wins: 5, losses: 1, matches: 6 },
  { rank: 25, name: 'Clement Charbonneau', wins: 4, losses: 2, matches: 6 },
  { rank: 26, name: 'Courtenay Farquharson', wins: 4, losses: 2, matches: 6 },
  { rank: 27, name: 'Scott Heffernan', wins: 4, losses: 8, matches: 12 },
  { rank: 28, name: 'Jun Yan', wins: 4, losses: 8, matches: 12 },
  { rank: 29, name: 'Josche Stewart', wins: 4, losses: 8, matches: 12 },
  { rank: 30, name: 'Chad Mackinlay', wins: 4, losses: 13, matches: 17 },
  { rank: 31, name: 'Scott Grenenger', wins: 4, losses: 15, matches: 19 },
  { rank: 32, name: 'John Glen', wins: 3, losses: 2, matches: 5 },
  { rank: 33, name: 'Steven Ng', wins: 3, losses: 3, matches: 6 },
  { rank: 34, name: 'Kevin Godfrey', wins: 3, losses: 3, matches: 6 },
  { rank: 35, name: 'Noella Charbonneau', wins: 3, losses: 3, matches: 6 },
  { rank: 36, name: 'James Henderson', wins: 3, losses: 3, matches: 6 },
  { rank: 37, name: 'Paula Mackinlay', wins: 2, losses: 4, matches: 6 },
  { rank: 38, name: 'Brett Mackinlay', wins: 2, losses: 4, matches: 6 },
  { rank: 39, name: 'Grant Shearer', wins: 2, losses: 4, matches: 6 },
  { rank: 40, name: 'Tim Hudson', wins: 2, losses: 4, matches: 6 },
  { rank: 41, name: 'Peter Loadman', wins: 2, losses: 4, matches: 6 },
  { rank: 42, name: 'Harry Tullett', wins: 2, losses: 10, matches: 12 },
  { rank: 43, name: 'Karen McCarthy', wins: 0, losses: 0, matches: 0 },
  { rank: 44, name: 'Colin Weir', wins: 0, losses: 0, matches: 0 },
  { rank: 45, name: 'Anton von Aulock', wins: 0, losses: 0, matches: 0 },
  { rank: 46, name: 'Kunal Gupta', wins: 0, losses: 0, matches: 0 },
  { rank: 47, name: 'Peter Smyth', wins: 0, losses: 0, matches: 0 },
  { rank: 48, name: 'Lachlan Oldfield', wins: 0, losses: 0, matches: 0 },
  { rank: 49, name: 'Emma Hawkins', wins: 0, losses: 0, matches: 0 },
  { rank: 50, name: 'Marcello Sequeira', wins: 0, losses: 0, matches: 0 },
  { rank: 51, name: 'Limuel Swanson', wins: 0, losses: 0, matches: 0 },
  { rank: 52, name: 'Nicholas Byrne', wins: 0, losses: 0, matches: 0 },
  { rank: 53, name: 'Thomas Truong', wins: 0, losses: 0, matches: 0 },
  { rank: 54, name: 'Jayden Clark', wins: 0, losses: 0, matches: 0 },
  { rank: 55, name: 'Sandy Cruise', wins: 0, losses: 0, matches: 0 },
  { rank: 56, name: 'Onur Kerimoglu', wins: 0, losses: 0, matches: 0 },
  { rank: 57, name: 'Mitch Abagi', wins: 0, losses: 0, matches: 0 },
  { rank: 58, name: 'Sam Abagi', wins: 0, losses: 0, matches: 0 },
  { rank: 59, name: 'Mike Shimerda', wins: 0, losses: 0, matches: 0 }
];

async function applyRankings() {
  console.log('\n=== APPLYING FINAL RANKINGS ===\n');
  
  let updated = 0;
  let notFound = 0;
  
  for (const athlete of finalRankings) {
    try {
      // Find athlete by exact name match
      const result = await query(
        'UPDATE athletes SET rank = $1 WHERE name = $2 RETURNING id, name, rank',
        [athlete.rank, athlete.name]
      );
      
      if (result.rows.length > 0) {
        console.log(`✓ Rank ${String(athlete.rank).padStart(2)}: ${athlete.name} (${athlete.wins}W-${athlete.losses}L)`);
        updated++;
      } else {
        console.log(`✗ NOT FOUND: "${athlete.name}"`);
        notFound++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${athlete.name}:`, error.message);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✓ Athletes updated: ${updated}`);
  if (notFound > 0) {
    console.log(`✗ Athletes not found: ${notFound}`);
  }
  console.log('\nRankings successfully applied!\n');
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

