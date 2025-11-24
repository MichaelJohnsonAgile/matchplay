/**
 * Test script for round robin draw generation
 * Run: node test-draw.js
 */

// Test helper to generate round robin matches
function generateRoundRobinMatches(players) {
  const matches = []
  
  if (players.length === 4) {
    // 4-player group: 3 matches
    const matchConfigs = [
      { teamA: [0, 1], teamB: [2, 3] }, // A+B vs C+D
      { teamA: [0, 2], teamB: [1, 3] }, // A+C vs B+D
      { teamA: [0, 3], teamB: [1, 2] }  // A+D vs B+C
    ]
    
    matchConfigs.forEach((config, idx) => {
      matches.push({
        match: idx + 1,
        teamA: `${players[config.teamA[0]]}+${players[config.teamA[1]]}`,
        teamB: `${players[config.teamB[0]]}+${players[config.teamB[1]]}`,
        bye: null
      })
    })
    
  } else if (players.length === 5) {
    // 5-player group: 5 matches
    const matchConfigs = [
      { teamA: [0, 1], teamB: [2, 3], bye: 4 }, // A+B vs C+D (E bye)
      { teamA: [0, 2], teamB: [3, 4], bye: 1 }, // A+C vs D+E (B bye)
      { teamA: [0, 3], teamB: [1, 4], bye: 2 }, // A+D vs B+E (C bye)
      { teamA: [0, 4], teamB: [1, 2], bye: 3 }, // A+E vs B+C (D bye)
      { teamA: [1, 3], teamB: [2, 4], bye: 0 }  // B+D vs C+E (A bye)
    ]
    
    matchConfigs.forEach((config, idx) => {
      matches.push({
        match: idx + 1,
        teamA: `${players[config.teamA[0]]}+${players[config.teamA[1]]}`,
        teamB: `${players[config.teamB[0]]}+${players[config.teamB[1]]}`,
        bye: players[config.bye]
      })
    })
  }
  
  return matches
}

// Validate that each player partners with every other player exactly once
function validateRoundRobin(players, matches) {
  const partnerships = {}
  const playCount = {}
  
  players.forEach(p => {
    partnerships[p] = new Set()
    playCount[p] = 0
  })
  
  matches.forEach(match => {
    // Parse team compositions
    const [p1, p2] = match.teamA.split('+')
    const [p3, p4] = match.teamB.split('+')
    
    // Record partnerships
    partnerships[p1].add(p2)
    partnerships[p2].add(p1)
    partnerships[p3].add(p4)
    partnerships[p4].add(p3)
    
    // Count plays
    playCount[p1]++
    playCount[p2]++
    playCount[p3]++
    playCount[p4]++
  })
  
  console.log('\nPartnership validation:')
  players.forEach(player => {
    const partners = Array.from(partnerships[player]).sort()
    const expectedPartners = players.length - 1
    const matches = playCount[player]
    console.log(`${player}: partnered with ${partners.join(', ')} (${partners.length}/${expectedPartners} players) - played ${matches} matches`)
  })
  
  // Check if everyone partnered with everyone else
  const allCorrect = players.every(p => partnerships[p].size === players.length - 1)
  console.log(`${allCorrect ? '✓' : '✗'} All players partnered with everyone: ${allCorrect}`)
  
  return allCorrect
}

console.log('=== Round Robin Draw Generation Test ===\n')

// Test 1: 4-player group
console.log('TEST 1: 4-Player Group (Group of 4)')
console.log('Players: A, B, C, D\n')
const group4 = ['A', 'B', 'C', 'D']
const matches4 = generateRoundRobinMatches(group4)
console.log('Matches generated:')
matches4.forEach(m => {
  console.log(`  Match ${m.match}: ${m.teamA} vs ${m.teamB}`)
})
console.log(`Total matches: ${matches4.length} (expected: 3)`)
validateRoundRobin(group4, matches4)

console.log('\n' + '='.repeat(50) + '\n')

// Test 2: 5-player group
console.log('TEST 2: 5-Player Group (Group of 5)')
console.log('Players: A, B, C, D, E\n')
const group5 = ['A', 'B', 'C', 'D', 'E']
const matches5 = generateRoundRobinMatches(group5)
console.log('Matches generated:')
matches5.forEach(m => {
  console.log(`  Match ${m.match}: ${m.teamA} vs ${m.teamB}${m.bye ? ` (${m.bye} bye)` : ''}`)
})
console.log(`Total matches: ${matches5.length} (expected: 5)`)

console.log('\n' + '='.repeat(50) + '\n')

// Test 3: Verify each player in group of 5 has bye exactly once
console.log('TEST 3: Bye Rotation Validation (5-player group)')
const byeCounts = {}
group5.forEach(p => byeCounts[p] = 0)
matches5.forEach(m => {
  if (m.bye) byeCounts[m.bye]++
})
console.log('Bye counts:')
group5.forEach(p => {
  console.log(`  ${p}: ${byeCounts[p]} byes (expected: 1)`)
})

const allCorrect = Object.values(byeCounts).every(count => count === 1)
console.log(`\n${allCorrect ? '✓' : '✗'} All players have exactly 1 bye: ${allCorrect}`)

console.log('\n' + '='.repeat(50) + '\n')
console.log('✓ Round Robin Draw Generation Tests Complete')

