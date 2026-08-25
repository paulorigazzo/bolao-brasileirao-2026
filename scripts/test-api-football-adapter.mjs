import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeApiFootballFixtureEnvelope,
  normalizeApiFootballFixturesEnvelope,
  normalizeApiFootballStandingsEnvelope,
  normalizeApiFootballStatus,
} from "../src/sports-data/api-football-adapter.mjs";
import { assessGameRegression } from "../src/sports-data/contract.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/api-football/fixture-1492340.sanitized.json", import.meta.url)));
const standingsFixture = JSON.parse(await readFile(new URL("../fixtures/api-football/standings-brasileirao.synthetic.json", import.meta.url)));
const clone = (value) => structuredClone(value);
const options = {
  requestedFixtureId: 1492340,
  observedAt: "2026-08-25T00:53:15.045Z",
  httpStatus: 200,
  durationMs: 321,
  headers: {
    "x-ratelimit-requests-limit": "100",
    "x-ratelimit-requests-remaining": "91",
    "x-ratelimit-limit": "10",
    "x-ratelimit-remaining": "9",
  },
};

const normalized = normalizeApiFootballFixtureEnvelope(fixture, options);
assert.equal(normalized.observation.responseValid, true);
assert.deepEqual(
  [normalized.game.providerFixtureId, normalized.game.roundNumber, normalized.game.status.normalized],
  [1492340, 24, "finished"],
);
assert.deepEqual(normalized.game.clock, { elapsed: 90, extra: 6, period: "secondHalf", isOfficial: true, displayBase: 90 });
assert.deepEqual([normalized.game.score.home, normalized.game.score.away], [2, 3]);
assert.equal(normalized.game.events.length, 5);
assert.deepEqual(
  [normalized.observation.dailyLimit, normalized.observation.dailyRemaining, normalized.observation.minuteLimit, normalized.observation.minuteRemaining],
  [100, 91, 10, 9],
);

const batchFixture = clone(fixture);
batchFixture.response.push(clone(fixture.response[0]));
batchFixture.response[1].fixture.id = 1492341;
batchFixture.results = 2;
const batch = normalizeApiFootballFixturesEnvelope(batchFixture, { ...options, requestedFixtureId: undefined, expectedCount: 2 });
assert.equal(batch.observation.responseValid, true);
assert.deepEqual(batch.games.map((game) => game.providerFixtureId), [1492340, 1492341]);
assert.ok(normalizeApiFootballFixturesEnvelope(batchFixture, { ...options, expectedCount: 380 }).observation.errors.includes("fixture_count_unexpected"));
const duplicatedBatch = clone(batchFixture);
duplicatedBatch.response[1].fixture.id = 1492340;
assert.ok(normalizeApiFootballFixturesEnvelope(duplicatedBatch, options).observation.errors.includes("fixture_ids_duplicated"));

const statusCases = {
  TBD: "scheduled", NS: "scheduled", "1H": "live", "2H": "live", ET: "live",
  P: "live", LIVE: "live", HT: "halftime", BT: "halftime", PST: "postponed",
  SUSP: "postponed", INT: "postponed", CANC: "cancelled", ABD: "cancelled",
  FT: "finished", AET: "finished", PEN: "finished", AWD: "finished", WO: "finished",
};
for (const [raw, expected] of Object.entries(statusCases)) {
  assert.equal(normalizeApiFootballStatus({ short: raw }).normalized, expected, raw);
}
assert.equal(normalizeApiFootballStatus({ short: "MYSTERY" }).isKnown, false);

const unknown = clone(fixture);
unknown.response[0].fixture.status.short = "MYSTERY";
assert.ok(normalizeApiFootballFixtureEnvelope(unknown, options).observation.errors.includes("unknown_fixture_status"));

for (const mutate of [
  (value) => { value.errors = { token: "sanitized provider error" }; },
  (value) => { value.paging.total = 2; },
  (value) => { value.results = 2; },
]) {
  const bad = clone(fixture);
  mutate(bad);
  assert.equal(normalizeApiFootballFixtureEnvelope(bad, options).observation.responseValid, false);
}
assert.ok(normalizeApiFootballFixtureEnvelope(fixture, { ...options, requestedFixtureId: 1 }).observation.errors.includes("requested_fixture_not_unique"));

const mismatch = clone(fixture);
mismatch.response[0].score.fulltime.home = 1;
assert.ok(normalizeApiFootballFixtureEnvelope(mismatch, options).observation.errors.includes("final_score_mismatch"));
const missingFinal = clone(fixture);
missingFinal.response[0].goals.home = null;
assert.ok(normalizeApiFootballFixtureEnvelope(missingFinal, options).observation.errors.includes("final_score_missing"));
const missingFinalSnapshot = clone(fixture);
missingFinalSnapshot.response[0].score.fulltime.home = null;
assert.ok(normalizeApiFootballFixtureEnvelope(missingFinalSnapshot, options).observation.errors.includes("final_score_snapshot_missing"));
const noEvents = clone(fixture);
noEvents.response[0].events = [];
const noEventsResult = normalizeApiFootballFixtureEnvelope(noEvents, options);
assert.equal(noEventsResult.observation.responseValid, true);
assert.ok(noEventsResult.observation.warnings.includes("events_missing"));

const previous = normalized.game;
for (const [mutation, expected] of [
  [(game) => { game.providerFixtureId = 7; }, "game_identity_changed"],
  [(game) => { game.status.normalized = "live"; }, "finished_status_regression"],
  [(game) => { game.score.home = 1; }, "score_regression"],
  [(game) => { game.clock.elapsed = 89; }, "clock_regression"],
]) {
  const current = clone(previous);
  mutation(current);
  assert.ok(assessGameRegression(previous, current).errors.includes(expected));
}
const eventsGone = clone(previous);
eventsGone.events = [];
assert.equal(assessGameRegression(previous, eventsGone).preservePreviousEvents, true);

const table = normalizeApiFootballStandingsEnvelope(standingsFixture, { observedAt: options.observedAt, httpStatus: 200 });
assert.equal(table.observation.responseValid, true);
assert.equal(table.standings.teamCount, 20);
for (const mutate of [
  (value) => { value.response[0].league.standings[0][0].all.played = 23; },
  (value) => { value.response[0].league.standings[0][0].goalsDiff = 999; },
  (value) => { value.response[0].league.standings[0][1].rank = 1; },
  (value) => { value.response[0].league.standings[0][1].team.id = 9001; },
  (value) => { value.response[0].league.standings[0].pop(); },
  (value) => { value.response[0].league.standings.push([]); },
]) {
  const bad = clone(standingsFixture);
  mutate(bad);
  assert.equal(normalizeApiFootballStandingsEnvelope(bad, { observedAt: options.observedAt }).observation.responseValid, false);
}

const adapterSource = await readFile(new URL("../src/sports-data/api-football-adapter.mjs", import.meta.url), "utf8");
const contractSource = await readFile(new URL("../src/sports-data/contract.mjs", import.meta.url), "utf8");
for (const forbidden of [/\bfetch\s*\(/, /process\.env/, /supabase/i, /\.from\s*\(/, /\b(?:insert|upsert|update|delete)\s*\(/]) {
  assert.equal(forbidden.test(adapterSource + contractSource), false, `efeito externo proibido: ${forbidden}`);
}

console.log("Adaptador puro API-Football verificado: contrato, estados, placar, regressões, eventos e classificação.");
