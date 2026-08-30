import { serviceClient } from "./_api-helpers.mjs";
import { collectApiFootballRoundCycle, evaluateRoundShadowWindow } from "./_api-football-round-shadow.mjs";

const TERMINAL = new Set(["encerrado", "adiado", "cancelado"]);

function runtimeEnv(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name];
}

function localDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value);
}

export function parseRoundShadowConfig(get = runtimeEnv) {
  const enabled = get("API_FOOTBALL_SHADOW_ENABLED") === "true";
  const campaign = String(get("API_FOOTBALL_SHADOW_CAMPAIGN") || "").trim();
  const round = Number(get("API_FOOTBALL_SHADOW_ROUND"));
  const dates = String(get("API_FOOTBALL_SHADOW_DATES") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const valid = enabled && /^5b3-round-[a-z0-9-]+$/.test(campaign)
    && Number.isInteger(round) && round >= 1 && round <= 38
    && dates.length > 0 && dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  return { enabled, valid, campaign, round, dates };
}

function consecutiveFailures(history) {
  let count = 0;
  for (const execution of history) {
    if (execution.sucesso_sombra === true) break;
    count += 1;
  }
  return count;
}

function allGamesTerminal(games) {
  return games.length > 0
    && games.every((game) => TERMINAL.has(String(game.status || "").toLowerCase()));
}

export function allowTerminalFinalCycle(games, instant, window) {
  if (window.reason !== "round_terminal" || !games.length) return false;
  return allGamesTerminal(games);
}

async function markerExists(supabase, campaign, date, marker) {
  const { data: rows, error } = await supabase.from("transicao_api_execucoes")
    .select("id")
    .eq("fase", "sombra_pre_corte")
    .contains("detalhes", { campanha: campaign, data: date, classificacao_marco: marker })
    .limit(1);
  if (error) throw new Error(`scheduled_round_marker_read_failed:${error.message}`);
  return (rows || []).length > 0;
}

async function pendingRecoveryDate(supabase, games, config, currentDate) {
  const previousDates = config.dates.filter((date) => date < currentDate).sort().reverse();
  for (const date of previousDates) {
    const dateGames = games.filter((game) => localDate(new Date(game.inicio)) === date);
    if (!allGamesTerminal(dateGames)) continue;
    if (!await markerExists(supabase, config.campaign, date, "fim")) return date;
  }
  return null;
}

export async function runScheduledRoundShadow({
  supabase, fetchImpl = fetch, apiKey, config, now = () => new Date(),
  collectRoundCycle = collectApiFootballRoundCycle,
}) {
  if (!config.enabled) return { ok: true, skipped: "shadow_disabled" };
  if (!config.valid) return { ok: false, skipped: "shadow_config_invalid" };
  const instant = now();
  const currentDate = localDate(instant);
  if (!config.dates.includes(currentDate)) return { ok: true, skipped: "date_not_authorized" };
  if (!apiKey) return { ok: false, skipped: "api_key_missing" };

  const { data: games, error: gamesError } = await supabase.from("jogos")
    .select("id_jogo,inicio,status").eq("rodada", config.round);
  if (gamesError) throw new Error(`scheduled_round_games_read_failed:${gamesError.message}`);
  const recoveryDate = await pendingRecoveryDate(supabase, games || [], config, currentDate);
  const date = recoveryDate || currentDate;
  const dateGames = (games || []).filter((game) => localDate(new Date(game.inicio)) === date);
  const window = evaluateRoundShadowWindow(dateGames, instant);
  const terminalFinalCandidate = allowTerminalFinalCycle(dateGames, instant, window);
  if (!window.run && !terminalFinalCandidate) return { ok: true, skipped: window.reason };
  if (window.cadenceMinutes === 5 && instant.getUTCMinutes() % 5 !== 0) {
    return { ok: true, skipped: "extended_cadence_wait" };
  }

  const { data: history, error: historyError } = await supabase.from("transicao_api_execucoes")
    .select("sucesso_sombra,classificacoes_sombra,detalhes,iniciada_em")
    .eq("fase", "sombra_pre_corte").contains("detalhes", { campanha: config.campaign, data: date })
    .order("iniciada_em", { ascending: false }).limit(20);
  if (historyError) throw new Error(`scheduled_round_history_read_failed:${historyError.message}`);
  if (consecutiveFailures(history || []) >= 3) return { ok: false, skipped: "three_consecutive_failures" };

  const allTerminal = allGamesTerminal(dateGames);
  const hasStartMarker = await markerExists(supabase, config.campaign, date, "inicio");
  const hasFinishMarker = allTerminal
    ? await markerExists(supabase, config.campaign, date, "fim") : false;
  const classificationMarker = !hasStartMarker ? "inicio"
    : allTerminal && !hasFinishMarker ? "fim" : null;
  if (terminalFinalCandidate && classificationMarker == null) {
    return { ok: true, skipped: "round_terminal" };
  }
  const minuteKey = instant.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  try {
    return await collectRoundCycle({
      supabase, fetchImpl, apiKey, round: config.round, date,
      includeStandings: classificationMarker != null, classificationMarker,
      idempotencyKey: `${config.campaign}:${date}:${minuteKey}`,
      campaign: config.campaign, trigger: "agendado:5b3b", now,
    });
  } catch (error) {
    if (error?.message === "round_execution_duplicate") return { ok: true, skipped: "duplicate_cycle" };
    throw error;
  }
}

export default async () => {
  const config = parseRoundShadowConfig();
  try {
    const result = await runScheduledRoundShadow({
      supabase: config.enabled && config.valid ? serviceClient() : null,
      apiKey: runtimeEnv("API_FOOTBALL_KEY"), config,
    });
    console.log("Sombra de rodada:", result);
  } catch (error) {
    console.error("Sombra de rodada interrompida:", String(error?.message || "round_shadow_failed").split(":")[0]);
    throw error;
  }
};
