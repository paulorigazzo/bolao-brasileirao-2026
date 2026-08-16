import assert from "node:assert/strict";
import { assessSportsDataFreshness, SPORTS_DATA_DELAY_MINUTES } from "../netlify/functions/_sports-data-health.mjs";

const now = new Date("2026-08-16T21:00:00.000Z");
const result = assessSportsDataFreshness([
  { id_jogo: 1, inicio: "2026-08-16T20:00:00.000Z", status: "agendado", time_casa: "Santos", time_fora: "Vasco" },
  { id_jogo: 2, inicio: "2026-08-16T20:50:00.000Z", status: "agendado", time_casa: "Bahia", time_fora: "Sport" },
  { id_jogo: 3, inicio: "2026-08-16T19:00:00.000Z", status: "encerrado", time_casa: "Mineiro", time_fora: "Paranaense" },
  { id_jogo: 4, inicio: "2026-08-16T10:00:00.000Z", status: "agendado", time_casa: "Ceará", time_fora: "Remo" },
], now);

assert.equal(SPORTS_DATA_DELAY_MINUTES, 30);
assert.equal(result.status, "delayed");
assert.equal(result.delayedCount, 1);
assert.equal(result.delayedGames[0].id, 1);
assert.equal(assessSportsDataFreshness([], now).status, "current");
console.log("Saúde dos dados esportivos verificada.");
