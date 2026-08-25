import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { normalizeApiFootballFixturesEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { reconcileApiFootballSeason } from "../src/sports-data/api-football-reconciliation.mjs";
import { buildMappingMigrationSql, buildMappingRollbackSql } from "../src/sports-data/api-football-mapping-migration.mjs";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

const [migrationPath, rollbackPath] = process.argv.slice(2);
if (!migrationPath || !rollbackPath) throw new Error("usage:migration_path rollback_path");

const supabase = createClient(requiredEnvironment("SUPABASE_URL"), requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const observedAt = new Date().toISOString();
const [apiResponse, canonicalResult] = await Promise.all([
  fetch("https://v3.football.api-sports.io/fixtures?league=71&season=2026", {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY_LOCAL || requiredEnvironment("API_FOOTBALL_KEY"), Accept: "application/json" },
  }),
  supabase.from("jogos").select("id_jogo,rodada,time_casa,time_fora,inicio,api_football_id,api_football_time_casa_id,api_football_time_fora_id,api_football_mapeado_em").order("id_jogo"),
]);
if (canonicalResult.error) throw new Error(`canonical_read_failed:${canonicalResult.error.message}`);
if ((canonicalResult.data || []).some((game) => [game.api_football_id, game.api_football_time_casa_id, game.api_football_time_fora_id, game.api_football_mapeado_em].some((value) => value != null))) {
  throw new Error("canonical_mapping_state_not_empty");
}
const payload = await apiResponse.json().catch(() => null);
const normalized = normalizeApiFootballFixturesEnvelope(payload, {
  observedAt,
  httpStatus: apiResponse.status,
  headers: apiResponse.headers,
  expectedCount: 380,
});
if (!normalized.observation.responseValid) {
  const providerErrors = payload?.errors && typeof payload.errors === "object" ? Object.keys(payload.errors).join(",") : "";
  throw new Error(`provider_normalization_failed:http_${apiResponse.status}:${normalized.observation.errors.join(",")}:${providerErrors}`);
}

const reconciliation = reconcileApiFootballSeason(canonicalResult.data || [], normalized.games);
await writeFile(migrationPath, buildMappingMigrationSql(reconciliation), { encoding: "utf8", flag: "wx" });
await writeFile(rollbackPath, buildMappingRollbackSql(), { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({
  ok: true,
  migrationPath,
  rollbackPath,
  mappedCount: reconciliation.mappedCount,
  blockedCount: reconciliation.blocked.length,
  reconciliationHash: reconciliation.reconciliationHash,
}, null, 2));
