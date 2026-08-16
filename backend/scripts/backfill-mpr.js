#!/usr/bin/env node
import { backfillAllRatings } from '../lib/ratingService.js'
import { closePool } from '../database/db.js'

async function main() {
  try {
    console.log('🏓 Starting MPR backfill...\n')
    const summary = await backfillAllRatings()
    console.log('✅ MPR backfill complete')
    console.log(`   Matches processed: ${summary.matchesProcessed}`)
    console.log(`   Total rating updates: ${summary.totalUpdates}`)
    console.log(`   Athletes rated: ${summary.athletesRated}`)
    console.log(`   Still NR: ${summary.nrCount}`)
    console.log(`   Average MPR: ${summary.avgRating ?? 'N/A'}`)
  } catch (error) {
    console.error('❌ MPR backfill failed:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

main()
