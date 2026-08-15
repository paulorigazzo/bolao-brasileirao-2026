import assert from "node:assert/strict";
import { officialLiveMatchMinute } from "../js/live-match-minute.js";
import { normalizeMatch } from "../netlify/functions/_sync-shared.mjs";

assert.equal(officialLiveMatchMinute({ minuto: 37, acrescimos: null }),"37");
assert.equal(officialLiveMatchMinute({ minuto: 45, acrescimos: 3 }),"45+3");
assert.equal(officialLiveMatchMinute({ minuto: 46, acrescimos: 3 }),"46");
assert.equal(officialLiveMatchMinute({ minuto: null, acrescimos: null }),"");
assert.equal(officialLiveMatchMinute({ minuto: 200, acrescimos: 2 }),"");

const normalized=normalizeMatch({
  id: 1,
  matchday: 23,
  utcDate: "2026-08-15T19:30:00Z",
  status: "IN_PLAY",
  minute: 45,
  injuryTime: 2,
  homeTeam: { name: "Fluminense" },
  awayTeam: { name: "Palmeiras" },
  score: { fullTime: { home: 1, away: 1 } },
});

assert.equal(normalized.minuto,45);
assert.equal(normalized.acrescimos,2);
assert.equal(normalized.status,"em_andamento");

console.log("Relógio oficial das partidas ao vivo verificado com sucesso.");
