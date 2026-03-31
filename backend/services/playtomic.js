// Playtomic API client
// Availability and venue search endpoints work unauthenticated.
// Court booking is NOT possible via API — callers receive a deep link
// to complete the booking on Playtomic's own app/website.

const TENANTS_BASE = 'https://playtomic.io/api/v1'
const API_BASE = 'https://api.playtomic.io/v1'

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
}

async function playtomicFetch(url) {
  const res = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw Object.assign(new Error(`Playtomic API ${res.status}: ${text}`), { status: res.status })
  }
  return res.json()
}

/**
 * Search for padel venues near a coordinate.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMeters – default 15 km
 * @param {number} size – max results, default 20
 */
export async function searchVenues(lat, lng, radiusMeters = 15000, size = 20) {
  const params = new URLSearchParams({
    user_id: 'me',
    playtomic_status: 'ACTIVE',
    coordinate: `${lat},${lng}`,
    sport_id: 'PADEL',
    radius: String(radiusMeters),
    size: String(size),
  })
  const url = `${TENANTS_BASE}/tenants?${params}`
  return playtomicFetch(url)
}

/**
 * Get available court slots for a venue on a given date.
 * @param {string} tenantId – Playtomic venue UUID
 * @param {string} date – YYYY-MM-DD
 */
export async function getAvailability(tenantId, date) {
  const startMin = `${date}T00:00:00`
  const startMax = `${date}T23:59:59`
  const params = new URLSearchParams({
    sport_id: 'PADEL',
    tenant_id: tenantId,
    start_min: startMin,
    start_max: startMax,
  })
  const url = `${API_BASE}/availability?${params}`
  return playtomicFetch(url)
}

/**
 * Build a Playtomic deep link for a specific venue (and optionally a time slot).
 * Opens the Playtomic booking page for the given club in the browser/app.
 * @param {string} tenantId
 * @param {object} [slot] – { date, startTime } optional, e.g. { date: '2025-03-10', startTime: '10:00:00' }
 */
export function buildDeepLink(tenantId, slot = null) {
  // Playtomic web booking URL pattern (reverse-engineered from the mobile app)
  const base = `https://app.playtomic.io/`
  const params = new URLSearchParams({ sport: 'PADEL', tenantId })
  if (slot?.date) params.set('date', slot.date)
  if (slot?.startTime) params.set('startTime', slot.startTime)
  return `${base}?${params}`
}
