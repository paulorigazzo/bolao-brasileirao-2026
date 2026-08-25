import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  collectApiFootballShadowMatch, officialSnapshot, shadowSnapshot,
} from "../netlify/functions/_api-football-shadow.mjs";
import { normalizeApiFootballFixtureEnvelope } from "../src/sports-data/api-football-adapter.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/api-football/fixture-1492340.sanitized.json", import.meta.url)));
fixture.response[0].teams.home.code = "BOT";
fixture.response[0].teams.away.code = "CAP";

function query(result) {
  return { select() { return this; }, eq() { return this; }, maybeSingle: async () => result, single: async () => result };
}

function fakeSupabase() {
  const writes = [];
  const officialGame = {
    id_jogo: 999, rodada: 24, time_casa: "Botafogo", time_fora: "Athletico-PR",
    inicio: "2026-08-24T23:00:00Z", status: "encerrado", minuto: 90, acrescimos: 6,
    gols_casa: 2, gols_fora: 3, time_casa_id: 1770, time_fora_id: 1766,
    local_partida: "Estádio Nilton Santos", time_casa_logo: "https://example.test/official-botafogo.png",
    time_fora_logo: "https://example.test/official-athletico.png",
    atualizado_em: "2026-08-25T01:58:00Z", sincronizado_em: "2026-08-25T01:58:00Z",
  };
  return {
    writes,
    from(table) {
      return {
        select() { return table === "jogos" ? query({ data: officialGame, error: null }) : this; },
        insert(value) {
          writes.push({ table, value });
          return table === "transicao_api_execucoes" ? query({ data: { id: 77 }, error: null }) : Promise.resolve({ error: null });
        },
        update(value) { writes.push({ table, value }); return { eq: async () => ({ error: null }) }; },
      };
    },
  };
}

const supabase = fakeSupabase();
let calls = 0;
const result = await collectApiFootballShadowMatch({
  supabase, apiKey: "test-only", canonicalGameId: 999, fixtureId: 1492340,
  trigger: "manual:admin@example.test", now: () => new Date("2026-08-25T02:00:00Z"),
  fetchImpl: async (url, options) => {
    calls += 1;
    assert.equal(url, "https://v3.football.api-sports.io/fixtures?id=1492340");
    assert.equal(options.headers["x-apisports-key"], "test-only");
    return new Response(JSON.stringify(fixture), { status: 200, headers: {
      "content-type": "application/json", "x-ratelimit-requests-limit": "100", "x-ratelimit-requests-remaining": "90",
    } });
  },
});
assert.equal(result.ok, true);
assert.equal(calls, 1);
assert.equal(result.executionId, 77);
assert.equal(result.normalizedStatus, "finished");
assert.deepEqual(result.score, { home: 2, away: 3 });
const snapshotWrite = supabase.writes.find((write) => write.table === "transicao_api_jogos");
assert.equal(snapshotWrite.value.length, 2);
assert.deepEqual(snapshotWrite.value.map((row) => row.fornecedor), ["football-data.org", "api-football"]);
assert.ok(snapshotWrite.value.every((row) => row.id_jogo === 999 && /^[0-9a-f]{64}$/.test(row.hash_relevante)));
const [officialRow, shadowRow] = snapshotWrite.value;
assert.deepEqual(
  [officialRow.local_nome, officialRow.local_cidade, officialRow.time_casa_codigo, officialRow.time_fora_codigo],
  ["Estádio Nilton Santos", null, null, null],
);
assert.deepEqual(
  [shadowRow.local_nome, shadowRow.local_cidade, shadowRow.time_casa_codigo, shadowRow.time_fora_codigo],
  ["Nilton Santos", "Rio de Janeiro", "BOT", "CAP"],
);
assert.equal(officialRow.time_casa_logo, "https://example.test/official-botafogo.png");
assert.equal(shadowRow.time_casa_logo, "https://example.test/botafogo.png");
assert.equal(supabase.writes.some((write) => write.table === "jogos"), false);
assert.equal(JSON.stringify(supabase.writes).includes("test-only"), false);

const failureSupabase = fakeSupabase();
const failure = await collectApiFootballShadowMatch({
  supabase: failureSupabase, apiKey: "test-only", canonicalGameId: 999, fixtureId: 1492340,
  trigger: "manual:admin@example.test", now: () => new Date("2026-08-25T02:00:00Z"),
  fetchImpl: async () => new Response(JSON.stringify({
    errors: { token: "secret provider detail" }, response: [], results: 0, paging: { current: 1, total: 1 },
  }), { status: 401 }),
});
assert.equal(failure.ok, false);
assert.equal(failure.status, 409);
assert.deepEqual(failure.errors, ["http_request_failed", "provider_reported_errors", "requested_fixture_not_unique"]);
assert.equal(JSON.stringify(failureSupabase.writes).includes("secret provider detail"), false);
assert.equal(failureSupabase.writes.some((write) => write.table === "transicao_api_jogos"), false);

const observedAt = "2026-08-25T02:00:00.000Z";
const officialGameForHash = {
  id_jogo: 999, rodada: 24, time_casa: "Botafogo", time_fora: "Athletico-PR",
  inicio: "2026-08-24T23:00:00Z", status: "encerrado", minuto: 90, acrescimos: 6,
  gols_casa: 2, gols_fora: 3, local_partida: "Estádio Nilton Santos",
  time_casa_logo: "https://example.test/official-botafogo.png",
  time_fora_logo: "https://example.test/official-athletico.png",
};
assert.equal(
  officialSnapshot(officialGameForHash, 1, observedAt).hash_relevante,
  officialSnapshot(structuredClone(officialGameForHash), 2, observedAt).hash_relevante,
);
const normalizedForHash = normalizeApiFootballFixtureEnvelope(fixture, {
  requestedFixtureId: 1492340, observedAt, httpStatus: 200,
}).game;
const originalHash = shadowSnapshot(normalizedForHash, 1, 999, observedAt).hash_relevante;
const changedMetadata = structuredClone(normalizedForHash);
changedMetadata.venueCity = "Niterói";
assert.notEqual(shadowSnapshot(changedMetadata, 1, 999, observedAt).hash_relevante, originalHash);

for (const invalid of [0, -1, "abc", null]) {
  await assert.rejects(
    collectApiFootballShadowMatch({ supabase: fakeSupabase(), apiKey: "x", canonicalGameId: invalid, fixtureId: 1 }),
    /canonical_game_id_invalid/,
  );
}
console.log("Coleta manual em sombra verificada: chamada única, isolamento, snapshots, cota e falha sanitizada.");
