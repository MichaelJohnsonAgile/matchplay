export function formatAthlete(athlete) {
  if (!athlete) return athlete
  return {
    id: athlete.id,
    name: athlete.name,
    email: athlete.email,
    status: athlete.status,
    rank: athlete.rank,
  }
}
