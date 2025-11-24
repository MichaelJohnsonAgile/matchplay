import { useState } from 'react'
import { SkeletonTable } from '../Skeleton'

export default function GroupsTab() {
  const [activeRound, setActiveRound] = useState(0)
  const rounds = ['Round 1', 'Round 2', 'Round 3']
  
  // Mock number of groups (would come from data)
  const groups = [1, 2, 3]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Groups Performance</h2>
      
      {/* Round Tabs */}
      <div className="flex border-b border-[#377850] overflow-x-auto">
        {rounds.map((round, index) => (
          <button
            key={index}
            onClick={() => setActiveRound(index)}
            className={`tab flex-shrink-0 ${
              activeRound === index ? 'tab-active' : ''
            }`}
          >
            {round}
          </button>
        ))}
      </div>

      {/* Groups Display */}
      <div className="space-y-6">
        {groups.map((groupNum) => (
          <div key={groupNum} className="border border-[#377850] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Group {groupNum}</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#377850]">
                    <th className="p-2 text-left font-semibold">Athlete</th>
                    <th className="p-2 text-center font-semibold">Played</th>
                    <th className="p-2 text-center font-semibold">Wins</th>
                    <th className="p-2 text-center font-semibold">Losses</th>
                    <th className="p-2 text-center font-semibold">Points For</th>
                    <th className="p-2 text-center font-semibold">Points Against</th>
                    <th className="p-2 text-center font-semibold">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Skeleton rows for 4 athletes per group */}
                  {[1, 2, 3, 4].map((athleteNum) => (
                    <tr key={athleteNum} className="border-b border-gray-300">
                      <td className="p-2">
                        <div className="skeleton h-4 w-24"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="skeleton h-4 w-8 mx-auto"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="skeleton h-4 w-8 mx-auto"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="skeleton h-4 w-8 mx-auto"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="skeleton h-4 w-8 mx-auto"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="skeleton h-4 w-8 mx-auto"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="skeleton h-4 w-12 mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

