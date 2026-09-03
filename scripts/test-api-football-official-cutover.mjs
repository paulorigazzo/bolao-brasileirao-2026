import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fixture from "../fixtures/api-football/fixture-1492340.sanitized.json" with { type: "json" };
import standings from "../fixtures/api-football/standings-brasileirao.synthetic.json" with { type: "json" };
import { normalizeApiFootballFixtureEnvelope, normalizeApiFootballStandingsEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { apiFootballClassificationResult, apiFootballGameForCanonical, scopeApiFootballSyncGames } from "../netlify/functions/_api-football-official.mjs";
import { officialSportsDataProvider, providerClassificationSnapshotId, SPORTS_DATA_PROVIDERS } from "../netlify/functions/_sports-data-provider.mjs";

assert.equal(officialSportsDataProvider({}), SPORTS_DATA_PROVIDERS.FOOTBALL_DATA);
assert.equal(officialSportsDataProvider({ SPORTS_DATA_OFFICIAL_PROVIDER: "api-football" }), SPORTS_DATA_PROVIDERS.API_FOOTBALL);
assert.throws(() => officialSportsDataProvider({ SPORTS_DATA_OFFICIAL_PROVIDER: "automatic" }), /sports_data_provider_invalid/);
assert.equal(providerClassificationSnapshotId("BSA-2026", SPORTS_DATA_PROVIDERS.FOOTBALL_DATA), "BSA-2026");
assert.equal(providerClassificationSnapshotId("BSA-2026", SPORTS_DATA_PROVIDERS.API_FOOTBALL), "BSA-2026:api-football");

const normalized = normalizeApiFootballFixtureEnvelope(fixture, { requestedFixtureId: 1492340, observedAt: "2026-08-25T00:00:00Z" });
assert.equal(normalized.observation.responseValid, true);
const canonical = {
  id_jogo: 554999, rodada: 24, time_casa: "Botafogo", time_fora: "Athletico-PR",
  local_partida: "Estádio preservado", time_casa_id: 1770, time_fora_id: 1766,
  time_casa_logo: "https://old.test/home.png", time_fora_logo: "https://old.test/away.png",
  api_football_id: 1492340, api_football_time_casa_id: normalized.game.home.providerTeamId,
  api_football_time_fora_id: normalized.game.away.providerTeamId,
};
const game = apiFootballGameForCanonical(normalized.game, canonical, "2026-08-25T00:01:00Z");
assert.equal(game.id_jogo, canonical.id_jogo);
assert.equal(game.fonte, "api-football");
assert.equal(game.time_casa, canonical.time_casa);
assert.equal(game.time_fora, canonical.time_fora);
assert.equal(game.time_casa_id, canonical.time_casa_id);
assert.equal(game.time_fora_id, canonical.time_fora_id);
assert.equal(game.status, "encerrado");
assert.equal(game.time_casa_logo, `/assets/clubs/api-football/${normalized.game.home.providerTeamId}.png`);
assert.equal(game.time_fora_logo, `/assets/clubs/api-football/${normalized.game.away.providerTeamId}.png`);

const normalizedStandings = normalizeApiFootballStandingsEnvelope(standings, { observedAt: "2026-08-25T00:01:00Z" });
const classification = apiFootballClassificationResult(normalizedStandings.standings, "2026-08-25T00:01:00Z");
assert.equal(classification.result.table.length, 20);
assert.equal(classification.result.table[0].crest,
  `/assets/clubs/api-football/${normalizedStandings.standings.table[0].providerTeamId}.png`);
assert.equal(classification.result.table.some((row) => row.crest.includes("media.api-sports.io")), false);
assert.throws(() => apiFootballGameForCanonical(normalized.game, { ...canonical, api_football_id: 1 }), /mapped_fixture_identity_conflict/);
assert.throws(() => apiFootballGameForCanonical(normalized.game, { ...canonical, api_football_time_casa_id: 1 }), /mapped_home_identity_conflict/);
assert.throws(() => apiFootballGameForCanonical(normalized.game, { ...canonical, api_football_time_fora_id: 1 }), /mapped_away_identity_conflict/);

const maintenanceScope = scopeApiFootballSyncGames([
  { id_jogo: 1, status: "encerrado" }, { id_jogo: 2, status: "agendado" },
  { id_jogo: 3, status: "em_andamento" }, { id_jogo: 4, status: "intervalo" },
  { id_jogo: 5, status: "adiado" }, { id_jogo: 6, status: "cancelado" },
]);
assert.deepEqual(maintenanceScope.map((game) => game.id_jogo), [2, 3, 4]);
assert.deepEqual(scopeApiFootballSyncGames([
  { id_jogo: 1, status: "encerrado" }, { id_jogo: 2, status: "agendado" },
], [1]).map((game) => game.id_jogo), [1]);

const syncSource = readFileSync(new URL("../netlify/functions/_sync-shared.mjs", import.meta.url), "utf8");
const classificationSource = readFileSync(new URL("../netlify/functions/classificacao-brasileirao.mjs", import.meta.url), "utf8");
const diagnosticSource = readFileSync(new URL("../netlify/functions/diagnostico-sistema.mjs", import.meta.url), "utf8");
assert.match(syncSource, /officialSportsDataProvider\(\)[\s\S]*syncApiFootballGames/);
assert.match(classificationSource, /officialSportsDataProvider\(\)[\s\S]*apiFootballClassification/);
assert.match(classificationSource, /providerClassificationSnapshotId/);
assert.match(diagnosticSource, /officialSportsDataProvider: provider/);

console.log("Fundação de corte controlado da API-Football verificada com sucesso.");
