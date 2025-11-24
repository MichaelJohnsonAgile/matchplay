import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Tabs from '../components/Tabs'
import AthletesTab from '../components/gameday/AthletesTab'
import MatchesTab from '../components/gameday/MatchesTab'
import { gameDayAPI } from '../services/api'
import { formatGameDayDate } from '../utils/dateFormat'

export default function GameDay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [gameDay, setGameDay] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    loadGameDay()
  }, [id])

  const loadGameDay = async () => {
    try {
      setIsLoading(true)
      const data = await gameDayAPI.getById(id)
      setGameDay(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load game day:', err)
      setError('Failed to load game day')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 w-64"></div>
        </div>
      </div>
    )
  }

  if (error || !gameDay) {
    return (
      <div className="min-h-screen bg-white p-4">
        <button
          onClick={() => navigate('/')}
          className="text-sm mb-4 hover:underline"
        >
          ← Back to Dashboard
        </button>
        <div className="border border-red-500 bg-red-50 p-4 text-red-800">
          {error || 'Game day not found'}
        </div>
      </div>
    )
  }

  const hasMatches = gameDay.matches && gameDay.matches.length > 0
  
  const tabs = [
    {
      label: 'Athletes',
      content: <AthletesTab gameDayId={id} gameDay={gameDay} onUpdate={loadGameDay} />,
      disabled: false
    },
    {
      label: 'Matches',
      content: <MatchesTab gameDayId={id} gameDay={gameDay} />,
      disabled: !hasMatches
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black p-4">
        <button
          onClick={() => navigate('/')}
          className="text-sm mb-2 hover:underline"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold">Game Day</h1>
        <div className="text-sm text-gray-600 mt-1">
          {formatGameDayDate(gameDay.date)} • {gameDay.venue}
        </div>
      </header>
      <main className="p-4">
        <Tabs tabs={tabs} />
      </main>
    </div>
  )
}

