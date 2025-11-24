#!/usr/bin/env node
/**
 * Athlete Management Script
 * 
 * This script clears existing athletes and bulk imports new ones.
 * 
 * Usage:
 *   node scripts/manage-athletes.js
 */

import { query } from '../database/db.js'
import { v4 as uuidv4 } from 'uuid'

// ============= ATHLETE DATA =============
// Edit this array with your athletes
// Each athlete should have: name (required), email (optional)
// Rank will be assigned based on order (1, 2, 3, etc.)

const NEW_ATHLETES = [
  { name: 'Mitch Abagi', email: 'mitchell.abagi@gmail.com' },
  { name: 'Sam Abagi', email: 'sam.abagi@gmail.com' },
  { name: 'Blair Allen', email: 'blair.allen@optusnet.com.au' },
  { name: 'Glenn Andresson', email: 'renovateit@me.com' },
  { name: 'Michael Boss', email: 'michael@discoversportsgroup.org' },
  { name: 'Scott Browne', email: 'admin@scotttennis.com.au' },
  { name: 'Nicholas Byrne', email: 'nickbyrne19@hotmail.com' },
  { name: 'Clement Charbonneau', email: 'clement.charbonneau@education.nsw.gov.au' },
  { name: 'Noella Charbonneau', email: 'noella@olichon.org' },
  { name: 'Jayden Clark', email: '9r8sd66hbm@privaterelay.appleid.com' },
  { name: 'Steven Collins', email: 'stevehcollins01@gmail.com' },
  { name: 'Sandy Cruise', email: 'sandycruise@hotmail.com' },
  { name: 'Anna Davis', email: 'anna.davis@live.com.au' },
  { name: 'Mario De Oliveira', email: 'Marinhonsm@hotmail.com' },
  { name: 'Tamim Ehsan', email: 'tamim.ehsan@students.mq.edu.au' },
  { name: 'Andrew England', email: 'andrew.england101@gmail.com' },
  { name: 'Courtenay Farquharson', email: 'courtenay.farquharson@gmail.com' },
  { name: 'John Glen', email: 'johnglenrugby@gmail.com' },
  { name: 'Glendon Evarts', email: 'glendon.evarts@hotmail.com' },
  { name: 'Kevin Godfrey', email: 'kev_godfrey@yahoo.com.au' },
  { name: 'Scott Grenenger', email: 'pjs6rhxdvf@privaterelay.appleid.com' },
  { name: 'Kunal Gupta', email: 'kunalgupta.id@gmail.com' },
  { name: 'Emma Hawkins', email: 'emzyjane1997@hotmail.com' },
  { name: 'Scott Heffernan', email: 'Heffes68@gmail.com' },
  { name: 'James Henderson', email: 'James.hendo@gmail.com' },
  { name: 'Tim Hudson', email: 'timtedshudson@gmail.com' },
  { name: 'Michael Johnson', email: 'johnson.michaelbrian@gmail.com' },
  { name: 'Onur Kerimoglu', email: 'oekerimoglu@hotmail.com' },
  { name: 'Peter Loadman', email: 'peter_loadman@hotmail.com' },
  { name: 'Brett Mackinlay', email: 'Bmaclizard@gmail.com' },
  { name: 'Chad Mackinlay', email: 'Chadmackinlay@gmail.com' },
  { name: 'Paula Mackinlay', email: 'Pmacstuff@gmail.com' },
  { name: 'Karen McCarthy', email: 'karenmccarthy585@gmail.com' },
  { name: 'Liam Mills', email: 'liammills20@gmail.com' },
  { name: 'Steven Ng', email: 'steven.tw.ng@gmail.com' },
  { name: 'Lachlan Oldfield', email: 'lachieold@gmail.com' },
  { name: 'Christopher Plastow', email: 'chrisplastowoz@gmail.com' },
  { name: 'John Rae', email: 'johnrae975@gmail.com' },
  { name: 'Darren Read', email: 'darren_read@outlook.com' },
  { name: 'David Ridgway', email: 'dridgway699@gmail.com' },
  { name: 'Marcello Sequeira', email: 'marcello.sequeira@gmail.com' },
  { name: 'Grant Shearer', email: 'shearer.g@gmail.com' },
  { name: 'Mike Shimerda', email: 'Mshimerda@gmail.com' },
  { name: 'Peter Smyth', email: 'smythpeter@optusnet.com.au' },
  { name: 'Josche Stewart', email: 'josche.stewart@gmail.com' },
  { name: 'Daniel Stone', email: 'danielstone80@gmail.com' },
  { name: 'Limuel Swanson', email: 'limuelinc@gmail.com' },
  { name: 'Bobby Tomas', email: 'bobby.tomas@gmail.com' },
  { name: 'Salvador Torres', email: 'salvadorftt@gmail.com' },
  { name: 'Thomas Truong', email: 'tuanthomas10@gmail.com' },
  { name: 'Harry Tullett', email: 'harrytullett14@gmail.com' },
  { name: 'Garry Twine', email: 'gptwine@gmail.com' },
  { name: 'Anton von Aulock', email: '2shcp6pwr4@privaterelay.appleid.com' },
  { name: 'Lisa Wandl', email: 'lisawandl@bigpond.com' },
  { name: 'Colin Weir', email: 'colinjweir@gmail.com' },
  { name: 'Andrew Wiltshire', email: 'andrew.wiltshire@yahoo.com.au' },
  { name: 'Gwo Yaw Wong', email: 'erwinwong@mac.com' },
  { name: 'Terence Wood', email: 'Terencewood31@gmail.com' },
  { name: 'Jun Yan', email: 'yanjun13@gmail.com' },
]

// ============= SCRIPT FUNCTIONS =============

async function clearAllAthletes() {
  console.log('\n🗑️  Clearing existing athletes...')
  
  try {
    const result = await query('DELETE FROM athletes')
    console.log(`✅ Deleted ${result.rowCount} athletes`)
    return result.rowCount
  } catch (error) {
    console.error('❌ Error clearing athletes:', error.message)
    throw error
  }
}

async function bulkAddAthletes(athletes) {
  console.log(`\n➕ Adding ${athletes.length} new athletes...`)
  
  if (athletes.length === 0) {
    console.log('⚠️  No athletes to add')
    return
  }
  
  try {
    let successCount = 0
    
    for (let i = 0; i < athletes.length; i++) {
      const athlete = athletes[i]
      const id = `ath-${uuidv4()}`
      const rank = i + 1
      
      await query(
        `INSERT INTO athletes (id, name, email, status, rank) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          athlete.name,
          athlete.email || '',
          'active',
          rank
        ]
      )
      
      console.log(`  ${rank}. ${athlete.name}`)
      successCount++
    }
    
    console.log(`\n✅ Successfully added ${successCount} athletes`)
    return successCount
  } catch (error) {
    console.error('❌ Error adding athletes:', error.message)
    throw error
  }
}

async function displayAthletes() {
  console.log('\n📋 Current Athletes:')
  console.log('─'.repeat(60))
  
  try {
    const result = await query('SELECT * FROM athletes ORDER BY rank ASC')
    
    if (result.rows.length === 0) {
      console.log('  (No athletes found)')
      return
    }
    
    result.rows.forEach(athlete => {
      console.log(`  ${athlete.rank}. ${athlete.name}${athlete.email ? ` (${athlete.email})` : ''}`)
    })
    
    console.log('─'.repeat(60))
    console.log(`Total: ${result.rows.length} athletes\n`)
  } catch (error) {
    console.error('❌ Error fetching athletes:', error.message)
    throw error
  }
}

async function validateAthletes(athletes) {
  console.log('\n🔍 Validating athlete data...')
  
  const errors = []
  
  athletes.forEach((athlete, index) => {
    if (!athlete.name || athlete.name.trim() === '') {
      errors.push(`Athlete at index ${index} is missing a name`)
    }
  })
  
  if (errors.length > 0) {
    console.error('❌ Validation errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    return false
  }
  
  console.log('✅ All athletes valid')
  return true
}

// ============= MAIN EXECUTION =============

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🏓 MatchPlay Athlete Management Script')
  console.log('='.repeat(60))
  
  try {
    // Display current athletes
    await displayAthletes()
    
    // Validate new athlete data
    if (!await validateAthletes(NEW_ATHLETES)) {
      console.error('\n❌ Please fix validation errors and try again\n')
      process.exit(1)
    }
    
    // Confirm action
    console.log('\n⚠️  WARNING: This will DELETE all existing athletes and add new ones!')
    console.log(`\n📊 Summary:`)
    console.log(`   - Will delete: ALL existing athletes`)
    console.log(`   - Will add: ${NEW_ATHLETES.length} new athletes`)
    
    // For safety, require manual confirmation
    console.log('\n⚠️  To proceed, edit this script and set CONFIRM_DELETE = true\n')
    
    const CONFIRM_DELETE = true // Set to true to actually run
    
    if (!CONFIRM_DELETE) {
      console.log('❌ Operation cancelled (CONFIRM_DELETE = false)')
      console.log('💡 To run this script:')
      console.log('   1. Edit NEW_ATHLETES array with your athlete data')
      console.log('   2. Set CONFIRM_DELETE = true')
      console.log('   3. Run: node scripts/manage-athletes.js\n')
      process.exit(0)
    }
    
    // Clear existing athletes
    await clearAllAthletes()
    
    // Add new athletes
    await bulkAddAthletes(NEW_ATHLETES)
    
    // Display final result
    await displayAthletes()
    
    console.log('✅ Athlete management complete!\n')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()

