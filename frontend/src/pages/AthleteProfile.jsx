import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { athleteAPI } from '../services/api'
import { useNavigateWithAdmin } from '../hooks/useAdminMode'

export default function AthleteProfile() {
  const navigate = useNavigateWithAdmin()
  const { id: athleteId } = useParams()

  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (athleteId) loadProfile()
  }, [athleteId])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const data = await athleteAPI.getById(athleteId)
      setProfile(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load athlete profile:', err)
      setError('Failed to load athlete profile.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white p-6">
        <button onClick={() => navigate('/')} className="text-[#377850] mb-4">← Back</button>
        <p className="text-red-600">{error || 'Athlete not found'}</p>
      </div>
    )
  }

  const stats = profile.seasonStats

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-4">
        <button onClick={() => navigate('/')} className="text-[#377850] text-sm font-medium">
          ← Back to Dashboard
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <section className="border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold mb-1">{profile.name}</h1>
          {profile.seasonRank != null && (
            <p className="text-sm text-gray-500">Season rank {profile.seasonRank}</p>
          )}
        </section>

        {stats && (
          <section className="border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-3">Season Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Season Rank</p>
                <p className="font-semibold text-lg">{profile.seasonRank ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Games</p>
                <p className="font-semibold text-lg">{stats.matchesPlayed}</p>
              </div>
              <div>
                <p className="text-gray-500">W / L</p>
                <p className="font-semibold text-lg">{stats.wins} / {stats.losses}</p>
              </div>
              <div>
                <p className="text-gray-500">+/-</p>
                <p className="font-semibold text-lg">{stats.pointsDiff > 0 ? '+' : ''}{stats.pointsDiff}</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
