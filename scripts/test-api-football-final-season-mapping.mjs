import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260908160719_map_api_football_remaining_2026.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../supabase/rollback/rollback_map_api_football_remaining_2026.sql", import.meta.url), "utf8");
const expectedHash = "90fc90cd14e73e3654acef3f3ca2318ecd679436d76be762d9e6d46dc4da2b67";

const valuesBlock = migration.match(/values\s*([\s\S]*?);\s*\n\s*select encode/i)?.[1] || "";
const mappings = [...valuesBlock.matchAll(/\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g)].map((match) => ({
  canonicalGameId: Number(match[1]),
  providerFixtureId: Number(match[2]),
  providerHomeTeamId: Number(match[3]),
  providerAwayTeamId: Number(match[4]),
}));

assert.equal(mappings.length, 115);
assert.equal(new Set(mappings.map((mapping) => mapping.canonicalGameId)).size, 115);
assert.equal(new Set(mappings.map((mapping) => mapping.providerFixtureId)).size, 115);
assert.ok(mappings.every((mapping) => mapping.providerFixtureId - mapping.canonicalGameId === 937370));
assert.deepEqual(mappings[0], {
  canonicalGameId: 554887,
  providerFixtureId: 1492257,
  providerHomeTeamId: 1198,
  providerAwayTeamId: 121,
});
assert.deepEqual(mappings.find((mapping) => mapping.canonicalGameId === 554941), {
  canonicalGameId: 554941,
  providerFixtureId: 1492311,
  providerHomeTeamId: 120,
  providerAwayTeamId: 130,
});
assert.deepEqual(mappings.at(-1), {
  canonicalGameId: 555119,
  providerFixtureId: 1492489,
  providerHomeTeamId: 133,
  providerAwayTeamId: 136,
});

const calculatedHash = createHash("sha256").update(JSON.stringify(mappings)).digest("hex");
assert.equal(calculatedHash, expectedHash);
assert.match(migration, /previous_mapping_count_mismatch/);
assert.match(migration, /post_mapping_count_mismatch/);
assert.match(migration, /final_mapping_incomplete/);
assert.match(migration, /final_fixture_duplicate/);
assert.match(migration, /final_competitive_state_changed/);
assert.match(migration, /'fase_migracao', 'mapeamento_final_2026'/);
assert.match(migration, /'quantidade_total_apos', 380/);
assert.doesNotMatch(migration, /\b(?:inicio|status|gols_casa|gols_fora|time_casa|time_fora)\s*=/);
assert.match(rollback, /rollback_state_diverged/);
assert.match(rollback, /rollback_count_mismatch/);
assert.match(rollback, /set api_football_id = null/);
assert.match(rollback, /<> 265/);

console.log("Mapeamento final da temporada verificado: 115 vínculos, hash, integridade, auditoria e rollback.");
