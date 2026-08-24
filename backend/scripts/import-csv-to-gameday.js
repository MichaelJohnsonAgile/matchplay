/**
 * One-off: register CSV athletes (if missing) and add them to a gameday.
 * Usage: node scripts/import-csv-to-gameday.js <csv-path> <gameday-id> [--dry-run]
 */

import fs from 'fs'
import path from 'path'

const API_BASE = process.env.API_BASE_URL || 'https://matchplay-gwmb.onrender.com/api'
const dryRun = process.argv.includes('--dry-run')
const csvPath = process.argv.find((a) => a.endsWith('.csv'))
const gamedayId = process.argv.find((a) => a.startsWith('gd-'))

if (!csvPath || !gamedayId) {
  console.error('Usage: node scripts/import-csv-to-gameday.js <csv-path> <gameday-id> [--dry-run]')
  process.exit(1)
}

function normaliseEmail(email) {
  return (email || '').trim().toLowerCase()
}

function normaliseName(first, last) {
  return `${first} ${last}`.trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/)
  const header = lines[0].split(',')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length < 2) continue
    const row = {}
    header.forEach((h, idx) => {
      row[h.trim()] = (parts[idx] || '').trim()
    })
    rows.push(row)
  }
  return rows
}

async function api(method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${endpoint} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : null
}

function findExisting(athletes, row) {
  const email = normaliseEmail(row.Email)
  const name = normaliseName(row['First Name'], row['Last Name'])

  if (email) {
    const byEmail = athletes.find((a) => normaliseEmail(a.email) === email)
    if (byEmail) return byEmail
  }

  const byName = athletes.find((a) => a.name.trim().toLowerCase() === name)
  if (byName) return byName

  // Fuzzy: first + last contained in name
  const first = row['First Name'].trim().toLowerCase()
  const last = row['Last Name'].trim().toLowerCase()
  return athletes.find((a) => {
    const n = a.name.trim().toLowerCase()
    return n.includes(first) && n.includes(last)
  }) || null
}

async function main() {
  const csvContent = fs.readFileSync(path.resolve(csvPath), 'utf8')
  const rows = parseCsv(csvContent)
  console.log(`CSV: ${rows.length} attendees`)
  console.log(`Gameday: ${gamedayId}`)
  console.log(`API: ${API_BASE}`)
  if (dryRun) console.log('DRY RUN — no changes will be made\n')

  const athletes = await api('GET', '/athletes')
  const gamedayAthletes = await api('GET', `/gamedays/${gamedayId}/athletes`)
  const onGameday = new Set(gamedayAthletes.map((a) => a.id))

  const results = { matched: [], created: [], failed: [] }
  const athleteIds = []

  for (const row of rows) {
    const displayName = `${row['First Name']} ${row['Last Name']}`.trim()
    const email = row.Email || ''

    let athlete = findExisting(athletes, row)

    if (athlete) {
      results.matched.push({ name: displayName, id: athlete.id, email: athlete.email || email })
      console.log(`✓ Found: ${displayName} → ${athlete.id}`)
    } else {
      console.log(`+ Register: ${displayName} (${email})`)
      if (!dryRun) {
        try {
          athlete = await api('POST', '/athletes', { name: displayName, email })
          athletes.push(athlete)
          results.created.push({ name: displayName, id: athlete.id })
          console.log(`  Created: ${athlete.id}`)
        } catch (err) {
          results.failed.push({ name: displayName, error: err.message })
          console.error(`  FAILED: ${err.message}`)
          continue
        }
      } else {
        results.created.push({ name: displayName, id: '(dry-run)' })
        continue
      }
    }

    athleteIds.push(athlete.id)
  }

  const toAdd = athleteIds.filter((id) => !onGameday.has(id))
  console.log(`\nAdding ${toAdd.length} athletes to gameday (${onGameday.size} already on gameday)`)

  if (toAdd.length > 0 && !dryRun) {
    const addResult = await api('POST', `/gamedays/${gamedayId}/athletes`, { athleteIds: toAdd })
    console.log('Add result:', addResult)
  }

  const finalAthletes = dryRun ? gamedayAthletes : await api('GET', `/gamedays/${gamedayId}/athletes`)
  console.log(`\n--- Summary ---`)
  console.log(`Matched existing: ${results.matched.length}`)
  console.log(`Newly registered: ${results.created.length}`)
  console.log(`Failed: ${results.failed.length}`)
  console.log(`On gameday now: ${dryRun ? onGameday.size + toAdd.length : finalAthletes.length}`)

  if (results.failed.length) {
    console.log('\nFailures:')
    results.failed.forEach((f) => console.log(`  - ${f.name}: ${f.error}`))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
