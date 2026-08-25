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

export function allowTerminalFinalCycle(games, instant, window) {
  if (window.reason !== "round_terminal" || !games.length) return false;
  const lastKickoff = Math.max(...games.map((game) => new Date(game.inicio).getTime()));
  return Number.isFinite(lastKickoff) && instant.getTime() <= lastKickoff + 120 * 60_000;
}

export async function runScheduledRoundShadow({
  supabase, fetchImpl = fetch, apiKey, config, now = () => new Date(),
}) {
  if (!config.enabled) return { ok: true, skipped: "shadow_disabled" };
  if (!config.valid) return { ok: false, skipped: "shadow_config_invalid" };
  const instant = now();
  const date = localDate(instant);
  if (!config.dates.includes(date)) return { ok: true, skipped: "date_not_authorized" };
  if (!apiKey) return { ok: false, skipped: "api_key_missing" };

  const { data: games, error: gamesError } = await supabase.from("jogos")
    .select("id_jogo,inicio,status").eq("rodada", config.round);
  if (gamesError) throw new Error(`scheduled_round_games_read_failed:${gamesError.message}`);
  const dateGames = (games || []).filter((game) => localDate(new Date(game.inicio)) === date);
  const window = evaluateRoundShadowWindow(dateGames, instant);
  const terminalFinalCandidate = allowTerminalFinalCycle(dateGames, instant, window);
  if (!window.run && !terminalFinalCandidate) return { ok: true, skipped: window.reason };
  if (window.cadenceMinutes === 5 && instant.getUTCMinutes() % 5 !== 0) {
    return { ok: true, skipped: "extended_cadence_wait" };
  }

  const { data: history, error: historyError } = await supabase.from("transicao_api_execucoes")
    .select("sucesso_sombra,classificacoes_sombra,detalhes,iniciada_em")
    .eq("fase", "sombra_pre_corte").contains("detalhes", { campanha: config.campaign, data })
    .order("iniciada_em", { ascending: false }).limit(20);
  if (historyError) throw new Error(`scheduled_round_history_read_failed:${historyError.message}`);
  if (consecutiveFailures(history || []) >= 3) return { ok: false, skipped: "three_consecutive_failures" };

  const markers = new Set((history || []).filter((item) => item.classificacoes_sombra === 1)
    .map((item) => item.detalhes?.classificacao_marco).filter(Boolean));
  const allTerminal = dateGames.length > 0
    && dateGames.every((game) => TERMINAL.has(String(game.status || "").toLowerCase()));
  const classificationMarker = !markers.has("inicio") ? "inicio"
    : allTerminal && !markers.has("fim") ? "fim" : null;
  if (terminalFinalCandidate && classificationMarker == null) {
    return { ok: true, skipped: "round_terminal" };
  }
  const minuteKey = instant.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  try {
    return await collectApiFootballRoundCycle({
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
