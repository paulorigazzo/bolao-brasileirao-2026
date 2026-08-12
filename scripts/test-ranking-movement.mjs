import assert from "node:assert/strict";
import { evaluateRankingMovement } from "../js/ranking-movement-engine.js";

const initial = [
  { userId: "user-a", name: "Ana" },
  { userId: "user-b", name: "Bruno" },
  { userId: "user-c", name: "Carla" }
];

const firstLoad = evaluateRankingMovement({ ranking: initial });
assert.deepEqual(firstLoad.movement, { "user-a": 0, "user-b": 0, "user-c": 0 });

const changed = [initial[1], initial[0], initial[2]];
const afterChange = evaluateRankingMovement({ ranking: changed, persistedPositions: firstLoad.positions });
assert.equal(afterChange.movement["user-b"], 1);
assert.equal(afterChange.movement["user-a"], -1);
assert.equal(afterChange.movement["user-c"], 0);

const repeatedRender = evaluateRankingMovement({
  ranking: changed,
  persistedPositions: afterChange.positions,
  previousSignature: afterChange.signature,
  previousMovement: afterChange.movement
});
assert.equal(repeatedRender.reused, true);
assert.deepEqual(repeatedRender.movement, afterChange.movement);

const renamed = changed.map(item => item.userId === "user-b" ? { ...item, name: "Bruno Silva" } : item);
const afterRename = evaluateRankingMovement({
  ranking: renamed,
  persistedPositions: afterChange.positions,
  previousSignature: afterChange.signature,
  previousMovement: afterChange.movement
});
assert.equal(afterRename.reused, true);
assert.deepEqual(afterRename.movement, afterChange.movement);

console.log("Movimentação do Ranking verificada com sucesso.");
