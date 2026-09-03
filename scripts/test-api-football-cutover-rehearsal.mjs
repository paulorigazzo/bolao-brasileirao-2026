import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fixture from "../fixtures/api-football/fixture-1492340.sanitized.json" with { type: "json" };
import standings from "../fixtures/api-football/standings-brasileirao.synthetic.json" with { type: "json" };
import { runApiFootballCutoverRehearsal, simulateProviderRollback } from "../netlify/functions/_api-football-cutover-rehearsal.mjs";

const apiRows = Array.from({ length: 10 }, (_, index) => {
  const row = structuredClone(fixture.response[0]);
  row.fixture.id = 1492340 + index;
  row.fixture.date = `2026-09-${String(5 + index).padStart(2, "0")}T19:00:00+00:00`;
  row.league.round = "Regular Season - 26";
  row.teams.home.id = 100 + index * 2;
  row.teams.away.id = 101 + index * 2;
  return row;
});
const canonical = apiRows.map((row, index) => ({
  id_jogo: 600000 + index, rodada: 26, time_casa: `Casa ${index}`, time_fora: `Fora ${index}`,
  inicio: new Date(row.fixture.date).toISOString(), status: "encerrado", gols_casa: row.goals.home,
  gols_fora: row.goals.away, minuto: null, acrescimos: null, minuto_estimado: null,
  periodo_estimado: null, relogio_referencia_em: null, situacao_agendamento: "provisorio",
  fonte_agendamento: "football-data.org", agendamento_confirmado_em: null, data_base: null,
  local_partida: "Estádio", time_casa_id: 200 + index * 2, time_fora_id: 201 + index * 2,
  time_casa_logo: null, time_fora_logo: null, api_football_id: row.fixture.id,
  api_football_time_casa_id: row.teams.home.id, api_football_time_fora_id: row.teams.away.id,
}));
const picks = canonical.map((game, index) => ({ id_jogo: game.id_jogo, user_id: `user-${index}`,
  gols_casa: 1, gols_fora: 0 }));

function supabaseReadOnly() {
  const tables = { jogos: canonical, palpites: picks };
  return { from(table) { return { select() { return this; }, order() { return this; }, range(from, to) {
    return Promise.resolve({ data: structuredClone((tables[table] || []).slice(from, to + 1)), error: null });
  } }; } };
}

const oldMatches = canonical.map((game) => ({ id: game.id_jogo, matchday: 26, utcDate: game.inicio,
  status: "FINISHED", homeTeam: { id: game.time_casa_id, shortName: game.time_casa },
  awayTeam: { id: game.time_fora_id, shortName: game.time_fora }, score: { fullTime: { home: game.gols_casa, away: game.gols_fora } } }));
const oldTable = Array.from({ length: 20 }, (_, index) => ({ position: index + 1, team: { id: index + 1 },
  playedGames: 25, won: 10, draw: 5, lost: 10, points: 35, goalsFor: 30, goalsAgainst: 25, goalDifference: 5 }));
const apiFixtures = { ...fixture, results: 10, response: apiRows };
const responses = new Map([
  ["api-sports.io/fixtures", apiFixtures], ["api-sports.io/standings", standings],
  ["football-data.org/v4/competitions/BSA/matches", { matches: oldMatches }],
  ["football-data.org/v4/competitions/BSA/standings", { standings: [{ type: "TOTAL", table: oldTable }] }],
]);
const fetchImpl = async (url) => {
  const entry = [...responses].find(([part]) => String(url).includes(part));
  assert.ok(entry, `URL inesperada: ${url}`);
  return { ok: true, status: 200, headers: new Headers({ "x-ratelimit-requests-limit": "7500",
    "x-ratelimit-requests-remaining": "7400", "x-ratelimit-limit": "300", "x-ratelimit-remaining": "290" }),
    json: async () => structuredClone(entry[1]) };
};

const report = await runApiFootballCutoverRehearsal({ supabase: supabaseReadOnly(), fetchImpl,
  apiFootballKey: "test-key", footballDataToken: "test-token", round: 26,
  confirmation: "REHEARSE_API_FOOTBALL_CUTOVER", crestProbe: async () => ({ ok: true, clubs: 20 }),
  now: () => new Date("2026-09-01T21:00:00Z") });
assert.equal(report.ok, true);
assert.equal(report.canonicalGames, 10);
assert.equal(report.mappedGames, 10);
assert.equal(report.apiFootballGames, 10);
assert.equal(report.footballDataGames, 10);
assert.equal(report.apiFootballStandings, 20);
assert.equal(report.footballDataStandings, 20);
assert.deepEqual(report.localCrests, { ok: true, clubs: 20 });
assert.equal(report.writes, 0);
assert.equal(report.hashes.gamesBefore, report.hashes.gamesAfter);
assert.equal(report.hashes.picksBefore, report.hashes.picksAfter);
assert.match(report.reportHash, /^[0-9a-f]{64}$/);
assert.deepEqual(simulateProviderRollback().sequence, ["football-data.org", "api-football", "football-data.org"]);
await assert.rejects(() => runApiFootballCutoverRehearsal({ supabase: supabaseReadOnly(), fetchImpl,
  apiFootballKey: "test-key", footballDataToken: "test-token", round: 26, confirmation: "wrong",
  crestProbe: async () => ({ ok: true, clubs: 20 }) }), /rehearsal_confirmation_invalid/);
const lowQuotaFetch = async (url, options) => {
  const response = await fetchImpl(url, options);
  return { ...response, headers: new Headers({ "x-ratelimit-requests-limit": "7500",
    "x-ratelimit-requests-remaining": "1500", "x-ratelimit-limit": "300", "x-ratelimit-remaining": "290" }) };
};
await assert.rejects(() => runApiFootballCutoverRehearsal({ supabase: supabaseReadOnly(), fetchImpl: lowQuotaFetch,
  apiFootballKey: "test-key", footballDataToken: "test-token", round: 26,
  confirmation: "REHEARSE_API_FOOTBALL_CUTOVER", crestProbe: async () => ({ ok: true, clubs: 20 }) }), /api_football_daily_reserve_reached/);
await assert.rejects(() => runApiFootballCutoverRehearsal({ supabase: supabaseReadOnly(), fetchImpl,
  apiFootballKey: "test-key", footballDataToken: "test-token", round: 26,
  confirmation: "REHEARSE_API_FOOTBALL_CUTOVER", crestProbe: async () => ({ ok: false, clubs: 19 }) }),
  /api_football_local_crests_invalid/);

const rehearsalSource = readFileSync(new URL("../netlify/functions/_api-football-cutover-rehearsal.mjs", import.meta.url), "utf8");
const endpointSource = readFileSync(new URL("../netlify/functions/ensaiar-corte-api-football.mjs", import.meta.url), "utf8");
for (const source of [rehearsalSource, endpointSource]) {
  assert.doesNotMatch(source, /\.from\s*\([^)]*\)[\s\S]{0,160}\.(?:insert|upsert|update|delete)\s*\(/);
  assert.doesNotMatch(source, /supabase\.rpc\s*\(/);
}
assert.match(endpointSource, /requireAdmin/);
assert.match(endpointSource, /REHEARSE_API_FOOTBALL_CUTOVER|runApiFootballCutoverRehearsal/);
console.log("Ensaio 6B verificado: duas fontes, dez jogos, classificação, hashes, zero escrita e rollback em memória.");
