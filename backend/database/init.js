import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, closePool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...\n')
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf8')
    
    console.log('📄 Executing schema.sql...')
    
    // Execute the schema (PostgreSQL allows multiple statements in one query)
    await query(schema)
    
    console.log('✅ Database schema created successfully')
    console.log('✅ Sample data inserted')
    console.log('\n📊 Database is ready to use!')
    console.log('\nTables created:')
    console.log('  - athletes (12 sample athletes)')
    console.log('  - gamedays')
    console.log('  - gameday_athletes')
    console.log('  - matches')
    
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

// Run initialization
initializeDatabase()

