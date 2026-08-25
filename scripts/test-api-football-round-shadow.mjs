import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  collectApiFootballRoundCycle, evaluateApiFootballQuota, evaluateRoundShadowWindow,
  reconcileRoundFixtures, shouldInterruptRoundShadow,
} from "../netlify/functions/_api-football-round-shadow.mjs";

const fixtureEnvelope = JSON.parse(await readFile(new URL("../fixtures/api-football/fixture-1492340.sanitized.json", import.meta.url)));
const standingsEnvelope = JSON.parse(await readFile(new URL("../fixtures/api-football/standings-brasileirao.synthetic.json", import.meta.url)));
const rawFixture = fixtureEnvelope.response[0];
rawFixture.teams.home.code = "BOT";
rawFixture.teams.away.code = "CAP";
const canonical = {
  id_jogo: 999, rodada: 24, time_casa: rawFixture.teams.home.name, time_fora: rawFixture.teams.away.name,
  inicio: rawFixture.fixture.date, status: "encerrado", minuto: 90, acrescimos: 6,
  gols_casa: 2, gols_fora: 3, time_casa_id: 1770, time_fora_id: 1766,
  local_partida: "Estádio Nilton Santos", time_casa_logo: "https://example.test/official-botafogo.png",
  time_fora_logo: "https://example.test/official-athletico.png",
  atualizado_em: rawFixture.fixture.date, sincronizado_em: rawFixture.fixture.date,
  api_football_id: rawFixture.fixture.id, api_football_time_casa_id: rawFixture.teams.home.id,
  api_football_time_fora_id: rawFixture.teams.away.id,
};

assert.equal(evaluateRoundShadowWindow([canonical], new Date("2026-08-24T22:44:59Z")).reason, "before_active_window");
assert.equal(evaluateRoundShadowWindow([canonical], new Date("2026-08-24T22:45:00Z")).cadenceMinutes, 1);
assert.equal(evaluateRoundShadowWindow([{ ...canonical, status: "em_andamento" }], new Date("2026-08-25T00:00:00Z")).cadenceMinutes, 5);
assert.equal(evaluateRoundShadowWindow([canonical], new Date("2026-08-25T00:00:00Z")).reason, "round_terminal");
assert.equal(evaluateApiFootballQuota({ dailyLimit: 7500, dailyRemaining: 1501, minuteLimit: 300, minuteRemaining: 31 }).allowed, true);
assert.equal(evaluateApiFootballQuota({ dailyLimit: 7500, dailyRemaining: 1500, minuteLimit: 300, minuteRemaining: 31 }).reason, "daily_reserve_reached");
assert.equal(evaluateApiFootballQuota({ dailyLimit: 7500, dailyRemaining: 7000, minuteLimit: 300, minuteRemaining: 30 }).reason, "minute_reserve_reached");
assert.equal(evaluateApiFootballQuota({}).reason, "quota_headers_invalid");
assert.equal(shouldInterruptRoundShadow({ consecutiveFailures: 3, observation: {} }).reason, "three_consecutive_failures");

const normalizedProvider = {
  providerFixtureId: canonical.api_football_id,
  home: { providerTeamId: canonical.api_football_time_casa_id },
  away: { providerTeamId: canonical.api_football_time_fora_id }, status: { isKnown: true },
  competitionProviderId: 71, season: 2026, roundNumber: 24, kickoffAt: canonical.inicio,
};
assert.equal(reconcileRoundFixtures([canonical], [normalizedProvider]).length, 1);
assert.throws(() => reconcileRoundFixtures([{ ...canonical, api_football_id: null }], [normalizedProvider]), /canonical_mapping_incomplete/);
assert.throws(() => reconcileRoundFixtures([canonical], [{ ...normalizedProvider, home: { providerTeamId: 1 } }]), /mapped_identity_conflict/);

function fakeSupabase() {
  const writes = [];
  const cacheTable = standingsEnvelope.response[0].league.standings[0].map((row) => ({
    position: row.rank, teamId: row.team.id, team: row.team.name, playedGames: row.all.played,
    won: row.all.win, draw: row.all.draw, lost: row.all.lose, points: row.points,
    goalsFor: row.all.goals.for, goalsAgainst: row.all.goals.against, goalDifference: row.goalsDiff,
  }));
  return {
    writes,
    from(table) {
      if (table === "jogos") return { select: () => ({ eq: async () => ({ data: [canonical], error: null }) }) };
      if (table === "classificacao_cache") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { payload: { table: cacheTable }, atualizado_em: "2026-08-25T01:30:00Z" }, error: null }) }) }) };
      return {
        insert(value) {
          writes.push({ table, value });
          if (table === "transicao_api_execucoes") return { select: () => ({ single: async () => ({ data: { id: 88 }, error: null }) }) };
          return Promise.resolve({ error: null });
        },
        update(value) { writes.push({ table, value }); return { eq: async () => ({ error: null }) }; },
      };
    },
  };
}

const headers = {
  "content-type": "application/json", "x-ratelimit-requests-limit": "7500",
  "x-ratelimit-requests-remaining": "7000", "x-ratelimit-limit": "300", "x-ratelimit-remaining": "299",
};
const supabase = fakeSupabase();
const urls = [];
const result = await collectApiFootballRoundCycle({
  supabase, apiKey: "test-only", round: 24, date: "2026-08-24", includeStandings: true,
  now: () => new Date("2026-08-25T02:00:00Z"),
  fetchImpl: async (url) => {
    urls.push(url);
    return new Response(JSON.stringify(url.includes("/standings?") ? standingsEnvelope : fixtureEnvelope), { status: 200, headers });
  },
});
assert.deepEqual(result, { ok: true, executionId: 88, games: 1, calls: 2, standings: true });
assert.match(urls[0], /fixtures\?league=71&season=2026&date=2026-08-24&timezone=America%2FSao_Paulo$/);
assert.equal(supabase.writes.find((write) => write.table === "transicao_api_jogos").value.length, 2);
const roundSnapshots = supabase.writes.find((write) => write.table === "transicao_api_jogos").value;
assert.deepEqual(roundSnapshots.map((row) => row.time_casa_codigo), [null, "BOT"]);
assert.deepEqual(roundSnapshots.map((row) => row.local_cidade), [null, "Rio de Janeiro"]);
assert.equal(supabase.writes.find((write) => write.table === "transicao_api_classificacoes").value.length, 2);
assert.equal(supabase.writes.some((write) => write.table === "jogos"), false);
assert.equal(supabase.writes.some((write) => write.table === "classificacao_cache"), false);
assert.equal(JSON.stringify(supabase.writes).includes("test-only"), false);

const blocked = fakeSupabase();
await assert.rejects(collectApiFootballRoundCycle({
  supabase: blocked, apiKey: "test-only", round: 24, date: "2026-08-24",
  now: () => new Date("2026-08-25T02:00:00Z"),
  fetchImpl: async () => new Response(JSON.stringify(fixtureEnvelope), { status: 200, headers: { ...headers, "x-ratelimit-requests-remaining": "1500" } }),
}), /daily_reserve_reached/);
assert.equal(blocked.writes.some((write) => write.table === "transicao_api_jogos"), false);

console.log("Núcleo 5B.3A verificado: janela, cota, identidade, lote, classificação e isolamento.");
