import {
  normalizeApiFootballFixturesEnvelope,
  normalizeApiFootballStandingsEnvelope,
} from "../../src/sports-data/api-football-adapter.mjs";
import { officialSnapshot, shadowSnapshot, sha256 } from "./_api-football-shadow.mjs";
import { CLASSIFICATION_SNAPSHOT_ID } from "./_constants.mjs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const DAILY_RESERVE_RATIO = 0.2;
const MINUTE_RESERVE_RATIO = 0.1;
const MAX_SCHEDULE_DIFFERENCE_MS = 30 * 60_000;
const OFFICIAL_STANDINGS_MAX_AGE_MS = 60 * 60_000;
const TERMINAL = new Set(["encerrado", "adiado", "cancelado", "finished", "postponed", "cancelled"]);

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function errorCode(error) {
  return String(error?.message || "round_shadow_failed").split(":")[0];
}

function dateInSaoPaulo(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

export function evaluateRoundShadowWindow(games, instant = new Date()) {
  const scheduled = games
    .map((game) => ({ ...game, kickoff: new Date(game.inicio).getTime() }))
    .filter((game) => Number.isFinite(game.kickoff))
    .sort((a, b) => a.kickoff - b.kickoff);
  if (!scheduled.length) return { run: false, reason: "schedule_empty", cadenceMinutes: null };
  const now = instant.getTime();
  const first = scheduled[0].kickoff;
  const last = scheduled.at(-1).kickoff;
  if (now < first - 15 * 60_000) return { run: false, reason: "before_active_window", cadenceMinutes: null };
  if (now <= last + 30 * 60_000) return { run: true, reason: "active_window", cadenceMinutes: 1 };
  const hasNonTerminal = scheduled.some((game) => !TERMINAL.has(String(game.status || "").toLowerCase()));
  if (hasNonTerminal && now <= last + 120 * 60_000) {
    return { run: true, reason: "extended_window", cadenceMinutes: 5 };
  }
  return { run: false, reason: hasNonTerminal ? "extension_exhausted" : "round_terminal", cadenceMinutes: null };
}

export function evaluateApiFootballQuota(observation = {}) {
  const dailyLimit = integer(observation.dailyLimit);
  const dailyRemaining = integer(observation.dailyRemaining);
  const minuteLimit = integer(observation.minuteLimit);
  const minuteRemaining = integer(observation.minuteRemaining);
  if ([dailyLimit, dailyRemaining, minuteLimit, minuteRemaining].some((value) => value == null || value < 0)) {
    return { allowed: false, reason: "quota_headers_invalid" };
  }
  if (dailyRemaining <= Math.ceil(dailyLimit * DAILY_RESERVE_RATIO)) {
    return { allowed: false, reason: "daily_reserve_reached" };
  }
  if (minuteRemaining <= Math.ceil(minuteLimit * MINUTE_RESERVE_RATIO)) {
    return { allowed: false, reason: "minute_reserve_reached" };
  }
  return { allowed: true, reason: null };
}

export function shouldInterruptRoundShadow({ consecutiveFailures = 0, observation } = {}) {
  if (Number(consecutiveFailures) >= 3) return { interrupt: true, reason: "three_consecutive_failures" };
  const quota = evaluateApiFootballQuota(observation);
  return { interrupt: !quota.allowed, reason: quota.reason };
}

export function reconcileRoundFixtures(canonicalGames, providerGames) {
  const byFixture = new Map(providerGames.map((game) => [Number(game.providerFixtureId), game]));
  if (byFixture.size !== providerGames.length) throw new Error("fixture_ids_duplicated");
  const pairs = canonicalGames.map((canonical) => {
    const fixtureId = integer(canonical.api_football_id);
    if (!fixtureId || !integer(canonical.api_football_time_casa_id) || !integer(canonical.api_football_time_fora_id)) {
      throw new Error("canonical_mapping_incomplete");
    }
    const provider = byFixture.get(fixtureId);
    if (!provider) throw new Error("mapped_fixture_missing");
    if (Number(provider.home.providerTeamId) !== Number(canonical.api_football_time_casa_id)
      || Number(provider.away.providerTeamId) !== Number(canonical.api_football_time_fora_id)) {
      throw new Error("mapped_identity_conflict");
    }
    if (!provider.status.isKnown) throw new Error("provider_status_unknown");
    if (Number(provider.competitionProviderId) !== 71 || Number(provider.season) !== 2026
      || Number(provider.roundNumber) !== Number(canonical.rodada)) {
      throw new Error("mapped_competition_conflict");
    }
    const scheduleDifferenceMs = Math.abs(new Date(provider.kickoffAt).getTime() - new Date(canonical.inicio).getTime());
    if (!Number.isFinite(scheduleDifferenceMs) || scheduleDifferenceMs > MAX_SCHEDULE_DIFFERENCE_MS) {
      throw new Error("mapped_schedule_conflict");
    }
    return { canonical, provider, scheduleDifferenceMinutes: scheduleDifferenceMs / 60_000 };
  });
  if (pairs.length !== providerGames.length) throw new Error("provider_fixture_set_unexpected");
  return pairs;
}

function officialStandingsSnapshot(cache, executionId, observedAt, round) {
  const table = Array.isArray(cache?.payload?.table) ? cache.payload.table : [];
  const normalized = { table: table.map((row) => ({
    position: row.position, teamId: row.teamId, team: row.team, playedGames: row.playedGames,
    won: row.won, draw: row.draw, lost: row.lost, points: row.points,
    goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference,
  })) };
  const ageMs = new Date(observedAt).getTime() - new Date(cache?.atualizado_em).getTime();
  const valid = table.length === 20 && new Set(table.map((row) => row.position)).size === 20
    && Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= OFFICIAL_STANDINGS_MAX_AGE_MS;
  return {
    execucao_id: executionId, fornecedor: "football-data.org", competicao_nome: "Campeonato Brasileiro Série A",
    temporada: 2026, rodada: round, observado_em: observedAt, quantidade_times: table.length,
    conteudo_normalizado: normalized, hash_relevante: sha256(normalized), valido: valid,
    erro_normalizacao: valid ? null : "official_standings_invalid_or_stale",
  };
}

function shadowStandingsSnapshot(standings, executionId, observedAt, round) {
  const normalized = { table: standings.table };
  return {
    execucao_id: executionId, fornecedor: "api-football", competicao_id_externo: standings.competitionProviderId,
    competicao_nome: standings.competitionName, temporada: standings.season, rodada: round,
    observado_em: observedAt, quantidade_times: standings.teamCount, conteudo_normalizado: normalized,
    hash_relevante: sha256(normalized), valido: true, erro_normalizacao: null,
  };
}

async function requestJson(fetchImpl, url, apiKey, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetchImpl(url, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
      const payload = await response.json().catch(() => null);
      return { response, payload, durationMs: Date.now() - startedAt, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }
  lastError.attempts = attempts;
  throw lastError;
}

async function updateExecution(supabase, id, values) {
  const { error } = await supabase.from("transicao_api_execucoes").update(values).eq("id", id);
  if (error) throw new Error(`round_execution_update_failed:${error.message}`);
}

export async function collectApiFootballRoundCycle({
  supabase, fetchImpl = fetch, apiKey, round, date, includeStandings = false,
  classificationMarker = null, idempotencyKey = null, campaign = null,
  trigger = "5b3a:test", now = () => new Date(), leagueId = 71, season = 2026,
}) {
  if (!apiKey) throw new Error("api_football_key_missing");
  if (!Number.isInteger(round) || round < 1 || round > 38) throw new Error("round_invalid");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error("date_invalid");
  const observedAt = now().toISOString();
  const { data: games, error: gamesError } = await supabase.from("jogos")
    .select("id_jogo,rodada,time_casa,time_fora,inicio,status,minuto,acrescimos,gols_casa,gols_fora,time_casa_id,time_fora_id,atualizado_em,sincronizado_em,api_football_id,api_football_time_casa_id,api_football_time_fora_id")
    .eq("rodada", round);
  if (gamesError) throw new Error(`round_games_read_failed:${gamesError.message}`);
  const dateGames = (games || []).filter((game) => dateInSaoPaulo(game.inicio) === date);
  if (!dateGames.length) throw new Error("round_date_games_empty");

  if (idempotencyKey != null && !/^[a-z0-9:_-]{10,160}$/i.test(idempotencyKey)) throw new Error("idempotency_key_invalid");
  const details = {
    modo: "rodada", gatilho: trigger, campanha: campaign, rodada: round, data: date,
    classificacao: includeStandings, classificacao_marco: classificationMarker,
  };
  const { data: execution, error: executionError } = await supabase.from("transicao_api_execucoes").insert({
    fase: "sombra_pre_corte", fonte_oficial: "football-data.org", fonte_sombra: "api-football",
    chave_idempotencia: idempotencyKey, detalhes: details,
  }).select("id").single();
  if (executionError?.code === "23505") throw new Error("round_execution_duplicate");
  if (executionError) throw new Error(`round_execution_insert_failed:${executionError.message}`);

  let calls = 0;
  try {
    const fixtureRequest = await requestJson(fetchImpl,
      `${API_FOOTBALL_BASE}/fixtures?league=${leagueId}&season=${season}&date=${date}&timezone=America%2FSao_Paulo`, apiKey);
    calls += fixtureRequest.attempts;
    const normalized = normalizeApiFootballFixturesEnvelope(fixtureRequest.payload, {
      expectedCount: dateGames.length, observedAt, httpStatus: fixtureRequest.response.status,
      durationMs: fixtureRequest.durationMs, headers: fixtureRequest.response.headers,
    });
    if (!normalized.observation.responseValid) throw new Error(normalized.observation.errors[0] || "fixtures_response_invalid");
    const quota = evaluateApiFootballQuota(normalized.observation);
    if (!quota.allowed) throw new Error(quota.reason);
    const pairs = reconcileRoundFixtures(dateGames, normalized.games);
    const snapshots = pairs.flatMap(({ canonical, provider }) => [
      officialSnapshot(canonical, execution.id, observedAt),
      shadowSnapshot(provider, execution.id, canonical.id_jogo, observedAt),
    ]);
    if (!snapshots.every((snapshot) => snapshot.valido)) throw new Error("round_snapshot_invalid");

    let classificationRows = [];
    let standingsObservation = null;
    if (includeStandings) {
      const { data: cache, error: cacheError } = await supabase.from("classificacao_cache")
        .select("payload,atualizado_em").eq("id", CLASSIFICATION_SNAPSHOT_ID).maybeSingle();
      if (cacheError) throw new Error(`official_standings_read_failed:${cacheError.message}`);
      const standingsRequest = await requestJson(fetchImpl,
        `${API_FOOTBALL_BASE}/standings?league=${leagueId}&season=${season}`, apiKey);
      calls += standingsRequest.attempts;
      const normalizedStandings = normalizeApiFootballStandingsEnvelope(standingsRequest.payload, {
        observedAt, httpStatus: standingsRequest.response.status, durationMs: standingsRequest.durationMs,
        headers: standingsRequest.response.headers,
      });
      standingsObservation = normalizedStandings.observation;
      if (!standingsObservation.responseValid || !normalizedStandings.standings) {
        throw new Error(standingsObservation.errors[0] || "standings_response_invalid");
      }
      const standingsQuota = evaluateApiFootballQuota(standingsObservation);
      if (!standingsQuota.allowed) throw new Error(standingsQuota.reason);
      classificationRows = [
        officialStandingsSnapshot(cache, execution.id, observedAt, round),
        shadowStandingsSnapshot(normalizedStandings.standings, execution.id, observedAt, round),
      ];
      if (!classificationRows.every((row) => row.valido)) throw new Error("standings_snapshot_invalid");
    }

    const { error: snapshotError } = await supabase.from("transicao_api_jogos").insert(snapshots);
    if (snapshotError) throw new Error(`round_snapshots_insert_failed:${snapshotError.message}`);
    if (classificationRows.length) {
      const { error: classificationError } = await supabase.from("transicao_api_classificacoes").insert(classificationRows);
      if (classificationError) throw new Error(`round_standings_insert_failed:${classificationError.message}`);
    }
    const finalObservation = standingsObservation || normalized.observation;
    await updateExecution(supabase, execution.id, {
      concluida_em: now().toISOString(), sucesso_oficial: true, sucesso_sombra: true,
      chamadas_sombra: calls, duracao_sombra_ms: normalized.observation.durationMs,
      cota_sombra_limite: finalObservation.dailyLimit, cota_sombra_restante: finalObservation.dailyRemaining,
      jogos_oficial: pairs.length, jogos_sombra: pairs.length,
      classificacoes_oficial: classificationRows.length ? 1 : 0,
      classificacoes_sombra: classificationRows.length ? 1 : 0,
      detalhes: {
        ...details, fixtures: pairs.length, tentativas: calls,
        maior_diferenca_agenda_minutos: Math.max(...pairs.map((pair) => pair.scheduleDifferenceMinutes)),
      },
    });
    return { ok: true, executionId: execution.id, games: pairs.length, calls, standings: classificationRows.length === 2 };
  } catch (error) {
    calls += Number(error?.attempts || 0);
    await updateExecution(supabase, execution.id, {
      concluida_em: now().toISOString(), sucesso_oficial: false, sucesso_sombra: false,
      chamadas_sombra: calls, erros_sombra: [errorCode(error)], detalhes: { ...details, interrompida: errorCode(error) },
    }).catch(() => {});
    throw error;
  }
}
