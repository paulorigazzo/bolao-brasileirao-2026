import { buildEventPersistence, evaluateApiFootballQuota } from "../../netlify/functions/_api-football-round-shadow.mjs";
import { sha256 } from "../../netlify/functions/_api-football-shadow.mjs";

export const EVENT_REPROCESSING = Object.freeze({ leagueId: 71, season: 2026, pilotRound: 25,
  expectedMappedGames: 255, expectedPilotGames: 10, maximumScheduleDifferenceMinutes: 30,
  applyConfirmation: "REPROCESS_EVENTS_ROUND_25" });

const integer = (value) => Number.isInteger(Number(value)) ? Number(value) : null;
const mapped = (game) => integer(game?.api_football_id) > 0
  && integer(game?.api_football_time_casa_id) > 0 && integer(game?.api_football_time_fora_id) > 0;
const saoPauloDate = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo",
  year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

function pairGames(canonicalGames, providerGames) {
  const providers = new Map(providerGames.map((game) => [integer(game.providerFixtureId), game]));
  if (providers.size !== providerGames.length) throw new Error("fixture_ids_duplicated");
  return canonicalGames.filter(mapped).map((canonical) => {
    const provider = providers.get(integer(canonical.api_football_id));
    if (!provider) throw new Error(`mapped_fixture_missing:${canonical.id_jogo}`);
    if (integer(provider.home?.providerTeamId) !== integer(canonical.api_football_time_casa_id)
      || integer(provider.away?.providerTeamId) !== integer(canonical.api_football_time_fora_id))
      throw new Error(`mapped_identity_conflict:${canonical.id_jogo}`);
    if (integer(provider.competitionProviderId) !== 71 || integer(provider.season) !== 2026
      || integer(provider.roundNumber) !== integer(canonical.rodada))
      throw new Error(`mapped_competition_conflict:${canonical.id_jogo}`);
    const difference = Math.abs(new Date(provider.kickoffAt) - new Date(canonical.inicio)) / 60_000;
    if (!Number.isFinite(difference) || difference > EVENT_REPROCESSING.maximumScheduleDifferenceMinutes)
      throw new Error(`mapped_schedule_conflict:${canonical.id_jogo}`);
    return { canonical, provider, difference };
  });
}

export function buildEventReprocessingManifest({ canonicalGames, providerGames, observation, observedAt, scope = "historical" }) {
  if (!new Set(["historical", "round25"]).has(scope)) throw new Error("event_reprocessing_scope_invalid");
  const quota = evaluateApiFootballQuota(observation);
  if (!quota.allowed) throw new Error(`event_reprocessing_${quota.reason}`);
  const all = pairGames(canonicalGames, providerGames);
  if (all.length !== 255) throw new Error(`mapped_game_count_unexpected:${all.length}`);
  const selected = scope === "round25" ? all.filter(({ canonical }) => canonical.rodada === 25) : all;
  if (scope === "round25" && selected.length !== 10) throw new Error(`pilot_game_count_unexpected:${selected.length}`);
  const categoryTotals = { gol: 0, cartao: 0, substituicao: 0, var: 0, desconhecido: 0 };
  const unknown = new Map();
  const games = selected.map(({ canonical, provider, difference }) => {
    const persistence = buildEventPersistence(provider, canonical.id_jogo, 1, observedAt);
    for (const event of persistence.events) {
      categoryTotals[event.categoria_normalizada] += 1;
      if (event.categoria_normalizada === "desconhecido") {
        const key = `${event.tipo_original || ""}|${event.detalhe_original || ""}`;
        unknown.set(key, (unknown.get(key) || 0) + 1);
      }
    }
    return { idJogo: canonical.id_jogo, fixtureId: provider.providerFixtureId, round: canonical.rodada,
      date: saoPauloDate(canonical.inicio), scheduleDifferenceMinutes: difference,
      eventListAvailable: persistence.lot.lista_disponivel, eventListValid: persistence.lot.valido,
      eventCount: persistence.lot.quantidade_eventos, eventListHash: persistence.lot.hash_lista,
      warnings: persistence.lot.avisos };
  }).sort((a, b) => a.idJogo - b.idJogo);
  const stable = { contract: "api-football-events-reprocessing-v1", scope, leagueId: 71, season: 2026,
    gameCount: games.length, eventCount: games.reduce((sum, game) => sum + game.eventCount, 0), categoryTotals,
    unknownTypes: [...unknown].map(([key, count]) => { const [type, detail] = key.split("|"); return { type, detail, count }; })
      .sort((a, b) => `${a.type}|${a.detail}`.localeCompare(`${b.type}|${b.detail}`)), games };
  return { ...stable, generatedAt: observedAt, quota: { dailyLimit: observation.dailyLimit,
    dailyRemaining: observation.dailyRemaining, minuteLimit: observation.minuteLimit,
    minuteRemaining: observation.minuteRemaining }, manifestHash: sha256(stable) };
}

export function assertEventReprocessingApply({ scope, confirmation, approvedHash, manifest }) {
  if (scope !== "round25") throw new Error("event_reprocessing_apply_scope_blocked");
  if (confirmation !== EVENT_REPROCESSING.applyConfirmation) throw new Error("event_reprocessing_confirmation_invalid");
  if (!/^[a-f0-9]{64}$/.test(String(approvedHash || ""))) throw new Error("event_reprocessing_approved_hash_invalid");
  if (approvedHash !== manifest?.manifestHash) throw new Error("event_reprocessing_manifest_changed");
  if (manifest.gameCount !== 10 || manifest.games.some((game) => !game.eventListAvailable || !game.eventListValid))
    throw new Error("event_reprocessing_pilot_incomplete");
  return true;
}

export async function persistEventReprocessingPilot({ supabase, canonicalGames, providerGames, observation,
  observedAt, manifest, approvedHash, confirmation, calls = 0 }) {
  assertEventReprocessingApply({ scope: "round25", confirmation, approvedHash, manifest });
  const pilot = canonicalGames.filter((game) => Number(game.rodada) === EVENT_REPROCESSING.pilotRound);
  const gameIds = pilot.map((game) => game.id_jogo);
  const existing = await supabase.from("transicao_api_eventos_lotes").select("id,id_jogo").in("id_jogo", gameIds).limit(1);
  if (existing.error) throw new Error(`event_reprocessing_preflight_failed:${existing.error.message}`);
  if ((existing.data || []).length) throw new Error("event_reprocessing_pilot_already_persisted");

  const providers = new Map(providerGames.map((game) => [Number(game.providerFixtureId), game]));
  const dates = [...new Set(pilot.map((game) => saoPauloDate(game.inicio)))].sort();
  const results = [];
  for (const date of dates) {
    const dateGames = pilot.filter((game) => saoPauloDate(game.inicio) === date);
    const details = { modo: "reprocessamento_eventos", campanha: "5b4c-round25-events", rodada: 25,
      data: date, manifest_hash: approvedHash, apenas_eventos: true };
    const insertion = await supabase.from("transicao_api_execucoes").insert({
      fase: "ensaio", fonte_oficial: "football-data.org", fonte_sombra: "api-football",
      chave_idempotencia: `5b4c:round25:${date}:${approvedHash.slice(0, 16)}`, detalhes: details,
    }).select("id").single();
    if (insertion.error?.code === "23505") throw new Error("event_reprocessing_execution_duplicate");
    if (insertion.error) throw new Error(`event_reprocessing_execution_failed:${insertion.error.message}`);
    const executionId = insertion.data.id;
    let eventCount = 0;
    try {
      for (const canonical of dateGames) {
        const provider = providers.get(Number(canonical.api_football_id));
        if (!provider) throw new Error(`event_reprocessing_fixture_missing:${canonical.id_jogo}`);
        const payload = buildEventPersistence(provider, canonical.id_jogo, executionId, observedAt);
        if (!payload.lot.lista_disponivel || !payload.lot.valido) throw new Error("event_reprocessing_event_list_invalid");
        const rpc = await supabase.rpc("registrar_lote_eventos_sombra", { p_lote: payload.lot, p_eventos: payload.events });
        if (rpc.error) throw new Error(`event_reprocessing_rpc_failed:${rpc.error.message}`);
        eventCount += payload.events.length;
      }
      const update = await supabase.from("transicao_api_execucoes").update({
        concluida_em: observedAt, sucesso_oficial: true, sucesso_sombra: true, chamadas_sombra: calls,
        cota_sombra_limite: observation.dailyLimit, cota_sombra_restante: observation.dailyRemaining,
        jogos_oficial: 0, jogos_sombra: 0, classificacoes_oficial: 0, classificacoes_sombra: 0,
        detalhes: { ...details, lotes_eventos: dateGames.length, eventos: eventCount },
      }).eq("id", executionId);
      if (update.error) throw new Error(`event_reprocessing_execution_update_failed:${update.error.message}`);
      results.push({ date, executionId, lots: dateGames.length, events: eventCount });
    } catch (error) {
      await supabase.from("transicao_api_execucoes").update({ concluida_em: observedAt,
        sucesso_oficial: false, sucesso_sombra: false, erros_sombra: [String(error.message).split(":")[0]],
        detalhes: { ...details, interrompida: String(error.message).split(":")[0] } }).eq("id", executionId);
      throw error;
    }
  }
  return { ok: true, executions: results.length, lots: results.reduce((sum, item) => sum + item.lots, 0),
    events: results.reduce((sum, item) => sum + item.events, 0), results };
}
