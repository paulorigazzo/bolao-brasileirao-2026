import assert from "node:assert/strict";
import { buildRoundHighlightsModel, isPostponedRoundHighlightsEligible, selectLatestRoundHighlightsCandidate } from "../js/round-highlights-engine.js";

const participants = [
  { user_id: "ana-id", nome: "Ana" },
  { user_id: "bia-id", nome: "Bia" },
  { user_id: "caio-id", nome: "Caio" },
];

const games = [
  { id_jogo: 1, rodada: 1, status: "encerrado", gols_casa: 1, gols_fora: 0, time_casa: "A", time_fora: "B" },
  { id_jogo: 2, rodada: 2, status: "encerrado", gols_casa: 2, gols_fora: 1, time_casa: "C", time_fora: "D" },
  { id_jogo: 3, rodada: 2, status: "encerrado", gols_casa: 0, gols_fora: 0, time_casa: "E", time_fora: "F" },
];

const picks = [
  { id_jogo: 1, user_id: "ana-id", usuario: "Nome antigo de Ana", score: 3 },
  { id_jogo: 1, user_id: "bia-id", usuario: "Bia", score: 10 },
  { id_jogo: 1, user_id: "caio-id", usuario: "Caio", score: 0 },
  { id_jogo: 2, user_id: "ana-id", usuario: "Ana", score: 10 },
  { id_jogo: 2, user_id: "bia-id", usuario: "Bia", score: 3 },
  { id_jogo: 2, user_id: "caio-id", usuario: "Caio", score: 0 },
  { id_jogo: 3, user_id: "ana-id", usuario: "Ana", score: 5 },
  { id_jogo: 3, user_id: "bia-id", usuario: "Bia", score: 0 },
];

const dependencies = {
  isScorableGame: game => game.status === "encerrado" && game.gols_casa != null && game.gols_fora != null,
  gameStatusDisplay: game => ({ key: game.status === "encerrado" ? "finished" : game.status }),
  pointsForPick: pick => pick.score,
};

const complete = buildRoundHighlightsModel({
  round: 2,
  games,
  picks,
  participants,
  selectedParticipantId: "ana-id",
  ...dependencies,
});

assert.equal(complete.status, "finished");
assert.equal(complete.isProvisional, false);
assert.equal(complete.lifecycle.finished, 2);
assert.equal(complete.selectedParticipant.name, "Ana");
assert.equal(complete.roundRanking[0].name, "Ana");
assert.equal(complete.roundRanking[0].points, 15);
assert.equal(complete.facts.group.find(fact => fact.key === "round-winner").participantKeys[0], "user:ana-id");
assert.equal(complete.facts.group.find(fact => fact.key === "unique-exact:2").evidence.gameId, 2);
assert.equal(complete.facts.personal.find(fact => fact.key === "new-personal-best").evidence.previousBest, 3);
assert.equal(complete.facts.personal.find(fact => fact.key === "personal-ranking-movement").evidence.places, 1);
assert.ok(complete.facts.personal.every(fact => fact.evidence.source));
assert.deepEqual(complete, buildRoundHighlightsModel({
  round: 2,
  games,
  picks,
  participants,
  selectedParticipantId: "ana-id",
  ...dependencies,
}));

const historical = buildRoundHighlightsModel({
  round: 1,
  games,
  picks,
  participants,
  selectedParticipantId: "ana-id",
  ...dependencies,
});
assert.equal(historical.round, 1);
assert.equal(historical.lifecycle.finished, 1);
assert.deepEqual(historical.provenance.scorableGameIds, [1]);
assert.equal(historical.roundRanking[0].name, "Bia");
assert.equal(historical.facts.group.find(fact => fact.key === "round-winner").participantKeys[0], "user:bia-id");

const tied = buildRoundHighlightsModel({
  round: 2,
  games: games.filter(game => game.rodada === 2),
  picks: [
    { id_jogo: 2, user_id: "ana-id", score: 10 },
    { id_jogo: 3, user_id: "bia-id", score: 10 },
  ],
  participants,
  ...dependencies,
});
assert.equal(tied.facts.group.find(fact => fact.key === "round-winner").participantKeys.length, 2);
assert.equal(tied.facts.group.some(fact => fact.key.startsWith("unique-exact:")), true);

const partial = buildRoundHighlightsModel({
  round: 3,
  games: [
    { id_jogo: 4, rodada: 3, status: "encerrado", gols_casa: 1, gols_fora: 1 },
    { id_jogo: 5, rodada: 3, status: "live" },
    { id_jogo: 6, rodada: 3, status: "postponed" },
    { id_jogo: 7, rodada: 3, status: "cancelled" },
  ],
  picks: [
    { id_jogo: 4, user_id: "ana-id", score: 3 },
    { id_jogo: 5, user_id: "ana-id", score: 10 },
    { id_jogo: 6, user_id: "ana-id", score: 10 },
    { id_jogo: 7, user_id: "ana-id", score: 10 },
  ],
  participants,
  selectedParticipantId: "ana-id",
  ...dependencies,
});
assert.equal(partial.status, "provisional");
assert.equal(partial.lifecycle.live, 1);
assert.equal(partial.lifecycle.postponed, 1);
assert.equal(partial.lifecycle.cancelled, 1);
assert.deepEqual(partial.provenance.scorableGameIds, [4]);
assert.deepEqual(partial.provenance.excludedGameIds, [5, 6, 7]);
assert.equal(partial.roundRanking.find(item => item.key === "user:ana-id").points, 3);
assert.equal(partial.facts.group.some(fact => fact.key.startsWith("unique-exact:")), false);
assert.equal(isPostponedRoundHighlightsEligible(partial.lifecycle), false);

const postponedPartial = buildRoundHighlightsModel({
  round: 3,
  games: [
    { id_jogo: 4, rodada: 3, status: "encerrado", gols_casa: 1, gols_fora: 1 },
    { id_jogo: 6, rodada: 3, status: "postponed" },
  ],
  picks: [{ id_jogo: 4, user_id: "ana-id", score: 3 }],
  participants,
  selectedParticipantId: "ana-id",
  ...dependencies,
});
assert.equal(postponedPartial.status, "provisional");
assert.equal(isPostponedRoundHighlightsEligible(postponedPartial.lifecycle), true);
assert.deepEqual(postponedPartial.provenance.scorableGameIds, [4]);
assert.deepEqual(postponedPartial.provenance.excludedGameIds, [6]);
assert.equal(isPostponedRoundHighlightsEligible({ finished: 1, postponed: 1, future: 1, live: 0 }), false);
const latestCandidate = selectLatestRoundHighlightsCandidate([
  { round: 20, lifecycle: { status: "FINISHED", finished: 10, postponed: 0, future: 0, live: 0 } },
  { round: 21, lifecycle: { status: "PARTIAL", finished: 6, postponed: 4, future: 0, live: 0 } },
  { round: 22, lifecycle: { status: "OPEN", finished: 0, postponed: 0, future: 10, live: 0 } },
]);
assert.equal(latestCandidate.round, 21);
assert.equal(selectLatestRoundHighlightsCandidate([
  { round: 20, lifecycle: { status: "FINISHED", finished: 10, postponed: 0, future: 0, live: 0 } },
  { round: 21, lifecycle: { status: "PARTIAL", finished: 6, postponed: 3, future: 1, live: 0 } },
]).round, 20);

const noPick = buildRoundHighlightsModel({
  round: 2,
  games: games.filter(game => game.rodada === 2),
  picks: [],
  participants,
  selectedParticipantId: "caio-id",
  ...dependencies,
});
assert.equal(noPick.facts.group.length, 0);
assert.equal(noPick.facts.personal.find(fact => fact.key === "personal-round-performance").evidence.points, 0);
assert.equal(noPick.facts.personal.find(fact => fact.key === "personal-round-performance").evidence.comparison, "insufficient");

const empty = buildRoundHighlightsModel({
  round: 99,
  games,
  picks,
  participants,
  selectedParticipantId: "ana-id",
  ...dependencies,
});
assert.equal(empty.status, "empty");
assert.equal(empty.isProvisional, true);
assert.deepEqual(empty.provenance.scorableGameIds, []);

assert.throws(() => buildRoundHighlightsModel({ round: 2 }), /isScorableGame/);

console.log("Motor de destaques da rodada verificado com sucesso.");
