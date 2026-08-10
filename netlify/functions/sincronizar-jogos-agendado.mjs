import { syncGames } from "./_sync-shared.mjs";
import { serviceClient, isMissingTableError, safeErrorMessage } from "./_api-helpers.mjs";
import { MAX_API_CALLS_PER_SYNC, MAINTENANCE_INTERVAL_MS } from "./_constants.mjs";

const TERMINAL_STATUSES = new Set(["encerrado", "adiado", "cancelado"]);

export function selectNearbyMatchIds(games = []) {
  return [...new Set((Array.isArray(games) ? games : [])
    .filter((game) => !TERMINAL_STATUSES.has(String(game?.status || "").toLowerCase()))
    .map((game) => Number(game?.id_jogo))
    .filter((id) => Number.isInteger(id) && id > 0))];
}

async function shouldSynchronize() {
  const supabase = serviceClient();
  const now = Date.now();
  const windowStart = new Date(now - 4 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 90 * 60 * 1000).toISOString();

  const { data: nearby, error: gamesError } = await supabase
    .from("jogos")
    .select("id_jogo,status,inicio")
    .gte("inicio", windowStart)
    .lte("inicio", windowEnd);
  if (gamesError) throw gamesError;
  const matchIds = selectNearbyMatchIds(nearby);
  if (matchIds.length) return { run: true, reason: "janela_de_jogo", mode: "live", matchIds };

  const { data: logs, error: logError } = await supabase
    .from("api_sync_log")
    .select("criado_em")
    .eq("sucesso", true)
    .order("criado_em", { ascending: false })
    .limit(1);

  if (logError) {
    if (isMissingTableError(logError)) return { run: true, reason: "log_ainda_nao_configurado" };
    throw logError;
  }
  const last = logs?.[0]?.criado_em ? new Date(logs[0].criado_em).getTime() : 0;
  return { run: !last || now - last >= MAINTENANCE_INTERVAL_MS, reason: "manutencao_6h", mode: "full", matchIds: [] };
}

export default async () => {
  try {
    const decision = await shouldSynchronize();
    if (!decision.run) {
      console.log("Sincronização ignorada: fora da janela de jogos e manutenção ainda recente.");
      return;
    }
    const result = await syncGames({
      trigger: `agendado:${decision.reason}`,
      maxApiCalls: MAX_API_CALLS_PER_SYNC,
      matchIds: decision.matchIds,
    });
    console.log("Sincronização concluída:", result);
  } catch (error) {
    console.error("Falha na sincronização:", error);
    try {
      const supabase = serviceClient();
      const { error: logError } = await supabase.from("api_sync_log").insert({
        origem: "agendado",
        sucesso: false,
        erro: safeErrorMessage(error),
      });
      if (logError && !isMissingTableError(logError)) console.warn(logError.message);
    } catch (_) {}
    throw error;
  }
};
