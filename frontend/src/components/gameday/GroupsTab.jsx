import { useState, useEffect } from 'react'
import { groupsAPI, gameDayAPI, matchAPI, teamsAPI } from '../../services/api'
import { ConfirmModal } from '../Alert'

const GROUP_COLORS = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800 border-red-200'
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-800 border-green-200'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  orange: {
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  pink: {
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-800',
    badge: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  cyan: {
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-800',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200'
  }
}

export function GroupsTab({ gameDayId, gameDay, onUpdate, isAdminMode = false }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generatingGroups, setGeneratingGroups] = useState(false)
  const [generatingDraw, setGeneratingDraw] = useState(false)
  const [clearingDraw, setClearingDraw] = useState(false)
  const [hasMatches, setHasMatches] = useState(false)
  const [hasScores, setHasScores] = useState(false)
  const [swapMode, setSwapMode] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [swapping, setSwapping] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  useEffect(() => {
    loadData()
  }, [gameDayId])

  async function loadData() {
    try {
      setLoading(true)
      const matchesData = await matchAPI.getForGameDay(gameDayId)
      setHasMatches(matchesData.length > 0)
      setHasScores(matchesData.some((m) => m.teamA?.score !== null || m.teamB?.score !== null))

      const groupsData = await groupsAPI.getForGameDay(gameDayId)
      setGroups(groupsData)
      setError(null)
    } catch (err) {
      console.error('Error loading groups:', err)
      setError(err.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateGroups() {
    setGeneratingGroups(true)
    setError(null)
    try {
      const data = await groupsAPI.generate(gameDayId)
      setGroups(data.groups || [])
      setHasMatches(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error generating groups:', err)
      setError(err.message)
    } finally {
      setGeneratingGroups(false)
    }
  }

  async function handleGenerateDraw() {
    setGeneratingDraw(true)
    setError(null)
    try {
      await gameDayAPI.generateDraw(gameDayId)
      await loadData()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error generating draw:', err)
      setError(err.message)
    } finally {
      setGeneratingDraw(false)
    }
  }

  function handleClearDraw() {
    const title = hasScores ? 'Delete All Matches?' : 'Clear Draw?'
    const message = hasScores
      ? 'WARNING: This will DELETE ALL MATCHES including entered scores!\n\nAll match results will be permanently lost. You will be able to modify groups and generate a new draw.'
      : 'This will clear the current draw so you can modify groups and regenerate.\n\nNo scores have been entered yet, so no data will be lost.'

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: confirmClearDraw
    })
  }

  async function confirmClearDraw() {
    setClearingDraw(true)
    setError(null)
    try {
      await gameDayAPI.cancelDraw(gameDayId)
      await loadData()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error clearing draw:', err)
      setError(err.message)
    } finally {
      setClearingDraw(false)
    }
  }

  function handleToggleSwapMode() {
    setSwapMode(!swapMode)
    setSelectedPlayer(null)
  }

  function handlePlayerClick(player, group) {
    if (!swapMode || !isAdminMode) return

    if (!selectedPlayer) {
      setSelectedPlayer({
        playerId: player.id,
        playerName: player.name,
        groupId: group.groupId,
        groupName: group.groupName
      })
      return
    }

    if (selectedPlayer.playerId === player.id) {
      setSelectedPlayer(null)
      return
    }

    if (selectedPlayer.groupId === group.groupId) {
      setSelectedPlayer({
        playerId: player.id,
        playerName: player.name,
        groupId: group.groupId,
        groupName: group.groupName
      })
      return
    }

    handleSwap(player, group)
  }

  async function handleSwap(player2, group2) {
    setSwapping(true)
    setError(null)
    try {
      const player1 = selectedPlayer
      await teamsAPI.removeMember(player1.groupId, player1.playerId)
      await teamsAPI.removeMember(group2.groupId, player2.id)
      await teamsAPI.addMember(group2.groupId, player1.playerId)
      await teamsAPI.addMember(player1.groupId, player2.id)
      await loadData()
      setSelectedPlayer(null)
    } catch (err) {
      console.error('Error swapping players:', err)
      setError('Failed to swap players: ' + err.message)
      await loadData()
    } finally {
      setSwapping(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const athleteCount = gameDay?.athleteCount ?? 0

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">Groups</h2>
          <div className="flex gap-2 flex-wrap justify-end">
            {isAdminMode && groups.length === 0 && (
              <button
                onClick={handleGenerateGroups}
                disabled={generatingGroups || athleteCount < 8}
                className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
              >
                {generatingGroups ? 'Generating...' : 'Generate Groups'}
              </button>
            )}

            {isAdminMode && groups.length > 0 && !hasMatches && (
              <>
                <button
                  onClick={handleGenerateGroups}
                  disabled={generatingGroups || swapMode || athleteCount < 8}
                  className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {generatingGroups ? 'Regenerating...' : 'Regenerate Groups'}
                </button>
                <button
                  onClick={handleToggleSwapMode}
                  disabled={swapping}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    swapMode
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'border border-amber-500 text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  {swapMode ? 'Exit Swap Mode' : 'Swap Players'}
                </button>
                <button
                  onClick={handleGenerateDraw}
                  disabled={generatingDraw || swapMode}
                  className="bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400"
                >
                  {generatingDraw ? 'Generating...' : 'Generate Draw'}
                </button>
              </>
            )}

            {isAdminMode && groups.length > 0 && hasMatches && (
              <button
                onClick={handleClearDraw}
                disabled={clearingDraw}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  hasScores
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                    : 'border border-red-500 text-red-600 hover:bg-red-50 disabled:border-gray-300 disabled:text-gray-400'
                }`}
              >
                {clearingDraw ? 'Clearing...' : 'Clear Draw'}
              </button>
            )}

            {groups.length > 0 && hasMatches && (
              <button
                onClick={loadData}
                className="border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>

        {groups.length > 0 && !hasMatches && (
          <p className="text-sm text-gray-600">
            Groups are ready. Generate the draw to create round 1 matches inside each group.
          </p>
        )}
        {groups.length > 0 && hasMatches && !hasScores && (
          <p className="text-sm text-gray-600">Draw generated. Clear the draw to swap players between groups.</p>
        )}
      </div>

      {error && <div className="border border-red-500 bg-red-50 p-4 text-red-800 rounded">{error}</div>}

      {swapMode && (
        <div className="border-2 border-amber-400 bg-amber-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-amber-800">Swap Mode Active</p>
              <p className="text-sm text-amber-700">
                {selectedPlayer
                  ? `${selectedPlayer.playerName} selected. Click a player in another group to swap them.`
                  : 'Click a player to select them, then click a player in a different group to swap.'}
              </p>
            </div>
            {selectedPlayer && (
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-amber-600 hover:text-amber-800 text-sm underline"
              >
                Cancel selection
              </button>
            )}
          </div>
          {swapping && (
            <div className="mt-2 text-sm text-amber-700 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Swapping players...
            </div>
          )}
        </div>
      )}

      {groups.length === 0 && !error && (
        <div className="border border-gray-300 bg-gray-50 p-4 rounded text-gray-800">
          <p className="font-semibold mb-2">{isAdminMode ? 'Set up groups' : 'Groups not created'}</p>
          <p>
            {isAdminMode
              ? athleteCount < 8
                ? 'Add at least 8 athletes to this game day, then generate groups. You can swap players between groups and regenerate the draw until scores are entered.'
                : 'Generate groups from the current season rankings, then adjust with swap mode before generating the draw.'
              : 'Groups have not been set up yet.'}
          </p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => {
            const colorKey = group.teamColor || 'blue'
            const colorScheme = GROUP_COLORS[colorKey] || GROUP_COLORS.blue
            return (
              <div key={group.groupId} className={`border-2 ${colorScheme.border} rounded-lg overflow-hidden`}>
                <div className={`${colorScheme.bg} text-white p-4`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">{group.groupName}</h3>
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                      {group.members.length} player{group.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2 bg-white">
                  {group.members.map((member, idx) => {
                    const isSelected = selectedPlayer?.playerId === member.id
                    const isSwappable = swapMode && selectedPlayer && selectedPlayer.groupId !== group.groupId
                    const isClickable = swapMode && isAdminMode && !hasMatches

                    return (
                      <div
                        key={member.id}
                        onClick={() => isClickable && handlePlayerClick(member, group)}
                        className={`flex justify-between items-center p-3 rounded border-2 transition-all ${
                          isSelected
                            ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                            : isSwappable
                              ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400 cursor-pointer'
                              : isClickable
                                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer'
                                : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected && (
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {isSwappable && !isSelected && (
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                              </svg>
                            </span>
                          )}
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-gray-500">Rank {member.rank}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSwappable && <span className="text-xs text-green-600 font-medium">Click to swap</span>}
                          <span className={`text-xs px-2 py-1 rounded border ${colorScheme.badge}`}>#{idx + 1}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className={`p-4 border-t-2 ${colorScheme.border} bg-white`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Avg rank:</span>
                    <span className="ml-2 font-semibold">{group.avgRank}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={hasScores ? 'Yes, Delete All Matches' : 'Clear Draw'}
        confirmColor={hasScores ? 'red' : 'black'}
      />
    </div>
  )
}
