import assert from "node:assert/strict";
import { buildRankingMovementFromHistory } from "../js/ranking-movement-engine.js";

const initial = [
  { userId: "user-a", name: "Ana" },
  { userId: "user-b", name: "Bruno" },
  { userId: "user-c", name: "Carla" }
];

const changed = [initial[1], initial[0], initial[2]];
const rounds = [
  { round: 21, ranking: initial.map((item, index) => ({ ...item, position: index + 1 })) },
  { round: 22, ranking: changed.map((item, index) => ({ ...item, position: index + 1 })) }
];
const movement = buildRankingMovementFromHistory({ ranking: changed, rounds });
assert.equal(movement["user-b"], 1);
assert.equal(movement["user-a"], -1);
assert.equal(movement["user-c"], 0);

const repeatedCalculation = buildRankingMovementFromHistory({ ranking: changed, rounds });
assert.deepEqual(repeatedCalculation, movement);

const firstRoundOnly = buildRankingMovementFromHistory({
  ranking: initial,
  rounds: rounds.slice(0, 1)
});
assert.deepEqual(firstRoundOnly, { "user-a": 0, "user-b": 0, "user-c": 0 });

const stableRounds = buildRankingMovementFromHistory({
  ranking: changed,
  rounds: [rounds[1], { round: 23, ranking: rounds[1].ranking }]
});
assert.deepEqual(stableRounds, { "user-b": 0, "user-a": 0, "user-c": 0 });

console.log("Movimentação do Ranking verificada com sucesso.");
