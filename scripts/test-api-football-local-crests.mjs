import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import teams from "../fixtures/api-football/teams-brasileirao-2026.json" with { type: "json" };
import {
  API_FOOTBALL_BRASILEIRAO_TEAM_IDS,
  apiFootballLocalCrestUrl,
  assessApiFootballCrestCoverage,
  inspectApiFootballCrest,
} from "../src/sports-data/api-football-local-crests.mjs";
import { probeApiFootballLocalCrests } from "../netlify/functions/_api-football-local-crests.mjs";

assert.equal(API_FOOTBALL_BRASILEIRAO_TEAM_IDS.length, 20);
assert.equal(new Set(API_FOOTBALL_BRASILEIRAO_TEAM_IDS).size, 20);
assert.deepEqual(teams.map((team) => team.id).sort((a, b) => a - b), [...API_FOOTBALL_BRASILEIRAO_TEAM_IDS].sort((a, b) => a - b));
assert.equal(new Set(teams.map((team) => team.canonicalName)).size, 20);
assert.equal(new Set(teams.map((team) => team.abbreviation)).size, 20);
assert.equal(apiFootballLocalCrestUrl(794), "/assets/clubs/api-football/794.png");
assert.throws(() => apiFootballLocalCrestUrl("invalid"), /api_football_team_id_invalid/);
assert.equal(assessApiFootballCrestCoverage(API_FOOTBALL_BRASILEIRAO_TEAM_IDS).ok, true);
assert.equal(assessApiFootballCrestCoverage(API_FOOTBALL_BRASILEIRAO_TEAM_IDS.slice(1)).ok, false);

const png = Buffer.alloc(24);
png[0] = 0x89;
png.write("PNG", 1, "ascii");
png.writeUInt32BE(128, 16);
png.writeUInt32BE(128, 20);
assert.equal(inspectApiFootballCrest(png).ok, true);
assert.deepEqual(inspectApiFootballCrest(Buffer.from("not-png"), "text/plain").errors,
  ["content_type_invalid", "png_invalid"]);

const okFetch = async () => new Response(png, { status: 200, headers: { "content-type": "image/png" } });
const report = await probeApiFootballLocalCrests("https://bolao.example", okFetch);
assert.deepEqual({ ok: report.ok, clubs: report.clubs, failures: report.failures.length },
  { ok: true, clubs: 20, failures: 0 });
const missing = await probeApiFootballLocalCrests("https://bolao.example", okFetch,
  API_FOOTBALL_BRASILEIRAO_TEAM_IDS.slice(1));
assert.equal(missing.ok, false);
const unavailable = await probeApiFootballLocalCrests("https://bolao.example",
  async () => new Response("missing", { status: 404 }));
assert.equal(unavailable.ok, false);
assert.equal(unavailable.failures.length, 20);

for (const team of teams) {
  const bytes = await readFile(new URL(`../assets/clubs/api-football/${team.id}.png`, import.meta.url));
  assert.equal(inspectApiFootballCrest(bytes).ok, true, `Escudo local inválido: ${team.id} (${team.displayName})`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), team.crestSha256,
    `Escudo local trocado: ${team.id} deveria representar ${team.displayName}`);
}

console.log("Escudos locais da API-Football verificados: cobertura, formato, resolução e falhas negativas.");
