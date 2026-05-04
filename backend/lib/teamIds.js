/**
 * Team row purpose is encoded in the existing `teams.id` prefix (no extra DB column).
 * - team-*   teams mode squads
 * - pair-*   pairs mode
 * - gpool-*  group format round-robin pools (admin-editable before draw)
 */

export function isGroupPoolTeamId(teamId) {
  return typeof teamId === 'string' && teamId.startsWith('gpool-')
}

export function isPairTeamId(teamId) {
  return typeof teamId === 'string' && teamId.startsWith('pair-')
}
