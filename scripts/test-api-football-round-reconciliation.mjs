import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fixture from "../fixtures/api-football/fixture-1492340.sanitized.json" with { type: "json" };
import { reconcileApiFootballRound } from "../netlify/functions/_api-football-round-reconciliation.mjs";

const pairs = [
  ["Bahia", "Clube do Remo", "Bahia", "Remo"], ["Coritiba", "Paranaense", "Coritiba", "Athletico-PR"],
  ["Flamengo", "Corinthians", "Flamengo", "Corinthians"], ["Mirassol", "Vitória", "Mirassol", "Vitoria"],
  ["Mineiro", "Fluminense", "Atletico-MG", "Fluminense"], ["Grêmio", "Vasco da Gama", "Gremio", "Vasco DA Gama"],
  ["Chapecoense", "Internacional", "Chapecoense-sc", "Internacional"], ["Palmeiras", "São Paulo", "Palmeiras", "Sao Paulo"],
  ["Botafogo", "Bragantino", "Botafogo", "RB Bragantino"], ["Santos", "Cruzeiro", "Santos", "Cruzeiro"],
];
const canonical = pairs.map((pair, index) => ({
  id_jogo: 555000 + index, rodada: 27, time_casa: pair[0], time_fora: pair[1],
  inicio: new Date(Date.UTC(2026, 8, 12, index < 4 ? 0 : 19 + index - 4)).toISOString(), status: "agendado",
  api_football_id: null, api_football_time_casa_id: null, api_football_time_fora_id: null, api_football_mapeado_em: null,
}));
const providerRows = pairs.map((pair, index) => {
  const row = structuredClone(fixture.response[0]);
  row.fixture.id = 1600000 + index;
  row.fixture.date = index < 4
    ? new Date(Date.UTC(2026, 8, 12, 19 + index)).toISOString()
    : canonical[index].inicio;
  row.league.round = "Regular Season - 27";
  row.teams.home = { id: 300 + index * 2, name: pair[2], logo: `https://example.test/${300 + index * 2}.png`, winner: null };
  row.teams.away = { id: 301 + index * 2, name: pair[3], logo: `https://example.test/${301 + index * 2}.png`, winner: null };
  return row;
});

function readOnlySupabase(rows = canonical) {
  let reads = 0;
  return { get reads() { return reads; }, from(table) {
    assert.equal(table, "jogos");
    return { select() { return this; }, eq() { return this; }, order: async () => {
      reads += 1; return { data: structuredClone(rows), error: null };
    } };
  } };
}

const supabase = readOnlySupabase();
const fetchImpl = async () => ({ status: 200, headers: new Headers({
  "x-ratelimit-requests-limit": "7500", "x-ratelimit-requests-remaining": "7400",
  "x-ratelimit-limit": "300", "x-ratelimit-remaining": "299",
}), json: async () => ({ ...fixture, results: 380, response: [
  ...providerRows,
  ...Array.from({ length: 370 }, (_, index) => {
    const row = structuredClone(fixture.response[0]);
    row.fixture.id = 1700000 + index;
    row.league.round = `Regular Season - ${index % 26 + 1}`;
    row.teams.home.id = 10000 + index * 2;
    row.teams.away.id = 10001 + index * 2;
    return row;
  }),
] }) });

const result = await reconcileApiFootballRound({ supabase, apiFootballKey: "test-key", round: 27,
  confirmation: "RECONCILE_API_FOOTBALL_ROUND", fetchImpl, now: () => new Date("2026-09-08T12:00:00Z") });
assert.equal(result.ok, true);
assert.equal(result.canonicalGames, 10);
assert.equal(result.providerGames, 10);
assert.equal(result.candidateMappings, 10);
assert.equal(result.identityComplete, true);
assert.equal(result.automaticApproval, false);
assert.equal(result.scheduleReviewRequired, true);
assert.equal(result.writes, 0);
assert.equal(result.hashes.mappingsBefore, result.hashes.mappingsAfter);
assert.equal(result.candidates.filter((candidate) => !candidate.withinStandardTolerance).length, 4);
assert.equal(supabase.reads, 2);
assert.match(result.reconciliationHash, /^[0-9a-f]{64}$/);
assert.match(result.reportHash, /^[0-9a-f]{64}$/);
await assert.rejects(() => reconcileApiFootballRound({ supabase: readOnlySupabase(), apiFootballKey: "test-key",
  round: 27, confirmation: "wrong", fetchImpl }), /round_reconciliation_confirmation_invalid/);

const helperSource = readFileSync(new URL("../netlify/functions/_api-football-round-reconciliation.mjs", import.meta.url), "utf8");
const endpointSource = readFileSync(new URL("../netlify/functions/reconciliar-api-football-rodada.mjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
for (const source of [helperSource, endpointSource]) {
  assert.doesNotMatch(source, /\.from\s*\([^)]*\)[\s\S]{0,200}\.(?:insert|upsert|update|delete)\s*\(/);
  assert.doesNotMatch(source, /supabase\.rpc\s*\(/);
}
assert.match(endpointSource, /requireAdmin/);
assert.match(endpointSource, /RECONCILE_API_FOOTBALL_ROUND|reconcileApiFootballRound/);
assert.doesNotMatch(appSource, /id="adminReconciliationForm"/);
assert.doesNotMatch(appSource, /API_FOOTBALL_RECONCILIATION_SESSION_KEY/);
assert.doesNotMatch(appSource, /reconciliar-api-football-rodada/);
console.log("Reconciliação protegida preservada no backend e removida da ADM: dez identidades, horários sinalizados, cota e zero escrita.");
