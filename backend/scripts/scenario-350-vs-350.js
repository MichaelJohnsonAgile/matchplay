#!/usr/bin/env node
import { computeTeamDelta, predictExpectedPoints } from '../lib/ratingEngine.js'
import { MPR_CONFIG } from '../config/mpr.js'

const scores = [[11, 9], [11, 7], [11, 5], [11, 3], [11, 2], [11, 10], [10, 12]]
const stages = [
  { label: 'Provisional (matches 1–2)', reliability: 1.35 },
  { label: 'Regular (~20 matches)', reliability: 0.91 },
  { label: 'Established (40+ matches)', reliability: 0.65 },
]

console.log('\nAverage player: 3.5 + 3.5 partner vs 3.5 + 3.5 opponents')
console.log('Expected win probability: 50% each team\n')

for (const stage of stages) {
  const k = MPR_CONFIG.BASE_K * stage.reliability
  console.log(`--- ${stage.label}  (effective K = ${k.toFixed(4)}) ---`)
  console.log('Score   Win Δ    Loss Δ')
  for (const [winScore, loseScore] of scores) {
    const exp = predictExpectedPoints(3.5, 3.5, 11, winScore, loseScore)
    const winD = computeTeamDelta({
      won: true,
      teamScore: winScore,
      oppScore: loseScore,
      expectedTeamScore: exp.expectedA,
      expectedWin: exp.winProbA,
      pointsToWin: 11,
      k,
    })
    const lossD = computeTeamDelta({
      won: false,
      teamScore: loseScore,
      oppScore: winScore,
      expectedTeamScore: exp.expectedB,
      expectedWin: 1 - exp.winProbA,
      pointsToWin: 11,
      k,
    })
    console.log(
      `${String(winScore).padStart(2)}-${String(loseScore).padEnd(2)}   +${winD.toFixed(3)}   ${lossD.toFixed(3)}`
    )
  }
  console.log()
}

const kEst = MPR_CONFIG.BASE_K * 0.65
console.log('--- Night scenarios (established player, starts 3.500) ---')

function replay(label, results) {
  let mpr = 3.5
  for (const [my, opp] of results) {
    const won = my > opp
    const exp = predictExpectedPoints(3.5, 3.5, 11, my, opp)
    const d = won
      ? computeTeamDelta({
          won: true,
          teamScore: my,
          oppScore: opp,
          expectedTeamScore: exp.expectedA,
          expectedWin: exp.winProbA,
          pointsToWin: 11,
          k: kEst,
        })
      : computeTeamDelta({
          won: false,
          teamScore: my,
          oppScore: opp,
          expectedTeamScore: my === exp.expectedA ? exp.expectedA : exp.expectedB,
          expectedWin: exp.winProbA,
          pointsToWin: 11,
          k: kEst,
        })
    mpr += d
  }
  const wins = results.filter(([a, b]) => a > b).length
  console.log(`${label}: ${wins}W-${results.length - wins}L → ${mpr.toFixed(3)} (${mpr - 3.5 >= 0 ? '+' : ''}${(mpr - 3.5).toFixed(3)})`)
}

replay('All typical 11-7', Array(10).fill([11, 7]))
replay('50% at 11-7 / 7-11', [...Array(5).fill([11, 7]), ...Array(5).fill([7, 11])])
replay('Mixed realistic night', [
  [11, 7], [11, 9], [11, 5], [9, 11], [11, 7],
  [8, 11], [11, 4], [11, 9], [6, 11], [11, 6],
])
