import { normalizeApiFootballFixturesEnvelope, normalizeApiFootballStandingsEnvelope } from "../../src/sports-data/api-football-adapter.mjs";
import { evolveEstimatedLiveClock } from "../../js/live-match-minute.js";
import { sanitizeGameForStatus, sanitizeGameSchedule } from "./_sync-policy.mjs";
import { isMissingTableError, requireEnv, serviceClient } from "./_api-helpers.mjs";
import { API_FOOTBALL_LEAGUE_ID, CLASSIFICATION_SNAPSHOT_ID, SEASON_YEAR } from "./_constants.mjs";
import { providerClassificationSnapshotId, SPORTS_DATA_PROVIDERS } from "./_sports-data-provider.mjs";
import { apiFootballLocalCrestUrl } from "../../src/sports-data/api-football-local-crests.mjs";

const API_BASE = "https://v3.football.api-sports.io";
const DAILY_RESERVE_RATIO = 0.2;
const MINUTE_RESERVE_RATIO = 0.1;
const TERMINAL_STATUSES = new Set(["encerrado", "adiado", "cancelado"]);

export function assertApiFootballQuota(observation) {
  const pairs = [
    [observation.dailyLimit, observation.dailyRemaining, DAILY_RESERVE_RATIO, "api_football_daily_reserve_reached"],
    [observation.minuteLimit, observation.minuteRemaining, MINUTE_RESERVE_RATIO, "api_football_minute_reserve_reached"],
  ];
  for (const [limit, remaining, reserve, error] of pairs) {
    if (Number.isInteger(limit) && limit > 0 && Number.isInteger(remaining) && remaining <= Math.ceil(limit * reserve)) throw new Error(error);
  }
}

function internalStatus(status) {
  return ({ scheduled: "agendado", live: "em_andamento", halftime: "intervalo", postponed: "adiado", cancelled: "cancelado", finished: "encerrado" })[status] || null;
}

async function request(path, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": requireEnv("API_FOOTBALL_KEY"), Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export function apiFootballGameForCanonical(provider, canonical, observedAt = new Date().toISOString()) {
  if (Number(provider?.providerFixtureId) !== Number(canonical?.api_football_id)) throw new Error("mapped_fixture_identity_conflict");
  if (Number(provider?.home?.providerTeamId) !== Number(canonical?.api_football_time_casa_id)) throw new Error("mapped_home_identity_conflict");
  if (Number(provider?.away?.providerTeamId) !== Number(canonical?.api_football_time_fora_id)) throw new Error("mapped_away_identity_conflict");
  const status = internalStatus(provider?.status?.normalized);
  if (!status) throw new Error("unknown_fixture_status");
  return {
    id_jogo: Number(canonical.id_jogo),
    rodada: Number(canonical.rodada),
    time_casa: canonical.time_casa,
    time_fora: canonical.time_fora,
    inicio: provider.kickoffAt,
    local_partida: provider.venueName || canonical.local_partida || null,
    gols_casa: provider.score.home,
    gols_fora: provider.score.away,
    minuto: provider.clock.elapsed,
    acrescimos: provider.clock.extra,
    status,
    atualizado_em: observedAt,
    time_casa_id: canonical.time_casa_id,
    time_fora_id: canonical.time_fora_id,
    time_casa_logo: apiFootballLocalCrestUrl(provider.home.providerTeamId),
    time_fora_logo: apiFootballLocalCrestUrl(provider.away.providerTeamId),
    fonte: SPORTS_DATA_PROVIDERS.API_FOOTBALL,
    sincronizado_em: observedAt,
  };
}

export function buildApiFootballSyncPlan({ canonicalGames = [], providerGames = [], requestedMatchIds = [], observedAt = new Date().toISOString() }) {
  const requested = new Set(requestedMatchIds.map(Number).filter(Number.isInteger));
  const scoped = requested.size ? canonicalGames.filter((game) => requested.has(Number(game.id_jogo))) : canonicalGames;
  const mapped = scoped.filter((game) => game.api_football_id && game.api_football_time_casa_id && game.api_football_time_fora_id);
  if (requested.size && mapped.length !== requested.size) throw new Error("api_football_mapping_incomplete");
  if (!mapped.length) throw new Error("api_football_mapping_empty");
  const byFixture = new Map(providerGames.map((game) => [Number(game.providerFixtureId), game]));
  const missing = mapped.filter((game) => !byFixture.has(Number(game.api_football_id)));
  if (missing.length) throw new Error(`api_football_fixture_missing:${missing.map((game) => game.id_jogo).join(",")}`);
  const repairs = [];
  const updates = mapped.map((canonicalGame) => {
    const provider = byFixture.get(Number(canonicalGame.api_football_id));
    const candidate = apiFootballGameForCanonical(provider, canonicalGame, observedAt);
    const scheduled = sanitizeGameSchedule(candidate, canonicalGame, repairs);
    const sanitized = sanitizeGameForStatus(scheduled, canonicalGame, repairs);
    return evolveEstimatedLiveClock(sanitized, canonicalGame, {}, observedAt);
  });
  const changed = updates.filter((update, index) => {
    const current = mapped[index];
    return ["inicio", "status", "gols_casa", "gols_fora", "minuto", "acrescimos", "local_partida", "time_casa_logo", "time_fora_logo"]
      .some((field) => (update[field] ?? null) !== (current[field] ?? null));
  });
  return { provider: SPORTS_DATA_PROVIDERS.API_FOOTBALL, scopedCount: scoped.length, mappedCount: mapped.length,
    unmappedCount: scoped.length - mapped.length, updates, changedCount: changed.length, repairs };
}

export function scopeApiFootballSyncGames(canonicalGames = [], requestedMatchIds = []) {
  const requested = new Set(requestedMatchIds.map(Number).filter(Number.isInteger));
  if (requested.size) return canonicalGames.filter((game) => requested.has(Number(game.id_jogo)));
  return canonicalGames.filter((game) => !TERMINAL_STATUSES.has(String(game?.status || "").toLowerCase()));
}

export async function syncApiFootballGames(options = {}) {
  const startedAt = Date.now();
  const trigger = options.trigger || "manual";
  const requested = new Set((options.matchIds || []).map(Number).filter(Number.isInteger));
  const supabase = serviceClient();
  let query = supabase.from("jogos").select("id_jogo,rodada,time_casa,time_fora,inicio,status,gols_casa,gols_fora,minuto_estimado,periodo_estimado,relogio_referencia_em,situacao_agendamento,fonte_agendamento,agendamento_confirmado_em,data_base,local_partida,time_casa_id,time_fora_id,time_casa_logo,time_fora_logo,api_football_id,api_football_time_casa_id,api_football_time_fora_id");
  if (requested.size) query = query.in("id_jogo", [...requested]);
  const { data: canonical, error: canonicalError } = await query;
  if (canonicalError) throw new Error(`Supabase: ${canonicalError.message}`);
  const observedAt = new Date().toISOString();
  const { response, payload } = await request(`/fixtures?league=${API_FOOTBALL_LEAGUE_ID}&season=${SEASON_YEAR}`);
  const normalized = normalizeApiFootballFixturesEnvelope(payload, { observedAt, httpStatus: response.status, headers: response.headers });
  if (!normalized.observation.responseValid) throw new Error(normalized.observation.errors[0] || "fixtures_response_invalid");
  assertApiFootballQuota(normalized.observation);
  const scopedCanonical = scopeApiFootballSyncGames(canonical || [], [...requested]);
  const plan = buildApiFootballSyncPlan({ canonicalGames: scopedCanonical, providerGames: normalized.games,
    requestedMatchIds: [...requested], observedAt });
  const merged = plan.updates;
  const { error: writeError } = await supabase.from("jogos").upsert(merged, { onConflict: "id_jogo" });
  if (writeError) throw new Error(`Supabase: ${writeError.message}`);
  const report = {
    ok: true, provider: SPORTS_DATA_PROVIDERS.API_FOOTBALL, imported: merged.length,
    unmappedSkipped: plan.unmappedCount, repairedCount: plan.repairs.length,
    terminalSkipped: requested.size ? 0 : (canonical || []).length - scopedCanonical.length,
    repairs: plan.repairs.slice(0, 50), apiCalls: 1, syncMode: requested.size ? "live" : "full",
    requestedMatches: requested.size, atomicUpdate: true, trigger, durationMs: Date.now() - startedAt, synchronizedAt: observedAt,
    quota: { dailyLimit: normalized.observation.dailyLimit, dailyRemaining: normalized.observation.dailyRemaining,
      minuteLimit: normalized.observation.minuteLimit, minuteRemaining: normalized.observation.minuteRemaining },
  };
  const { error: logError } = await supabase.from("api_sync_log").insert({ origem: trigger, sucesso: true,
    duracao_ms: report.durationMs, chamadas_api: 1, jogos_atualizados: merged.length, detalhes: report });
  if (logError && !isMissingTableError(logError)) console.warn("Falha ao registrar sincronização:", logError.message);
  return report;
}

export async function apiFootballClassification(fetchImpl = fetch) {
  const observedAt = new Date().toISOString();
  const { response, payload } = await request(`/standings?league=${API_FOOTBALL_LEAGUE_ID}&season=${SEASON_YEAR}`, fetchImpl);
  const normalized = normalizeApiFootballStandingsEnvelope(payload, { observedAt, httpStatus: response.status, headers: response.headers });
  if (!normalized.observation.responseValid || !normalized.standings) throw new Error(normalized.observation.errors[0] || "standings_response_invalid");
  assertApiFootballQuota(normalized.observation);
  return apiFootballClassificationResult(normalized.standings, observedAt);
}

export function apiFootballClassificationResult(standing, observedAt = new Date().toISOString()) {
  return {
    id: providerClassificationSnapshotId(CLASSIFICATION_SNAPSHOT_ID, SPORTS_DATA_PROVIDERS.API_FOOTBALL),
    result: { ok: true, competition: standing.competitionName, season: String(standing.season), currentMatchday: standing.currentRound,
      updatedAt: observedAt, source: "api", provider: SPORTS_DATA_PROVIDERS.API_FOOTBALL,
      table: standing.table.map((row) => ({ position: row.position, teamId: row.providerTeamId, team: row.teamName,
        crest: apiFootballLocalCrestUrl(row.providerTeamId), playedGames: row.played, won: row.won, draw: row.drawn, lost: row.lost,
        points: row.points, goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference })) },
  };
}
