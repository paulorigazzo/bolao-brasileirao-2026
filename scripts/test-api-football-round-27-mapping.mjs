import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const migration = readFileSync(new URL("../supabase/migrations/20260908125715_map_api_football_round_27.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../supabase/rollback/rollback_map_api_football_round_27.sql", import.meta.url), "utf8");
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const mappings = [
  [555000,1492370,1062,124], [555001,1492371,118,1198], [555002,1492372,120,794],
  [555003,1492373,132,119], [555004,1492374,147,134], [555005,1492375,127,131],
  [555006,1492376,130,133], [555007,1492377,7848,136], [555008,1492378,121,126],
  [555009,1492379,128,135],
];
const normalized = mappings.map(([canonicalGameId, providerFixtureId, providerHomeTeamId, providerAwayTeamId]) =>
  ({ canonicalGameId, providerFixtureId, providerHomeTeamId, providerAwayTeamId }));
const hash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
assert.equal(hash, "1da24b4c152ba53ee0a5fab2025847433a78f34eb565141c78087e009dd96d4b");
for (const values of mappings) assert.match(migration, new RegExp(`\\(${values.join(", ")}\\)`));
assert.match(migration, /where rodada = 27\) <> 10/);
assert.match(migration, /previous_mapping_count_mismatch/);
assert.match(migration, /post_mapping_count_mismatch/);
assert.match(migration, /remaining_null_count_mismatch/);
assert.match(migration, /competitive_state_changed/);
assert.match(migration, /'fase_migracao', 'rodada_27'/);
assert.match(migration, /'sombra_pos_corte', 'api-football', 'football-data\.org'/);
assert.doesNotMatch(migration, /\b(?:inicio|status|gols_casa|gols_fora|time_casa|time_fora)\s*=/);
assert.match(rollback, /rollback_state_diverged/);
assert.match(rollback, /rollback_count_mismatch/);
assert.match(rollback, /set api_football_id = null/);
assert.doesNotMatch(app, /API_FOOTBALL_RECONCILIATION_SESSION_KEY/);
assert.doesNotMatch(app, /id="adminReconciliationForm"/);
console.log("Mapeamento incremental da Rodada 27 preservado: hash, dez vínculos, integridade e rollback; controle transitório removido da ADM.");
