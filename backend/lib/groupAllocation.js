/**
 * Optimal group sizes for round-robin (4 or 5 per group, remainder spread as 5s).
 * @param {number} numAthletes
 */
export function calculateGroupAllocation(numAthletes) {
  const numGroups = Math.floor(numAthletes / 4)
  const remainder = numAthletes % 4

  if (numGroups === 0) {
    return {
      numGroups: 0,
      groupSizes: [],
      description: `Need at least 8 athletes (currently ${numAthletes})`,
      totalAthletes: numAthletes,
      hasByes: false,
      has5PlayerGroups: false,
      error: true
    }
  }

  const groupSizes = []
  for (let i = 0; i < numGroups; i++) {
    groupSizes.push(i < remainder ? 5 : 4)
  }

  const numGroupsOf5 = remainder
  const numGroupsOf4 = numGroups - remainder

  let description = ''
  if (numGroupsOf5 === 0) {
    description = `${numGroupsOf4} groups of 4`
  } else if (numGroupsOf4 === 0) {
    description = `${numGroupsOf5} groups of 5 (1 bye each)`
  } else {
    description = `${numGroupsOf5} groups of 5 (1 bye each), ${numGroupsOf4} groups of 4`
  }

  return {
    numGroups,
    groupSizes,
    description,
    totalAthletes: numAthletes,
    hasByes: numGroupsOf5 > 0,
    has5PlayerGroups: numGroupsOf5 > 0,
    movementRule: numGroupsOf5 > 0 ? '2 up, 2 down' : '1 up, 1 down'
  }
}
