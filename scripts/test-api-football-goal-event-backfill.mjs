import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGoalEventBackfillArtifact, GOAL_EVENT_BACKFILL, persistGoalEventBackfill,
  verifyGoalEventBackfillArtifact } from "../src/sports-data/api-football-event-backfill.mjs";

const observedAt = "2026-09-08T20:00:00.000Z";
const canonicalGames = Array.from({ length: 10 }, (_, index) => ({
  id_jogo: 100 + index, rodada: 26, status: "encerrado", gols_casa: 1, gols_fora: 0,
  api_football_id: 1000 + index, api_football_time_casa_id: 10 + index, api_football_time_fora_id: 30 + index,
}));
const providerGames = canonicalGames.map((game, index) => ({
  providerFixtureId: game.api_football_id, competitionProviderId: 71, season: 2026, roundNumber: 26,
  home: { providerTeamId: game.api_football_time_casa_id }, away: { providerTeamId: game.api_football_time_fora_id },
  score: { home: 1, away: 0 }, status: { isFinal: true, isLive: false },
  eventObservation: { available: true, valid: true },
  events: [{ providerEventKey: `goal-${index}`, elapsed: 10 + index, extra: null,
    teamProviderId: game.api_football_time_casa_id, playerProviderId: 500 + index,
    playerName: `Autor ${index + 1}`, typeRaw: "Goal", detailRaw: "Normal Goal" }],
}));
const artifact = buildGoalEventBackfillArtifact({ canonicalGames, providerGames, observation: {
  dailyLimit: 7500, dailyRemaining: 6400, minuteLimit: 300, minuteRemaining: 289,
}, observedAt });
assert.equal(artifact.manifest.round, 26);
assert.equal(artifact.manifest.gameCount, 10);
assert.equal(artifact.manifest.goalCount, 10);
assert.match(artifact.manifest.manifestHash, /^[0-9a-f]{64}$/);
assert.equal(verifyGoalEventBackfillArtifact({ artifact, canonicalGames,
  approvedHash: artifact.manifest.manifestHash, confirmation: GOAL_EVENT_BACKFILL.confirmation }), true);
assert.throws(() => verifyGoalEventBackfillArtifact({ artifact, canonicalGames,
  approvedHash: "0".repeat(64), confirmation: GOAL_EVENT_BACKFILL.confirmation }), /hash_not_approved/);
const wrongScope = structuredClone(artifact);
wrongScope.manifest.round = 25;
assert.throws(() => verifyGoalEventBackfillArtifact({ artifact: wrongScope, canonicalGames,
  approvedHash: wrongScope.manifest.manifestHash, confirmation: GOAL_EVENT_BACKFILL.confirmation }), /manifest_scope_invalid/);
assert.throws(() => buildGoalEventBackfillArtifact({ canonicalGames: canonicalGames.slice(1), providerGames, observedAt }), /game_count_unexpected/);
assert.throws(() => buildGoalEventBackfillArtifact({ canonicalGames, providerGames: [
  { ...providerGames[0], score: { home: 2, away: 0 } }, ...providerGames.slice(1),
], observedAt }), /events_invalid/);

const writes = [];
const supabase = { from(table) {
  assert.equal(table, "eventos_partida_cache");
  return {
    select: () => ({ in: async () => ({ data: [], error: null }) }),
    upsert: async (rows, options) => { writes.push({ table, rows, options }); return { error: null }; },
  };
} };
const result = await persistGoalEventBackfill({ supabase, artifact, canonicalGames,
  approvedHash: artifact.manifest.manifestHash, confirmation: GOAL_EVENT_BACKFILL.confirmation });
assert.deepEqual(result, { ok: true, round: 26, rows: 10, unchanged: 0 });
assert.equal(writes.length, 1);
assert.equal(writes[0].rows.length, 10);
assert.equal(writes[0].options.onConflict, "id_jogo");

const source = readFileSync(new URL("./backfill-api-football-goal-events.mjs", import.meta.url), "utf8");
assert.match(source, /const apply = process\.argv\.includes\("--apply"\)/);
assert.match(source, /round26_backfill_artifact_required/);
assert.match(source, /daily_reserve_reached/);
assert.match(source, /minute_reserve_reached/);
assert.doesNotMatch(source, /from\("jogos"\)\.upsert|from\("palpites"\).*upsert/);

console.log("Backfill protegido dos eventos da Rodada 26 verificado com sucesso.");
