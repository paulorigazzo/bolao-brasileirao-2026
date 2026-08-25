import { createHash } from "node:crypto";
import { normalizeApiFootballFixtureEnvelope } from "../../src/sports-data/api-football-adapter.mjs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const OFFICIAL_PROVIDER = "football-data.org";
const SHADOW_PROVIDER = "api-football";
const officialStatuses = new Map([
  ["agendado", "scheduled"], ["em_andamento", "live"], ["intervalo", "halftime"],
  ["adiado", "postponed"], ["cancelado", "cancelled"], ["encerrado", "finished"],
]);

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${name}_invalid`);
  return number;
}

export function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function absent(values) {
  return Object.entries(values).filter(([, value]) => value == null || value === "").map(([key]) => key);
}

export function officialSnapshot(game, executionId, observedAt) {
  const status = officialStatuses.get(String(game.status || "").toLowerCase()) || "unknown";
  const missing = absent({ home: game.time_casa, away: game.time_fora, kickoff: game.inicio });
  const relevant = {
    id: Number(game.id_jogo), home: game.time_casa, away: game.time_fora, kickoff: game.inicio,
    status, minute: game.minuto, extra: game.acrescimos, homeScore: game.gols_casa, awayScore: game.gols_fora,
  };
  return {
    execucao_id: executionId, fornecedor: OFFICIAL_PROVIDER, id_jogo: Number(game.id_jogo),
    id_externo: Number(game.id_jogo),
    time_casa_id_externo: game.time_casa_id == null ? null : Number(game.time_casa_id),
    time_fora_id_externo: game.time_fora_id == null ? null : Number(game.time_fora_id),
    time_casa_nome: game.time_casa, time_fora_nome: game.time_fora,
    competicao_nome: "Campeonato Brasileiro Série A", temporada: 2026,
    rodada: game.rodada == null ? null : Number(game.rodada), inicio_previsto: game.inicio,
    status_original: game.status || "desconhecido", status_normalizado: status,
    minuto: game.minuto, acrescimos: game.acrescimos, gols_casa: game.gols_casa, gols_fora: game.gols_fora,
    fornecedor_atualizado_em: game.sincronizado_em || game.atualizado_em || null,
    observado_em: observedAt, hash_relevante: sha256(relevant), campos_ausentes: missing,
    erro_normalizacao: status === "unknown" ? "official_status_unknown" : null,
    valido: missing.length === 0 && status !== "unknown",
  };
}

export function shadowSnapshot(game, executionId, canonicalGameId, observedAt) {
  const missing = absent({ fixture: game.providerFixtureId, home: game.home.name, away: game.away.name, kickoff: game.kickoffAt });
  const relevant = {
    id: game.providerFixtureId, home: game.home.providerTeamId, away: game.away.providerTeamId,
    kickoff: game.kickoffAt, status: game.status.normalized, minute: game.clock.elapsed,
    extra: game.clock.extra, score: game.score,
  };
  return {
    execucao_id: executionId, fornecedor: SHADOW_PROVIDER, id_jogo: canonicalGameId,
    id_externo: game.providerFixtureId, time_casa_id_externo: game.home.providerTeamId,
    time_fora_id_externo: game.away.providerTeamId, time_casa_nome: game.home.name,
    time_fora_nome: game.away.name, competicao_id_externo: game.competitionProviderId,
    competicao_nome: "Campeonato Brasileiro Série A", temporada: game.season,
    rodada: game.roundNumber, rodada_original: game.roundRaw, inicio_previsto: game.kickoffAt,
    status_original: game.status.rawCode || "desconhecido", status_normalizado: game.status.normalized,
    minuto: game.clock.elapsed, acrescimos: game.clock.extra, gols_casa: game.score.home, gols_fora: game.score.away,
    intervalo_casa: game.score.halftimeHome, intervalo_fora: game.score.halftimeAway,
    final_casa: game.score.fulltimeHome, final_fora: game.score.fulltimeAway,
    prorrogacao_casa: game.score.extraTimeHome, prorrogacao_fora: game.score.extraTimeAway,
    penaltis_casa: game.score.penaltyHome, penaltis_fora: game.score.penaltyAway,
    fornecedor_atualizado_em: null, observado_em: observedAt, hash_relevante: sha256(relevant),
    campos_ausentes: missing, erro_normalizacao: null, valido: missing.length === 0 && game.status.isKnown,
  };
}

async function updateExecution(supabase, id, values) {
  const { error } = await supabase.from("transicao_api_execucoes").update(values).eq("id", id);
  if (error) throw new Error(`shadow_execution_update_failed:${error.message}`);
}

export async function collectApiFootballShadowMatch({
  supabase, fetchImpl = fetch, apiKey, canonicalGameId, fixtureId, trigger, now = () => new Date(),
}) {
  const gameId = positiveInteger(canonicalGameId, "canonical_game_id");
  const providerFixtureId = positiveInteger(fixtureId, "fixture_id");
  if (!apiKey) throw new Error("api_football_key_missing");
  const observedAt = now().toISOString();
  const totalStartedAt = Date.now();
  const { data: officialGame, error: officialError } = await supabase.from("jogos")
    .select("id_jogo,rodada,time_casa,time_fora,inicio,status,minuto,acrescimos,gols_casa,gols_fora,time_casa_id,time_fora_id,atualizado_em,sincronizado_em")
    .eq("id_jogo", gameId).maybeSingle();
  if (officialError) throw new Error(`official_snapshot_read_failed:${officialError.message}`);
  if (!officialGame) throw new Error("canonical_game_not_found");

  const baseDetails = { modo: "manual", gatilho: trigger, id_jogo: gameId, fixture_id: providerFixtureId };
  const { data: execution, error: executionError } = await supabase.from("transicao_api_execucoes").insert({
    fase: "ensaio", fonte_oficial: OFFICIAL_PROVIDER, fonte_sombra: SHADOW_PROVIDER,
    chamadas_oficial: 0, chamadas_sombra: 0, jogos_oficial: 0, jogos_sombra: 0, detalhes: baseDetails,
  }).select("id").single();
  if (executionError) throw new Error(`shadow_execution_insert_failed:${executionError.message}`);

  try {
    const requestStartedAt = Date.now();
    const response = await fetchImpl(`${API_FOOTBALL_BASE}/fixtures?id=${providerFixtureId}`, {
      headers: { "x-apisports-key": apiKey, Accept: "application/json" },
    });
    const durationMs = Date.now() - requestStartedAt;
    const payload = await response.json().catch(() => null);
    const normalized = normalizeApiFootballFixtureEnvelope(payload, {
      requestedFixtureId: providerFixtureId, canonicalGameId: gameId, observedAt,
      httpStatus: response.status, durationMs, headers: response.headers,
    });
    const observation = normalized.observation;
    if (!observation.responseValid || !normalized.game) {
      await updateExecution(supabase, execution.id, {
        concluida_em: now().toISOString(), sucesso_oficial: true, sucesso_sombra: false,
        duracao_oficial_ms: 0, duracao_sombra_ms: durationMs, chamadas_sombra: 1,
        cota_sombra_limite: observation.dailyLimit, cota_sombra_restante: observation.dailyRemaining,
        jogos_oficial: 1, erros_sombra: observation.errors,
        detalhes: { ...baseDetails, avisos: observation.warnings },
      });
      return { ok: false, status: 409, executionId: execution.id, errors: observation.errors };
    }

    const snapshots = [officialSnapshot(officialGame, execution.id, observedAt), shadowSnapshot(normalized.game, execution.id, gameId, observedAt)];
    const { error: snapshotsError } = await supabase.from("transicao_api_jogos").insert(snapshots);
    if (snapshotsError) throw new Error(`shadow_snapshots_insert_failed:${snapshotsError.message}`);
    const valid = snapshots.every((snapshot) => snapshot.valido);
    await updateExecution(supabase, execution.id, {
      concluida_em: now().toISOString(), sucesso_oficial: snapshots[0].valido, sucesso_sombra: snapshots[1].valido,
      duracao_oficial_ms: 0, duracao_sombra_ms: durationMs, chamadas_sombra: 1,
      cota_sombra_limite: observation.dailyLimit, cota_sombra_restante: observation.dailyRemaining,
      jogos_oficial: 1, jogos_sombra: 1,
      erros_oficial: snapshots[0].erro_normalizacao ? [snapshots[0].erro_normalizacao] : [], erros_sombra: [],
      detalhes: { ...baseDetails, avisos: observation.warnings, duracao_total_ms: Date.now() - totalStartedAt },
    });
    return {
      ok: valid, status: valid ? 200 : 409, executionId: execution.id, canonicalGameId: gameId,
      fixtureId: providerFixtureId, normalizedStatus: normalized.game.status.normalized,
      score: { home: normalized.game.score.home, away: normalized.game.score.away },
      clock: { elapsed: normalized.game.clock.elapsed, extra: normalized.game.clock.extra },
      quota: { dailyLimit: observation.dailyLimit, dailyRemaining: observation.dailyRemaining },
      warnings: observation.warnings,
    };
  } catch (error) {
    await updateExecution(supabase, execution.id, {
      concluida_em: now().toISOString(), sucesso_oficial: true, sucesso_sombra: false,
      chamadas_sombra: 1, jogos_oficial: 1,
      erros_sombra: [String(error?.message || "shadow_collection_failed").split(":")[0]],
    }).catch(() => {});
    throw error;
  }
}
