import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { buildFriendlyRankingsModel } from "../js/friendly-rankings-engine.js";

// Exercise the app's existing scoring functions, rather than duplicate the points rules.
const source = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const scoring = vm.createContext({ normalizeTeamKey: value => String(value || "").toLowerCase() });
vm.runInContext(source.slice(source.indexOf("function isFinished("), source.indexOf("function gameStatusDisplay(")) + source.slice(source.indexOf("function calculatePredictionPoints("), source.indexOf("function predictionResultLabel(")), scoring);
const participants = [
  { user_id: "ana", nome: "Ana" }, { user_id: "bia", nome: "Bia" },
  { user_id: "caio", nome: "Caio" }, { user_id: "empty", nome: "Sem palpites" },
  { user_id: "inactive", nome: "Inativo", ativo: false },
];
const games = [], picks = [];
for (let round = 1; round <= 7; round++) {
  for (let match = 1; match <= (round === 7 ? 9 : 10); match++) {
    const game = { id_jogo: round * 100 + match, rodada: round, status: "encerrado", gols_casa: 2, gols_fora: 1 };
    if (round === 3 && match === 10) game.status = "ao vivo";
    if (round === 4 && match === 10) game.status = "adiado";
    if (round === 5 && match === 10) game.status = "cancelado";
    if (round === 6 && match === 10) game.gols_casa = null;
    games.push(game);
    const pick = (user_id, home, away, usuario = user_id) => picks.push({ user_id, usuario, id_jogo: game.id_jogo, gols_casa: home, gols_fora: away });
    pick("ana", round === 1 && match > 7 ? 0 : 2, round === 1 && match > 7 ? 1 : 1, "Nome antigo");
    pick("bia", round === 2 ? 3 : 2, round === 2 ? 2 : 1);
    pick("outsider", 2, 1, "Ana");
    pick("inactive", 2, 1);
    if (match === 1) pick("caio", round === 2 ? 2 : 0, 1);
  }
}
const build = (options = {}) => buildFriendlyRankingsModel({ games, picks, participants, currentParticipant: participants[0], isScorableGame: scoring.isScorableGame, pointsForPick: scoring.points, ...options });
const before = JSON.stringify({ games, picks, participants });
const model = build(), records = model.records.ranking;
assert.equal(records.length, 6);
assert.deepEqual(records.map(row => [row.name, row.round, row.points, row.position]), [
  ["Ana", 2, 100, 1], ["Bia", 1, 100, 1], ["Ana", 1, 70, 3],
  ["Bia", 2, 50, 4], ["Caio", 2, 10, 5], ["Caio", 1, 0, 6],
]);
assert.equal(records.filter(row => row.isCurrent).length, 2);
assert.equal(records.some(row => ["outsider", "inactive", "empty"].includes(row.id)), false);
assert.deepEqual(build({ picks: [...picks, ...picks], games: [...games, ...games] }).records, model.records, "duplicates must not inflate totals or fixture completeness");
assert.deepEqual(build({ participants: [participants[1]] }).records.ranking.map(row => row.id), ["bia", "bia"], "member directory isolates another league");
assert.equal(build({ participants: [] }).records.ranking.length, 0);
assert.equal(build({ games: games.filter(game => game.rodada === 7) }).records.ranking.length, 0, "nine finalized fixtures do not prove a complete round");
const rescheduled = games.map(game => game.rodada === 4 ? { ...game, status: "encerrado" } : game);
assert.equal(build({ games: rescheduled }).records.ranking.some(row => row.round === 4 && row.id === "ana" && row.points === 100), true, "rescheduled round enters only once its last game is finalized");
const invalid = games.map(game => game.id_jogo === 110 ? { ...game, gols_fora: "" } : game);
assert.equal(build({ games: invalid }).records.ranking.some(row => row.round === 1), false);
assert.equal(JSON.stringify({ games, picks, participants }), before, "no mutation of source data");
assert.deepEqual(build({ picks: [...picks].reverse(), games: [...games].reverse() }).records, model.records, "stable display order for equal scores");
const onlyClosed = build({ games: games.filter(game => scoring.isScorableGame(game)) });
assert.deepEqual(onlyClosed.efficiency, model.efficiency);
assert.deepEqual(onlyClosed.hot, model.hot);
assert.match(source, /pointsForPick:\(pick,game\)=>points\(pick,game\)/);
console.log("Recordes: totais reais, empates, repetições, rodadas completas, reagendados, isolamento, duplicados e preservação aprovados.");
