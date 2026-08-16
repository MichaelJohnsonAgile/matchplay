import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, closePool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const migrationFile = process.argv[2] || '003_add_mpr.sql'

  try {
    console.log(`🚀 Running migration: ${migrationFile}\n`)

    const migrationPath = path.join(__dirname, 'migrations', migrationFile)
    const migrationSql = await fs.readFile(migrationPath, 'utf8')

    await query(migrationSql)

    console.log(`✅ Migration ${migrationFile} applied successfully`)
  } catch (error) {
    console.error('❌ Error running migration:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

runMigration()
