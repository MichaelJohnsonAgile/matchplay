import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, closePool } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  try {
    console.log('🚀 Starting Teams Mode migration...\n')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_add_teams_mode.sql')
    const migrationSql = await fs.readFile(migrationPath, 'utf8')
    
    console.log('📄 Executing migration SQL...')
    
    // Execute the migration
    await query(migrationSql)
    
    console.log('✅ Teams Mode schema updates applied successfully')
    console.log('\nUpdates applied:')
    console.log('  - Created table: teams')
    console.log('  - Created table: team_members')
    console.log('  - Updated table: gamedays (added number_of_teams)')
    console.log('  - Updated table: matches (added team refs)')
    
  } catch (error) {
    console.error('❌ Error running migration:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

// Run migration
runMigration()

