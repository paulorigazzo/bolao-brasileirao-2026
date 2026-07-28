import assert from "node:assert/strict";
import { analyzePredictionProfile, analyzeRankingHistory, analyzeRoundPerformance, classifyStatisticsGames } from "../js/statistics-engine.js";

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


const roundAnalysis = analyzeRoundPerformance({
  entries: [
    { game: { rodada: 1 }, score: 0 },
    { game: { rodada: 1 }, score: 0 },
    { game: { rodada: 2 }, score: 0 },
    { game: { rodada: 2 }, score: 5 },
    { game: { rodada: 3 }, score: 10 },
    { game: { rodada: 3 }, score: 10 },
    { game: { rodada: 4 }, score: 10 },
    { game: { rodada: 4 }, score: 5 },
  ],
  pointsForEntry: entry => entry.score,
});
assert.equal(roundAnalysis.rounds.length, 4);
assert.equal(roundAnalysis.bestRound.round, 3);
assert.equal(roundAnalysis.bestRound.points, 20);
assert.equal(roundAnalysis.bestRound.exact, 2);
assert.equal(roundAnalysis.trend, "up");
assert.ok(roundAnalysis.recentAverage > roundAnalysis.previousAverage);


const predictionProfile = analyzePredictionProfile({
  entries: [
    { game: { gols_casa: 2, gols_fora: 0, time_casa: "Palmeiras", time_fora: "Santos" }, score: 10 },
    { game: { gols_casa: 1, gols_fora: 1, time_casa: "Santos", time_fora: "Bahia" }, score: 0 },
    { game: { gols_casa: 0, gols_fora: 2, time_casa: "Bahia", time_fora: "Palmeiras" }, score: 5 },
    { game: { gols_casa: 3, gols_fora: 1, time_casa: "Palmeiras", time_fora: "Bahia" }, score: 3 },
  ],
  pointsForEntry: entry => entry.score,
});
assert.equal(predictionProfile.scenarios.find(item => item.key === "home").games, 2);
assert.equal(predictionProfile.scenarios.find(item => item.key === "home").rate, 100);
assert.equal(predictionProfile.scenarios.find(item => item.key === "draw").rate, 0);
assert.equal(predictionProfile.strongestScenario.key, "home");
assert.equal(predictionProfile.bestTeam.name, "Palmeiras");
assert.equal(predictionProfile.bestTeam.points, 18);
assert.equal(predictionProfile.challengeTeam.name, "Bahia");
assert.equal(predictionProfile.hasEnoughData, true);


const rankingHistory = analyzeRankingHistory({
  games: [
    { id_jogo: 11, rodada: 1, status: "encerrado" },
    { id_jogo: 12, rodada: 2, status: "encerrado" },
    { id_jogo: 13, rodada: 3, status: "encerrado" },
  ],
  picks: [
    { id_jogo: 11, usuario: "Paulo", score: 3 },
    { id_jogo: 11, usuario: "Gustavo", score: 10 },
    { id_jogo: 12, usuario: "Paulo", score: 10 },
    { id_jogo: 12, usuario: "Gustavo", score: 0 },
    { id_jogo: 13, usuario: "Paulo", score: 0 },
    { id_jogo: 13, usuario: "Gustavo", score: 5 },
  ],
  participantNames: ["Paulo", "Gustavo", "Guilherme"],
  selectedParticipant: "Paulo",
  isScorableGame: game => game.status === "encerrado",
  pointsForPick: pick => pick.score,
});
assert.equal(rankingHistory.rounds.length, 3);
assert.equal(rankingHistory.selectedSeries.length, 3);
assert.equal(rankingHistory.selectedSeries[0].position, 2);
assert.equal(rankingHistory.selectedSeries[1].position, 1);
assert.equal(rankingHistory.summary.bestPosition, 1);
assert.equal(rankingHistory.summary.worstPosition, 2);
assert.equal(rankingHistory.summary.biggestClimb.places, 1);
assert.equal(rankingHistory.summary.currentPoints, 13);
assert.equal(rankingHistory.summary.participantCount, 3);

console.log("Motor estatístico verificado com sucesso.");
