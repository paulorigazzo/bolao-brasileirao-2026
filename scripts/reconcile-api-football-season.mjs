import { createClient } from "@supabase/supabase-js";
import { normalizeApiFootballFixturesEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { reconcileApiFootballSeason } from "../src/sports-data/api-football-reconciliation.mjs";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

function safeReport(result, observation) {
  return {
    ok: result.complete,
    mode: "read_only_dry_run",
    observedAt: observation.observedAt,
    calls: 1,
    quota: {
      dailyLimit: observation.dailyLimit,
      dailyRemaining: observation.dailyRemaining,
      minuteLimit: observation.minuteLimit,
      minuteRemaining: observation.minuteRemaining,
    },
    canonicalCount: result.canonicalCount,
    providerCount: result.providerCount,
    mappedCount: result.mappedCount,
    blockedCount: result.blocked.length,
    unmatchedProviderCount: result.unmatchedProviderFixtureIds.length,
    structuralErrors: result.structuralErrors,
    blocked: result.blocked,
    aliasesUsed: result.aliasesUsed,
    maximumKickoffDeltaMinutes: result.maximumKickoffDeltaMinutes,
    toleranceMinutes: result.toleranceMinutes,
    reconciliationHash: result.reconciliationHash,
  };
}

const apiKey = requiredEnvironment("API_FOOTBALL_KEY");
const supabase = createClient(requiredEnvironment("SUPABASE_URL"), requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const observedAt = new Date().toISOString();
const [apiResponse, canonicalResult] = await Promise.all([
  fetch("https://v3.football.api-sports.io/fixtures?league=71&season=2026", {
    headers: { "x-apisports-key": apiKey, Accept: "application/json" },
  }),
  supabase.from("jogos").select("id_jogo,rodada,time_casa,time_fora,inicio,api_football_id,api_football_time_casa_id,api_football_time_fora_id").order("id_jogo"),
]);
if (canonicalResult.error) throw new Error(`canonical_read_failed:${canonicalResult.error.message}`);
const payload = await apiResponse.json().catch(() => null);
const normalized = normalizeApiFootballFixturesEnvelope(payload, {
  observedAt,
  httpStatus: apiResponse.status,
  headers: apiResponse.headers,
  expectedCount: 380,
});
if (!normalized.observation.responseValid) {
  throw new Error(`provider_normalization_failed:${normalized.observation.errors.join(",")}`);
}
const reconciliation = reconcileApiFootballSeason(canonicalResult.data || [], normalized.games);
console.log(JSON.stringify(safeReport(reconciliation, normalized.observation), null, 2));
if (!reconciliation.complete) process.exitCode = 2;
