import { createHash } from "node:crypto";
import { normalizeApiFootballFixturesEnvelope } from "../../src/sports-data/api-football-adapter.mjs";
import { reconcileApiFootballSeason, RECONCILIATION_TOLERANCE_MINUTES } from "../../src/sports-data/api-football-reconciliation.mjs";
import { assertApiFootballQuota } from "./_api-football-official.mjs";
import { API_FOOTBALL_LEAGUE_ID, SEASON_YEAR } from "./_constants.mjs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const CONFIRMATION = "RECONCILE_API_FOOTBALL_ROUND";
const REVIEW_TOLERANCE_MINUTES = 7 * 24 * 60;

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function mappingState(rows) {
  return rows.map((game) => ({
    id_jogo: Number(game.id_jogo),
    api_football_id: game.api_football_id == null ? null : Number(game.api_football_id),
    api_football_time_casa_id: game.api_football_time_casa_id == null ? null : Number(game.api_football_time_casa_id),
    api_football_time_fora_id: game.api_football_time_fora_id == null ? null : Number(game.api_football_time_fora_id),
    api_football_mapeado_em: game.api_football_mapeado_em || null,
  })).sort((a, b) => a.id_jogo - b.id_jogo);
}

async function readRound(supabase, round) {
  const { data, error } = await supabase.from("jogos")
    .select("id_jogo,rodada,time_casa,time_fora,inicio,status,api_football_id,api_football_time_casa_id,api_football_time_fora_id,api_football_mapeado_em")
    .eq("rodada", round)
    .order("id_jogo", { ascending: true });
  if (error) throw new Error(`round_reconciliation_read_failed:${error.message}`);
  return data || [];
}

export async function reconcileApiFootballRound({ supabase, apiFootballKey, round, confirmation,
  fetchImpl = fetch, now = () => new Date() }) {
  const roundNumber = Number(round);
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 38) throw new Error("round_reconciliation_round_invalid");
  if (confirmation !== CONFIRMATION) throw new Error("round_reconciliation_confirmation_invalid");
  if (!apiFootballKey) throw new Error("api_football_key_missing");

  const observedAt = now().toISOString();
  const before = await readRound(supabase, roundNumber);
  if (before.length !== 10) throw new Error(`round_reconciliation_game_count_invalid:${before.length}`);
  const response = await fetchImpl(`${API_FOOTBALL_BASE}/fixtures?league=${API_FOOTBALL_LEAGUE_ID}&season=${SEASON_YEAR}`, {
    headers: { "x-apisports-key": apiFootballKey, Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  const normalized = normalizeApiFootballFixturesEnvelope(payload, {
    observedAt, httpStatus: response.status, headers: response.headers, expectedCount: 380,
  });
  if (!normalized.observation.responseValid) throw new Error(normalized.observation.errors[0] || "api_football_fixtures_invalid");
  assertApiFootballQuota(normalized.observation);
  const providerRound = normalized.games.filter((game) => Number(game.roundNumber) === roundNumber);
  const reconciliation = reconcileApiFootballSeason(before, providerRound, { toleranceMinutes: REVIEW_TOLERANCE_MINUTES });
  const providerById = new Map(providerRound.map((game) => [Number(game.providerFixtureId), game]));
  const canonicalById = new Map(before.map((game) => [Number(game.id_jogo), game]));
  const candidates = reconciliation.mappings.map((mapping) => {
    const canonical = canonicalById.get(Number(mapping.canonicalGameId));
    const provider = providerById.get(Number(mapping.providerFixtureId));
    return {
      canonicalGameId: mapping.canonicalGameId,
      canonicalHome: canonical?.time_casa || null,
      canonicalAway: canonical?.time_fora || null,
      canonicalKickoffAt: canonical?.inicio || null,
      providerFixtureId: mapping.providerFixtureId,
      providerHomeTeamId: mapping.providerHomeTeamId,
      providerAwayTeamId: mapping.providerAwayTeamId,
      providerHome: provider?.home?.name || null,
      providerAway: provider?.away?.name || null,
      providerKickoffAt: provider?.kickoffAt || null,
      kickoffDeltaMinutes: mapping.kickoffDeltaMinutes,
      withinStandardTolerance: mapping.kickoffDeltaMinutes <= RECONCILIATION_TOLERANCE_MINUTES,
    };
  });
  const after = await readRound(supabase, roundNumber);
  const hashes = { mappingsBefore: sha256(mappingState(before)), mappingsAfter: sha256(mappingState(after)) };
  const identityComplete = reconciliation.structuralErrors.length === 0
    && reconciliation.blocked.length === 0
    && reconciliation.mappedCount === 10
    && reconciliation.unmatchedProviderFixtureIds.length === 0;
  const reportCore = {
    observedAt,
    round: roundNumber,
    canonicalGames: before.length,
    providerGames: providerRound.length,
    candidateMappings: candidates.length,
    identityComplete,
    automaticApproval: identityComplete && candidates.every((candidate) => candidate.withinStandardTolerance),
    scheduleReviewRequired: candidates.some((candidate) => !candidate.withinStandardTolerance),
    standardToleranceMinutes: RECONCILIATION_TOLERANCE_MINUTES,
    reviewToleranceMinutes: REVIEW_TOLERANCE_MINUTES,
    blocked: reconciliation.blocked,
    unmatchedProviderFixtureIds: reconciliation.unmatchedProviderFixtureIds,
    structuralErrors: reconciliation.structuralErrors,
    aliasesUsed: reconciliation.aliasesUsed,
    reconciliationHash: reconciliation.reconciliationHash,
    candidates,
    quota: {
      dailyLimit: normalized.observation.dailyLimit,
      dailyRemaining: normalized.observation.dailyRemaining,
      minuteLimit: normalized.observation.minuteLimit,
      minuteRemaining: normalized.observation.minuteRemaining,
    },
    writes: 0,
    hashes,
  };
  return { ok: true, ...reportCore, reportHash: sha256(reportCore) };
}
