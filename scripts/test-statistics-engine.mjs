import assert from "node:assert/strict";
import { classifyStatisticsGames } from "../js/statistics-engine.js";

const games = [
  { id_jogo: 1, status: "encerrado", inicio: "2026-01-01T10:00:00Z", gols_casa: 1, gols_fora: 0 },
  { id_jogo: 2, status: "encerrado", inicio: "2026-01-01T12:00:00Z", gols_casa: 0, gols_fora: 0 },
  { id_jogo: 3, status: "agendado", inicio: "2099-01-01T10:00:00Z" },
  { id_jogo: 4, status: "adiado", inicio: "2026-01-02T10:00:00Z" },
  { id_jogo: 5, status: "cancelado", inicio: "2026-01-02T12:00:00Z" },
  { id_jogo: 6, status: "ao vivo", inicio: "2026-01-03T10:00:00Z" },
];
const picks = [{ id_jogo: 1 }, { id_jogo: 3 }, { id_jogo: 6 }];
const result = classifyStatisticsGames({
  games,
  picks,
  isScorableGame: game => game.status === "encerrado" && Number.isFinite(Number(game.gols_casa)) && Number.isFinite(Number(game.gols_fora)),
  isLocked: game => game.status === "encerrado" || game.status === "cancelado" || game.status === "ao vivo",
  gameStatusDisplay: game => ({
    key: game.status === "adiado" ? "postponed" : game.status === "cancelado" ? "cancelled" : game.status === "ao vivo" ? "live" : game.status === "encerrado" ? "finished" : "future",
  }),
});

assert.equal(result.metrics.completedEligible, 2);
assert.equal(result.metrics.completedWithPick, 1);
assert.equal(result.metrics.missedCompleted, 1);
assert.equal(result.metrics.participationRate, 50);
assert.equal(result.metrics.openAvailable, 0);
assert.equal(result.metrics.openAlreadyPicked, 1);
assert.equal(result.metrics.awaitingResult, 1);
assert.equal(result.metrics.excluded, 2);
assert.equal(result.metrics.registeredPicks, 3);
assert.equal(result.metrics.activeSeasonGames, 4);
assert.equal(result.metrics.coveredSeasonGames, 3);
assert.equal(result.metrics.seasonCoverageRate, 75);
assert.equal(result.dataQuality.awaitingResult, 1);
assert.equal(result.dataQuality.postponed, 1);
assert.equal(result.dataQuality.cancelled, 1);
assert.equal(result.dataQuality.invalid, 0);
assert.equal(result.dataQuality.hasAttention, true);
assert.equal(result.dataQuality.level, "info");
console.log("Motor estatístico verificado com sucesso.");
