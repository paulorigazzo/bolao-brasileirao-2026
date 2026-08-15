import assert from "node:assert/strict";
import { FOOTBALL_API_BASE } from "../netlify/functions/_constants.mjs";
import { matchDetailUrl, needsLiveMatchDetail, normalizeMatch, selectLiveMatchDetails } from "../netlify/functions/_sync-shared.mjs";

assert.equal(
  matchDetailUrl(123456),
  `${FOOTBALL_API_BASE}/matches/123456`,
);
assert.equal(
  matchDetailUrl("789"),
  `${FOOTBALL_API_BASE}/matches/789`,
);

assert.equal(needsLiveMatchDetail({ status: "IN_PLAY" }), true);
assert.equal(needsLiveMatchDetail({ status: "PAUSED" }), true);
assert.equal(needsLiveMatchDetail({ status: "LIVE" }), true);
assert.equal(needsLiveMatchDetail({ status: "TIMED" }), false);
assert.equal(needsLiveMatchDetail({ status: "FINISHED" }), false);

const limitedDetails = selectLiveMatchDetails([
  ...Array.from({ length: 9 }, (_, index) => ({ id: index + 1, status: "IN_PLAY" })),
  { id: 10, status: "TIMED" },
], 8, 1);
assert.equal(limitedDetails.selected.length, 7);
assert.equal(limitedDetails.skipped, 2);
assert.deepEqual(limitedDetails.selected.map((match) => match.id), [1, 2, 3, 4, 5, 6, 7]);

const baseMatch = {
  id: 123456,
  matchday: 23,
  utcDate: "2026-08-15T21:30:00Z",
  status: "IN_PLAY",
  homeTeam: { name: "Paranaense" },
  awayTeam: { name: "Bragantino" },
  score: { fullTime: { home: 0, away: 0 } },
};

const detailWithClock = normalizeMatch({ ...baseMatch, minute: 17, injuryTime: null });
assert.equal(detailWithClock.minuto, 17);
assert.equal(detailWithClock.acrescimos, null);

const detailWithoutClock = normalizeMatch(baseMatch);
assert.equal(detailWithoutClock.minuto, null);
assert.equal(detailWithoutClock.acrescimos, null);

console.log("Detalhe individual de resultado e relógio oficial verificado com sucesso.");
