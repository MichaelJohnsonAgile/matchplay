#!/usr/bin/env node

/**
 * Update Rankings Script
 * Calculates win percentages from historical data and updates athlete rankings
 */

import { query } from '../database/db.js';

// Historical data parsed from existingscores file
const historicalData = [
  { name: 'Andrew England', wins: 14, losses: 4, totalMatches: 18, rank: 1 },
  { name: 'Andrew Wiltshire', wins: 6, losses: 2, totalMatches: 8, rank: 2 },
  { name: 'Michael Boss', wins: 17, losses: 9, totalMatches: 26, rank: 3 },
  { name: 'Salvador Torres', wins: 10, losses: 10, totalMatches: 20, rank: 4 },
  { name: 'Clement Charbonneau', wins: 4, losses: 2, totalMatches: 6, rank: 5 },
  { name: 'Daniel Stone', wins: 15, losses: 11, totalMatches: 26, rank: 6 },
  { name: 'Gwo Yaw Wong', wins: 7, losses: 5, totalMatches: 12, rank: 7 },
  { name: 'Steven Ng', wins: 3, losses: 3, totalMatches: 6, rank: 8 },
  { name: 'Anna Davis', wins: 5, losses: 1, totalMatches: 6, rank: 9 },
  { name: 'TAMIM EHSAN', wins: 7, losses: 10, totalMatches: 17, rank: 10 },
  { name: 'John Rae', wins: 6, losses: 1, totalMatches: 7, rank: 11 },
  { name: 'Kevin Godfrey', wins: 3, losses: 3, totalMatches: 6, rank: 12 },
  { name: 'Courtenay Farquharson', wins: 4, losses: 2, totalMatches: 6, rank: 13 },
  { name: 'Scott Heffernan', wins: 4, losses: 8, totalMatches: 12, rank: 14 },
  { name: 'Paula Mackinlay', wins: 2, losses: 4, totalMatches: 6, rank: 15 },
  { name: 'Jun Yan', wins: 4, losses: 8, totalMatches: 12, rank: 16 },
  { name: 'Scott Browne', wins: 6, losses: 6, totalMatches: 12, rank: 17 },
  { name: 'Karen McCarthy', wins: 0, losses: 0, totalMatches: 0, rank: 18 },
  { name: 'Blair Allen', wins: 6, losses: 6, totalMatches: 12, rank: 19 },
  { name: 'Harry Tullett', wins: 2, losses: 10, totalMatches: 12, rank: 20 },
  { name: 'Brett Mackinlay', wins: 2, losses: 4, totalMatches: 6, rank: 21 },
  { name: 'Noella Charbonneau', wins: 3, losses: 3, totalMatches: 6, rank: 22 },
  { name: 'Lisa Wandl', wins: 10, losses: 8, totalMatches: 18, rank: 23 },
  { name: 'Colin Weir', wins: 0, losses: 0, totalMatches: 0, rank: 24 },
  { name: 'Grant Shearer', wins: 2, losses: 4, totalMatches: 6, rank: 25 },
  { name: 'Steven Collins', wins: 10, losses: 8, totalMatches: 18, rank: 26 },
  { name: 'John Glen', wins: 3, losses: 2, totalMatches: 5, rank: 27 },
  { name: 'Josche Stewart', wins: 4, losses: 8, totalMatches: 12, rank: 28 },
  { name: 'Darren Read', wins: 5, losses: 1, totalMatches: 6, rank: 29 },
  { name: 'Glendon glendon.evarts@hotmail.com', wins: 13, losses: 5, totalMatches: 18, rank: 30 },
  { name: 'Chad Mackinlay', wins: 4, losses: 13, totalMatches: 17, rank: 31 },
  { name: 'Michael Johnson', wins: 20, losses: 18, totalMatches: 38, rank: 32 },
  { name: 'Garry Twine', wins: 7, losses: 11, totalMatches: 18, rank: 33 },
  { name: 'Anton von Aulock', wins: 0, losses: 0, totalMatches: 0, rank: 34 },
  { name: 'Kunal Gupta', wins: 0, losses: 0, totalMatches: 0, rank: 35 },
  { name: 'Peter Smyth', wins: 0, losses: 0, totalMatches: 0, rank: 36 },
  { name: 'Lachlan Oldfield', wins: 0, losses: 0, totalMatches: 0, rank: 37 },
  { name: 'Emma Hawkins', wins: 0, losses: 0, totalMatches: 0, rank: 38 },
  { name: 'Glenn Andresson', wins: 9, losses: 11, totalMatches: 20, rank: 39 },
  { name: 'Marcello Sequeira', wins: 0, losses: 0, totalMatches: 0, rank: 40 },
  { name: 'Limuel Swanson', wins: 0, losses: 0, totalMatches: 0, rank: 41 },
  { name: 'Liam Mills', wins: 9, losses: 11, totalMatches: 20, rank: 42 },
  { name: 'Nicholas Byrne', wins: 0, losses: 0, totalMatches: 0, rank: 43 },
  { name: 'Terence Wood', wins: 14, losses: 11, totalMatches: 25, rank: 44 },
  { name: 'Thomas Truong', wins: 0, losses: 0, totalMatches: 0, rank: 45 },
  { name: 'Bobby Tomas', wins: 13, losses: 17, totalMatches: 30, rank: 46 },
  { name: 'Jayden Clark', wins: 0, losses: 0, totalMatches: 0, rank: 47 },
  { name: 'Sandy Cruise', wins: 0, losses: 0, totalMatches: 0, rank: 48 },
  { name: 'Mario De Oliveira', wins: 13, losses: 11, totalMatches: 24, rank: 49 },
  { name: 'James Henderson', wins: 3, losses: 3, totalMatches: 6, rank: 50 },
  { name: 'christopher plastow', wins: 7, losses: 7, totalMatches: 14, rank: 51 },
  { name: 'Tim Hudson', wins: 2, losses: 4, totalMatches: 6, rank: 52 },
  { name: 'Scott Grenenger', wins: 4, losses: 15, totalMatches: 19, rank: 53 },
  { name: 'Onur Kerimoglu', wins: 0, losses: 0, totalMatches: 0, rank: 54 },
  { name: 'Mitch Abagi', wins: 0, losses: 0, totalMatches: 0, rank: 55 },
  { name: 'Peter Loadman', wins: 2, losses: 4, totalMatches: 6, rank: 56 },
  { name: 'David Ridgway', wins: 6, losses: 6, totalMatches: 12, rank: 57 },
  { name: 'Sam Abagi', wins: 0, losses: 0, totalMatches: 0, rank: 58 },
  { name: 'Mike Shimerda', wins: 0, losses: 0, totalMatches: 0, rank: 59 }
];

// Calculate win percentage and sort by total wins
const rankedData = historicalData.map(player => ({
  ...player,
  winPercentage: player.totalMatches > 0 ? (player.wins / player.totalMatches) * 100 : 0
})).sort((a, b) => {
  // Sort by total wins DESC, then by win percentage DESC as tiebreaker
  if (b.wins !== a.wins) {
    return b.wins - a.wins;
  }
  return b.winPercentage - a.winPercentage;
});

// Assign new ranks with custom adjustment for Michael Johnson
rankedData.forEach((player, index) => {
  player.newRank = index + 1;
});

// Custom adjustment: Move Michael Johnson from #1 to #5
const michaelIndex = rankedData.findIndex(p => p.name === 'Michael Johnson');
if (michaelIndex !== -1) {
  const michael = rankedData[michaelIndex];
  rankedData.splice(michaelIndex, 1); // Remove from current position
  rankedData.splice(4, 0, michael); // Insert at position 4 (which is rank #5)
  
  // Reassign ranks after adjustment
  rankedData.forEach((player, index) => {
    player.newRank = index + 1;
  });
}

// Display the rankings
console.log('\n=== ATHLETE RANKINGS BY WIN PERCENTAGE ===\n');
console.log('Rank | Name                              | W   | L   | Matches | Win %');
console.log('-----|-----------------------------------|-----|-----|---------|-------');

rankedData.forEach(player => {
  const namePadded = player.name.padEnd(33);
  const winsPadded = String(player.wins).padStart(3);
  const lossesPadded = String(player.losses).padStart(3);
  const matchesPadded = String(player.totalMatches).padStart(7);
  const winPctFormatted = player.winPercentage.toFixed(1).padStart(5) + '%';
  
  console.log(`${String(player.newRank).padStart(4)} | ${namePadded} | ${winsPadded} | ${lossesPadded} | ${matchesPadded} | ${winPctFormatted}`);
});

console.log('\n');

// Function to update database with new rankings
async function updateDatabaseRankings() {
  console.log('Updating database rankings...\n');
  
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const player of rankedData) {
    try {
      // Find athlete by name (case-insensitive)
      const findResult = await query(
        'SELECT id, name, rank FROM athletes WHERE LOWER(name) = LOWER($1)',
        [player.name]
      );
      
      if (findResult.rows.length > 0) {
        const athlete = findResult.rows[0];
        const oldRank = athlete.rank;
        
        // Update the rank
        await query(
          'UPDATE athletes SET rank = $1 WHERE id = $2',
          [player.newRank, athlete.id]
        );
        
        console.log(`✓ Updated ${player.name}: Rank ${oldRank} → ${player.newRank} (${player.winPercentage.toFixed(1)}% win rate)`);
        updatedCount++;
      } else {
        console.log(`✗ Not found in database: ${player.name}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${player.name}:`, error.message);
    }
  }
  
  console.log(`\n=== UPDATE SUMMARY ===`);
  console.log(`Athletes updated: ${updatedCount}`);
  console.log(`Athletes not found: ${notFoundCount}`);
  console.log(`Total processed: ${rankedData.length}`);
}

// Run the update
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--apply') || args.includes('-a')) {
      await updateDatabaseRankings();
      process.exit(0);
    } else {
      console.log('\nTo apply these rankings to the database, run:');
      console.log('  node update-rankings.js --apply\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

