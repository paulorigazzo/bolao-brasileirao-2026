import assert from "node:assert/strict";
import { normalizedTeamKey, reconcileApiFootballSeason } from "../src/sports-data/api-football-reconciliation.mjs";

const canonical = [
  { id_jogo: 1, rodada: 1, time_casa: "Mineiro", time_fora: "Vitória", inicio: "2026-01-28T22:00:00Z" },
  { id_jogo: 2, rodada: 1, time_casa: "Paranaense", time_fora: "Grêmio", inicio: "2026-01-29T00:00:00Z" },
  { id_jogo: 3, rodada: 1, time_casa: "Bragantino", time_fora: "Clube do Remo", inicio: "2026-01-29T22:00:00Z" },
];
const provider = [
  { providerFixtureId: 101, roundNumber: 1, kickoffAt: "2026-01-28T22:10:00Z", home: { providerTeamId: 11, name: "Atletico-MG" }, away: { providerTeamId: 12, name: "Vitoria" } },
  { providerFixtureId: 102, roundNumber: 1, kickoffAt: "2026-01-29T00:00:00Z", home: { providerTeamId: 13, name: "Atletico Paranaense" }, away: { providerTeamId: 14, name: "Gremio" } },
  { providerFixtureId: 103, roundNumber: 1, kickoffAt: "2026-01-29T22:00:00Z", home: { providerTeamId: 15, name: "RB Bragantino" }, away: { providerTeamId: 16, name: "Remo" } },
];

assert.equal(normalizedTeamKey("Vitória"), normalizedTeamKey("Vitoria"));
assert.equal(normalizedTeamKey("Paranaense"), normalizedTeamKey("Atletico Paranaense"));
assert.equal(normalizedTeamKey("Chapecoense"), normalizedTeamKey("Chapecoense-sc"));
const result = reconcileApiFootballSeason(canonical, provider);
assert.equal(result.complete, true);
assert.equal(result.mappedCount, 3);
assert.equal(result.maximumKickoffDeltaMinutes, 10);
assert.match(result.reconciliationHash, /^[0-9a-f]{64}$/);
assert.equal(result.aliasesUsed.length, 6);

const late = structuredClone(provider);
late[0].kickoffAt = "2026-01-28T22:31:00Z";
const lateResult = reconcileApiFootballSeason(canonical, late);
assert.equal(lateResult.complete, false);
assert.equal(lateResult.blocked[0].reason, "kickoff_out_of_tolerance");

const reversed = structuredClone(provider);
[reversed[0].home, reversed[0].away] = [reversed[0].away, reversed[0].home];
assert.equal(reconcileApiFootballSeason(canonical, reversed).blocked[0].reason, "identity_not_found");

const duplicate = [...provider, structuredClone(provider[0])];
assert.ok(reconcileApiFootballSeason(canonical, duplicate).structuralErrors.includes("provider_fixture_ids_duplicated"));

const conflictCanonical = structuredClone(canonical);
conflictCanonical[0].api_football_id = 999;
assert.equal(reconcileApiFootballSeason(conflictCanonical, provider).blocked[0].reason, "existing_mapping_conflict");

assert.throws(() => reconcileApiFootballSeason(canonical, provider, { toleranceMinutes: -1 }), /reconciliation_tolerance_invalid/);
console.log("Reconciliação API-Football verificada: aliases explícitos, horário, mando, duplicidade, conflito e hash.");
