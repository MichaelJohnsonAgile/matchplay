/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date like "Monday 24th November 2025"
 */
export function formatGameDayDate(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString + 'T00:00:00') // Add time to avoid timezone issues
  
  // Get day of week
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
  
  // Get day with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  const day = date.getDate()
  const ordinalSuffix = getOrdinalSuffix(day)
  
  // Get month name
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  
  // Get year
  const year = date.getFullYear()
  
  return `${dayOfWeek} ${day}${ordinalSuffix} ${month} ${year}`
}

/**
 * Gets the ordinal suffix for a day number
 * @param {number} day - Day of the month
 * @returns {string} - Ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th' // 11th-20th
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

