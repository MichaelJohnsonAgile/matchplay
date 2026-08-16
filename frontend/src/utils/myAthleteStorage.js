const STORAGE_KEY = 'matchplay.myAthleteId'

export function getStoredMyAthleteId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredMyAthleteId(athleteId) {
  try {
    if (athleteId) {
      localStorage.setItem(STORAGE_KEY, athleteId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage unavailable — selection still works for this session
  }
}
