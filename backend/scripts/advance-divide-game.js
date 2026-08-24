import '../lib/loadEnv.js'
import * as db from '../database/queries.js'
import { tryAdvanceDivideAfterScore } from '../lib/divideService.js'

const GAME_DAY_ID = 'gd-c1fc2f2d-61e6-43e7-bb76-051f3f3ddac3'

const matches = await db.getMatchesByGameDay(GAME_DAY_ID)
const game3 = matches.filter((m) => m.round === 1 && m.group === 3)

if (game3.length > 0) {
  console.log(`Game 3 already exists: ${game3.length} matches`)
  for (const m of game3) {
    console.log(`  court ${m.court} ${m.id}`)
  }
  process.exit(0)
}

const game2Complete = matches.filter((m) => m.round === 1 && m.group === 2 && m.winner)
if (game2Complete.length < 5) {
  console.error(`Game 2 not complete: ${game2Complete.length}/5 courts scored`)
  process.exit(1)
}

const trigger = game2Complete[0]
const result = await tryAdvanceDivideAfterScore(GAME_DAY_ID, trigger)

console.log(JSON.stringify(result, null, 2))

const after = await db.getMatchesByGameDay(GAME_DAY_ID)
const g3 = after.filter((m) => m.round === 1 && m.group === 3)
console.log(`\nGame 3 now: ${g3.length} matches`)
for (const m of g3) {
  console.log(`  court ${m.court}: ${m.teamA.players.join('+')} vs ${m.teamB.players.join('+')}`)
}

process.exit(0)
