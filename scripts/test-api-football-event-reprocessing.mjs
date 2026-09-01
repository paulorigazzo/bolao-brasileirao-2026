import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeApiFootballFixturesEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { assertEventReprocessingApply, buildEventReprocessingManifest, EVENT_REPROCESSING, persistEventReprocessingPilot } from "../src/sports-data/api-football-event-reprocessing.mjs";

const envelope = JSON.parse(await readFile(new URL("../fixtures/api-football/fixture-1492340.sanitized.json", import.meta.url)));
envelope.response[0].league.round = "Regular Season - 25";
const provider = normalizeApiFootballFixturesEnvelope(envelope, { observedAt: "2026-09-01T12:00:00Z" }).games[0];
const canonical = Array.from({ length: 255 }, (_, index) => ({ id_jogo: index + 1, rodada: index < 10 ? 25 : 24,
  inicio: provider.kickoffAt, api_football_id: provider.providerFixtureId + index,
  api_football_time_casa_id: provider.home.providerTeamId, api_football_time_fora_id: provider.away.providerTeamId }));
const providers = canonical.map((game, index) => ({ ...provider, providerFixtureId: game.api_football_id,
  roundNumber: game.rodada, events: index ? [] : provider.events,
  eventObservation: index ? { available: true, count: 0, valid: true, warnings: [] } : provider.eventObservation }));
const pilotDates = ["2026-08-29T19:00:00Z", "2026-08-30T19:00:00Z", "2026-08-31T23:00:00Z"];
for (let index = 0; index < 10; index += 1) {
  canonical[index].inicio = pilotDates[index % pilotDates.length];
  providers[index].kickoffAt = canonical[index].inicio;
}
const observation = { dailyLimit: 7500, dailyRemaining: 7000, minuteLimit: 300, minuteRemaining: 299 };
const input = { canonicalGames: canonical, providerGames: providers, observation, observedAt: "2026-09-01T12:00:00Z" };
assert.equal(buildEventReprocessingManifest({ ...input, scope: "historical" }).gameCount, 255);
const pilot = buildEventReprocessingManifest({ ...input, scope: "round25" });
assert.equal(pilot.gameCount, 10);
assert.equal(buildEventReprocessingManifest({ ...input, observedAt: "2026-09-02T12:00:00Z", scope: "round25" }).manifestHash, pilot.manifestHash);
assert.equal(assertEventReprocessingApply({ scope: "round25", confirmation: EVENT_REPROCESSING.applyConfirmation,
  approvedHash: pilot.manifestHash, manifest: pilot }), true);
assert.throws(() => assertEventReprocessingApply({ scope: "historical", confirmation: EVENT_REPROCESSING.applyConfirmation,
  approvedHash: pilot.manifestHash, manifest: pilot }), /apply_scope_blocked/);
assert.throws(() => assertEventReprocessingApply({ scope: "round25", confirmation: EVENT_REPROCESSING.applyConfirmation,
  approvedHash: "0".repeat(64), manifest: pilot }), /manifest_changed/);
assert.throws(() => buildEventReprocessingManifest({ ...input, observation: { ...observation, dailyRemaining: 1500 },
  scope: "historical" }), /daily_reserve_reached/);

function fakeSupabase({ existing = [], rpcError = null } = {}) {
  const writes = [];
  return { writes,
    rpc(name, args) { writes.push({ rpc: name, args }); return Promise.resolve({ data: 1, error: rpcError }); },
    from(table) {
      if (table === "transicao_api_eventos_lotes") return { select: () => ({ in: () => ({ limit: async () => ({ data: existing, error: null }) }) }) };
      return {
        insert(value) { writes.push({ table, insert: value }); return { select: () => ({ single: async () => ({ data: { id: 91 }, error: null }) }) }; },
        update(value) { writes.push({ table, update: value }); return { eq: async () => ({ error: null }) }; },
      };
    },
  };
}
const database = fakeSupabase();
const persisted = await persistEventReprocessingPilot({ supabase: database, canonicalGames: canonical,
  providerGames: providers, observation, observedAt: input.observedAt, manifest: pilot,
  approvedHash: pilot.manifestHash, confirmation: EVENT_REPROCESSING.applyConfirmation, calls: 11 });
assert.deepEqual({ executions: persisted.executions, lots: persisted.lots, events: persisted.events },
  { executions: 3, lots: 10, events: provider.events.length });
assert.equal(database.writes.filter((write) => write.rpc === "registrar_lote_eventos_sombra").length, 10);
assert.equal(database.writes.some((write) => write.table === "jogos"), false);
assert.equal(database.writes.some((write) => write.table === "transicao_api_jogos"), false);
await assert.rejects(persistEventReprocessingPilot({ supabase: fakeSupabase({ existing: [{ id: 1 }] }),
  canonicalGames: canonical, providerGames: providers, observation, observedAt: input.observedAt, manifest: pilot,
  approvedHash: pilot.manifestHash, confirmation: EVENT_REPROCESSING.applyConfirmation }), /already_persisted/);
const failed = fakeSupabase({ rpcError: { message: "denied" } });
await assert.rejects(persistEventReprocessingPilot({ supabase: failed, canonicalGames: canonical,
  providerGames: providers, observation, observedAt: input.observedAt, manifest: pilot,
  approvedHash: pilot.manifestHash, confirmation: EVENT_REPROCESSING.applyConfirmation }), /rpc_failed/);
assert.equal(failed.writes.some((write) => write.update?.sucesso_sombra === false), true);
console.log("Reprocessamento 5B.4C verificado: 255 jogos em simulação e apply bloqueado fora do piloto.");
