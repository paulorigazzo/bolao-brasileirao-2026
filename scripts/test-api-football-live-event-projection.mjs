import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fixture from "../fixtures/api-football/fixture-1492340.sanitized.json" with { type: "json" };
import { normalizeApiFootballFixtureEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { buildApiFootballEventProjectionCandidates } from "../netlify/functions/_api-football-official.mjs";

const observedAt = "2026-09-12T01:47:02.020Z";
const detailed = normalizeApiFootballFixtureEnvelope(fixture, { requestedFixtureId: 1492340, observedAt });
assert.equal(detailed.observation.responseValid, true);

const summaryPayload = structuredClone(fixture);
delete summaryPayload.response[0].events;
const summary = normalizeApiFootballFixtureEnvelope(summaryPayload, { requestedFixtureId: 1492340, observedAt });
assert.equal(summary.game.eventObservation.available, false);

const canonical = {
  id_jogo: 555004,
  api_football_id: 1492340,
  api_football_time_casa_id: detailed.game.home.providerTeamId,
  api_football_time_fora_id: detailed.game.away.providerTeamId,
};
const summaryByFixture = new Map([[1492340, summary.game]]);
const detailedByFixture = new Map([[1492340, detailed.game]]);

const [withoutDetails] = buildApiFootballEventProjectionCandidates([canonical], summaryByFixture, new Map(), observedAt);
assert.equal(withoutDetails.eligible, false);
assert.equal(withoutDetails.reason, "events_unavailable");

const [withDetails] = buildApiFootballEventProjectionCandidates([canonical], summaryByFixture, detailedByFixture, observedAt);
assert.equal(withDetails.eligible, true);
assert.equal(withDetails.row.id_jogo, 555004);
assert.equal(withDetails.row.id_externo, 1492340);
assert.ok(withDetails.row.eventos.some((event) => event.typeRaw === "Goal" && event.playerName && event.elapsed !== null));

const inconsistentGame = structuredClone(detailed.game);
inconsistentGame.events = inconsistentGame.events.filter((event) => event.typeRaw !== "Goal").slice(0, 1);
const [inconsistent] = buildApiFootballEventProjectionCandidates(
  [canonical], summaryByFixture, new Map([[1492340, inconsistentGame]]), observedAt,
);
assert.equal(inconsistent.eligible, false);
assert.equal(inconsistent.reason, "goal_count_mismatch");

const syncSource = readFileSync(new URL("../netlify/functions/_api-football-official.mjs", import.meta.url), "utf8");
assert.match(syncSource, /requestImpl\(`\/fixtures\?ids=\$\{detailFixtureIds\.join\("-"\)\}`\)/);
assert.match(syncSource, /apiCalls: 1 \+ detailCalls/);
assert.ok(
  syncSource.indexOf("detailedProvidersByFixture = new Map")
    < syncSource.indexOf("const eventCandidates = buildApiFootballEventProjectionCandidates"),
);
assert.match(syncSource, /eventProjection: \{ updated:[\s\S]*skippedReasons: \[\.\.\.new Set\(eventSkipped\)\]/);

console.log("Eventos ao vivo verificados: resposta detalhada priorizada, resumo sem eventos tolerado e inconsistência bloqueada.");
