import pg from 'pg'
const { Pool } = pg

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connection established')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err)
})

// Helper function to execute queries with error handling
export async function query(text, params) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Query executed:', { text: text.substring(0, 100), duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Helper function to get a client from the pool for transactions
export async function getClient() {
  const client = await pool.connect()
  const query = client.query
  const release = client.release

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!')
  }, 5000)

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args
    return query.apply(client, args)
  }

  client.release = () => {
    // Clear our timeout
    clearTimeout(timeout)
    // Set the methods back to their old un-monkey-patched version
    client.query = query
    client.release = release
    return release.apply(client)
  }

  return client
}

// Graceful shutdown
export async function closePool() {
  await pool.end()
  console.log('Database pool has ended')
}

export default { query, getClient, closePool, pool }

