import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  APPROVED_MAPPING_COUNT,
  APPROVED_RECONCILIATION_HASH,
  buildMappingMigrationSql,
  buildMappingRollbackSql,
  validateApprovedReconciliation,
} from "../src/sports-data/api-football-mapping-migration.mjs";

const mappings = Array.from({ length: APPROVED_MAPPING_COUNT }, (_, index) => ({
  canonicalGameId: index + 1,
  providerFixtureId: 1000 + index,
  providerHomeTeamId: 2000 + index,
  providerAwayTeamId: 3000 + index,
  kickoffDeltaMinutes: 0,
}));
const hash = createHash("sha256").update(JSON.stringify(mappings.map(({ kickoffDeltaMinutes: _, ...mapping }) => mapping))).digest("hex");
const result = {
  canonicalCount: 380,
  providerCount: 380,
  mappedCount: 255,
  blocked: Array.from({ length: 125 }, () => ({ reason: "kickoff_out_of_tolerance" })),
  structuralErrors: [],
  maximumKickoffDeltaMinutes: 0,
  reconciliationHash: APPROVED_RECONCILIATION_HASH,
  mappings,
};

assert.throws(() => validateApprovedReconciliation({ ...result, reconciliationHash: hash }), /approved_reconciliation_hash_mismatch/);
const approved = { ...result };
const originalHash = approved.reconciliationHash;
approved.reconciliationHash = APPROVED_RECONCILIATION_HASH;
assert.equal(validateApprovedReconciliation(approved).length, 255);
approved.reconciliationHash = originalHash;

const sql = buildMappingMigrationSql({ ...result, reconciliationHash: APPROVED_RECONCILIATION_HASH });
assert.match(sql, /pg_advisory_xact_lock/);
assert.match(sql, /lock table public\.jogos/);
assert.match(sql, /api_football_5b2_hash_mismatch/);
assert.match(sql, /updated_count <> 255/);
assert.match(sql, /competitive_hash_after <> competitive_hash_before/);
assert.match(sql, /'quantidade_bloqueada', 125/);
assert.doesNotMatch(sql, /\bupsert\b/i);
assert.equal((sql.match(/^    \(\d+, \d+, \d+, \d+\)/gm) || []).length, 255);

const rollback = buildMappingRollbackSql();
assert.match(rollback, /api_football_5b2_rollback_state_diverged/);
assert.match(rollback, /restored_count <> 255/);
assert.match(rollback, /rollback_executado_em/);

const migrationArtifact = await readFile(new URL("../supabase/migrations/20260825050228_gravacao_mapeamentos_api_football_5b2.sql", import.meta.url), "utf8");
const rollbackArtifact = await readFile(new URL("../supabase/rollback/rollback_gravacao_mapeamentos_api_football_5b2.sql", import.meta.url), "utf8");
const artifactMappings = [...migrationArtifact.matchAll(/^    \((\d+), (\d+), (\d+), (\d+)\)[,;]?$/gm)].map((match) => ({
  canonicalGameId: Number(match[1]),
  providerFixtureId: Number(match[2]),
  providerHomeTeamId: Number(match[3]),
  providerAwayTeamId: Number(match[4]),
}));
assert.equal(artifactMappings.length, APPROVED_MAPPING_COUNT);
assert.equal(new Set(artifactMappings.map((mapping) => mapping.canonicalGameId)).size, APPROVED_MAPPING_COUNT);
assert.equal(new Set(artifactMappings.map((mapping) => mapping.providerFixtureId)).size, APPROVED_MAPPING_COUNT);
assert.equal(createHash("sha256").update(JSON.stringify(artifactMappings)).digest("hex"), APPROVED_RECONCILIATION_HASH);
assert.match(migrationArtifact, /estado_competitivo_hash_antes/);
assert.match(migrationArtifact, /estado_competitivo_hash_depois/);
assert.match(rollbackArtifact, /api_football_5b2_rollback_state_diverged/);
console.log("Migração 5B.2 verificada: hash, atomicidade, preservação, auditoria e rollback.");
