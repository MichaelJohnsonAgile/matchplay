import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { athleteAPI } from '../services/api'
import { useNavigateWithAdmin } from '../hooks/useAdminMode'
import { getSkillBand, getTrendLabel, formatRatingDelta } from '../lib/mpr'

function RatingSparkline({ history }) {
  if (!history || history.length < 2) return null

  const points = [...history].reverse()
  const ratings = points.map((h) => h.ratingAfter)
  const min = Math.min(...ratings) - 0.1
  const max = Math.max(...ratings) + 0.1
  const range = max - min || 1
  const width = 200
  const height = 48

  const coords = ratings.map((r, i) => {
    const x = (i / (ratings.length - 1)) * width
    const y = height - ((r - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs h-12 text-[#377850]">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={coords}
      />
    </svg>
  )
}

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

  const trend = getTrendLabel(profile.ratingTrend)
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
          <p className="text-sm text-gray-500 mb-4">{getSkillBand(profile.doublesRating)}</p>

          <div className="flex items-end gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">MPR</p>
              <p className="text-4xl font-bold text-[#377850]">{profile.mprDisplay}</p>
            </div>
            {profile.mprDisplay !== 'NR' && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Reliability</p>
                <p className="text-xl font-semibold">{profile.ratingReliability}%</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Trend</p>
              <p className={`text-sm font-medium ${trend.className}`}>{trend.label}</p>
            </div>
          </div>

          <RatingSparkline history={profile.ratingHistory} />
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

        <section className="border border-gray-200 overflow-x-auto">
          <h2 className="text-lg font-semibold p-4 border-b border-gray-200">Rating History</h2>
          {profile.ratingHistory?.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No rated matches yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-center p-3 font-semibold">Score</th>
                  <th className="text-center p-3 font-semibold">MPR</th>
                  <th className="text-center p-3 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {profile.ratingHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-200">
                    <td className="p-3">
                      {entry.gamedayDate
                        ? new Date(entry.gamedayDate).toLocaleDateString('en-AU')
                        : '—'}
                    </td>
                    <td className="p-3 text-center">{entry.score}</td>
                    <td className="p-3 text-center font-medium">{entry.ratingAfter.toFixed(3)}</td>
                    <td className={`p-3 text-center font-medium ${
                      entry.delta > 0 ? 'text-green-600' : entry.delta < 0 ? 'text-red-600' : ''
                    }`}>
                      {formatRatingDelta(entry.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}
