import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fixture from "../fixtures/api-football/fixture-1492340.sanitized.json" with { type: "json" };
import standings from "../fixtures/api-football/standings-brasileirao.synthetic.json" with { type: "json" };
import teams from "../fixtures/api-football/teams-brasileirao-2026.json" with { type: "json" };
import { normalizeApiFootballFixtureEnvelope, normalizeApiFootballStandingsEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { apiFootballClassificationResult, apiFootballGameForCanonical, scopeApiFootballSyncGames } from "../netlify/functions/_api-football-official.mjs";
import { buildApiFootballCanonicalTeamCatalog, canonicalizeApiFootballClassificationResult, canonicalizeApiFootballStandings } from "../src/sports-data/api-football-team-catalog.mjs";
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
const canonicalTeams = [];
for (let index = 0; index < normalizedStandings.standings.table.length; index += 2) {
  const home = normalizedStandings.standings.table[index];
  const away = normalizedStandings.standings.table[index + 1];
  canonicalTeams.push({
    time_casa: `Clube canônico ${index + 1}`,
    time_fora: `Clube canônico ${index + 2}`,
    api_football_time_casa_id: home.providerTeamId,
    api_football_time_fora_id: away.providerTeamId,
  });
}
const classification = apiFootballClassificationResult(normalizedStandings.standings, canonicalTeams, "2026-08-25T00:01:00Z");
assert.equal(classification.result.table.length, 20);
assert.equal(classification.result.table[0].team, "Clube canônico 1");
assert.notEqual(classification.result.table[0].team, normalizedStandings.standings.table[0].teamName);
assert.equal(classification.result.table[0].crest,
  `/assets/clubs/api-football/${normalizedStandings.standings.table[0].providerTeamId}.png`);
assert.equal(classification.result.table.some((row) => row.crest.includes("media.api-sports.io")), false);
assert.equal(buildApiFootballCanonicalTeamCatalog(canonicalTeams).size, 20);
assert.throws(() => canonicalizeApiFootballStandings(normalizedStandings.standings, canonicalTeams.slice(1)), /api_football_canonical_team_missing/);
assert.throws(() => canonicalizeApiFootballStandings(normalizedStandings.standings, [
  ...canonicalTeams,
  { time_casa: "Nome conflitante", api_football_time_casa_id: canonicalTeams[0].api_football_time_casa_id },
]), /api_football_canonical_team_conflict/);
assert.throws(() => canonicalizeApiFootballStandings(normalizedStandings.standings, [
  ...canonicalTeams,
  { time_casa: "Clube inesperado", api_football_time_casa_id: 999999 },
]), /api_football_canonical_team_unexpected/);

const observedDivergences = teams.map((team) => [team.id, team.providerName, team.canonicalName]);
assert.deepEqual(
  teams.filter((team) => team.canonicalName !== team.displayName).map((team) => [team.canonicalName, team.displayName]),
  [["Paranaense", "Athletico-PR"], ["Mineiro", "Atlético-MG"]],
);
const divergenceStanding = {
  ...normalizedStandings.standings,
  table: observedDivergences.map(([providerTeamId, teamName], index) => ({
    ...normalizedStandings.standings.table[index], providerTeamId, teamName,
  })),
};
const divergenceGames = [];
for (let index = 0; index < observedDivergences.length; index += 2) {
  const home = observedDivergences[index];
  const away = observedDivergences[index + 1];
  divergenceGames.push({
    time_casa: home[2],
    api_football_time_casa_id: home[0],
    ...(away ? { time_fora: away[2], api_football_time_fora_id: away[0] } : {}),
  });
}
const canonicalDivergences = canonicalizeApiFootballStandings(divergenceStanding, divergenceGames);
assert.deepEqual(canonicalDivergences.table.map((row) => row.teamName), observedDivergences.map((entry) => entry[2]));
assert.deepEqual(
  canonicalDivergences.table.map(({ teamName: _teamName, ...row }) => row),
  divergenceStanding.table.map(({ teamName: _teamName, ...row }) => row),
);
const cachedDivergences = canonicalizeApiFootballClassificationResult({
  table: divergenceStanding.table.map((row) => ({ teamId: row.providerTeamId, team: row.teamName, points: row.points })),
}, divergenceGames);
assert.deepEqual(cachedDivergences.table.map((row) => row.team), observedDivergences.map((entry) => entry[2]));
assert.deepEqual(cachedDivergences.table.map((row) => row.points), divergenceStanding.table.map((row) => row.points));
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
const appSource = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(syncSource, /officialSportsDataProvider\(\)[\s\S]*syncApiFootballGames/);
assert.match(classificationSource, /officialSportsDataProvider\(\)[\s\S]*apiFootballClassification/);
assert.match(classificationSource, /api_football_time_casa_id,api_football_time_fora_id/);
assert.match(classificationSource, /providerClassificationSnapshotId/);
assert.match(diagnosticSource, /officialSportsDataProvider: provider/);
assert.match(appSource, /function standingsTeamExpandedContent\(row\)\{[\s\S]*const displayName=teamDisplayName\(row\.team\)[\s\S]*Ver jogos do \$\{escapeHtml\(displayName\)\}/);
assert.match(appSource, /function renderStandings\(\)\{[\s\S]*const displayName=teamDisplayName\(row\.team\)[\s\S]*standings-mobile-team[\s\S]*escapeHtml\(displayName\)[\s\S]*standings-team[\s\S]*escapeHtml\(displayName\)/);
assert.match(appSource, /const canonical=\{CAM:"Atlético-MG",CAP:"Athletico-PR"\}\[teamAbbreviation\(name\)\]/);
assert.match(appSource, /function teamNamesDisplayText\(value\)\{[\s\S]*Mineiro[\s\S]*Atlético-MG[\s\S]*Paranaense[\s\S]*Athletico-PR/);
assert.doesNotMatch(appSource, /escapeHtml\((?:g|game|next|nextGame|occurrence)\.time_(?:casa|fora)\)/);
assert.doesNotMatch(appSource, /\$\{(?:g|game|next|nextGame|occurrence)\.time_(?:casa|fora)\}/);
assert.doesNotMatch(appSource, /(?:Time do coração|Tema do torcedor|Meu desempenho com o|ver detalhes do) \$\{team\.name\}/);
assert.equal((appSource.match(/escapeHtml\(team\.name\)/g) || []).length, 1);
assert.match(appSource, /data-team="\$\{escapeHtml\(team\.name\)\}"/);

console.log("Fundação de corte controlado da API-Football verificada com sucesso.");
