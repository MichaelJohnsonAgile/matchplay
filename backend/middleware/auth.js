import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

let supabaseAdmin = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Require valid Supabase JWT. Sets req.user = { id, email }.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }
  const token = authHeader.slice(7)

  // Dev bypass: when Supabase is not configured, accept a dev token of the form
  // "dev:<uuid>:<email>" so the app can be tested without a live Supabase project.
  if (!supabaseAdmin) {
    if (token.startsWith('dev:')) {
      const parts = token.split(':')
      req.user = { id: parts[1], email: parts[2] }
      return next()
    }
    return res.status(503).json({ error: 'Auth not configured (set SUPABASE_URL + SUPABASE_SERVICE_KEY)' })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  req.user = { id: data.user.id, email: data.user.email }
  next()
}

// Optional auth: populates req.user if a valid token is present, but does not block.
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()
  const token = authHeader.slice(7)

  if (!supabaseAdmin) {
    if (token.startsWith('dev:')) {
      const parts = token.split(':')
      req.user = { id: parts[1], email: parts[2] }
    }
    return next()
  }

  try {
    const { data } = await supabaseAdmin.auth.getUser(token)
    if (data?.user) req.user = { id: data.user.id, email: data.user.email }
  } catch (_) {}
  next()
}
