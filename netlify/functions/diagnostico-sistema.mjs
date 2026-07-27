import { jsonResponse, requireAdmin, methodNotAllowed, errorResponse } from "./_api-helpers.mjs";
import { APP_VERSION, CLASSIFICATION_SNAPSHOT_ID, CACHE_FRESH_MS, CACHE_STALE_MS, MAX_API_CALLS_PER_SYNC, SCHEDULE_CHECK_MINUTES, MAINTENANCE_INTERVAL_MS } from "./_constants.mjs";

const countTable = async (supabase, table) => {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  return error ? { ok: false, count: null, error: error.message } : { ok: true, count: count ?? 0 };
};

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const admin = await requireAdmin(request);
  if (!admin.ok) return jsonResponse({ ok: false, error: admin.error }, admin.status, { "cache-control": "no-store" });

  const startedAt = Date.now();
  const { supabase } = admin;
  try {
    const [logsResult, cacheResult, jogos, palpites, participantes] = await Promise.all([
      supabase.from("api_sync_log").select("id,criado_em,origem,sucesso,duracao_ms,chamadas_api,jogos_atualizados,erro,detalhes").order("criado_em", { ascending: false }).limit(20),
      supabase.from("classificacao_cache").select("id,atualizado_em,payload").eq("id", CLASSIFICATION_SNAPSHOT_ID).maybeSingle(),
      countTable(supabase, "jogos"),
      countTable(supabase, "palpites"),
      countTable(supabase, "participantes_autorizados"),
    ]);

    if (logsResult.error) throw new Error(`Logs: ${logsResult.error.message}`);
    const logs = logsResult.data || [];
    const last = logs[0] || null;
    const lastSuccess = logs.find((item) => item.sucesso) || null;
    // O cache oficial é gravado por classificacao-brasileirao.mjs com o id BSA-2026.
    // A v6.0.7 consultava "brasileirao-2026", causando um falso negativo no autoteste.
    let cache = cacheResult.error ? null : cacheResult.data;
    let cacheLookup = cache ? "expected-id" : "not-found";
    if (!cache && !cacheResult.error) {
      const latestResult = await supabase
        .from("classificacao_cache")
        .select("id,atualizado_em,payload")
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latestResult.error && latestResult.data) {
        cache = latestResult.data;
        cacheLookup = "latest-fallback";
      }
    }
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(Math.ceil((now.getMinutes() + 0.01) / SCHEDULE_CHECK_MINUTES) * SCHEDULE_CHECK_MINUTES);

    const cacheAgeMs = cache?.atualizado_em ? Date.now() - new Date(cache.atualizado_em).getTime() : null;
    const cacheTable = Array.isArray(cache?.payload?.table) ? cache.payload.table : [];
    const cacheAvailable = Boolean(cache?.payload) && cacheTable.length > 0;
    const cacheStatus = !cacheAvailable ? "missing" : cacheAgeMs <= CACHE_FRESH_MS ? "fresh" : cacheAgeMs <= CACHE_STALE_MS ? "stale" : "expired";
    const cacheSource = cache?.payload?.source || "football-data.org";
    const lastSuccessAgeMs = lastSuccess?.criado_em ? Date.now() - new Date(lastSuccess.criado_em).getTime() : null;
    const apiStatus = !lastSuccess ? "unknown" : (last?.sucesso === false && lastSuccessAgeMs > MAINTENANCE_INTERVAL_MS ? "degraded" : "online");

    const checks = [
      { id: "function", label: "Netlify Function respondeu", ok: true },
      { id: "supabase", label: "Supabase respondeu", ok: jogos.ok && palpites.ok && participantes.ok },
      { id: "games", label: "Jogos carregados", ok: jogos.ok && jogos.count > 0, detail: jogos.count },
      { id: "cache", label: cacheAvailable ? `Cache encontrado (${cacheTable.length} clubes)` : "Cache da classificação ausente", ok: cacheAvailable, detail: cacheAvailable ? `${cache.id} • ${cacheStatus}` : null },
      { id: "sync", label: "Há sincronização bem-sucedida", ok: Boolean(lastSuccess), detail: lastSuccess?.criado_em || null },
      { id: "rate", label: "Última execução respeitou o limite", ok: !last || Number(last.chamadas_api || 0) <= MAX_API_CALLS_PER_SYNC, detail: last?.chamadas_api ?? null },
    ];
    const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);

    return jsonResponse({
      ok: true,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      appVersion: APP_VERSION,
      services: {
        supabase: { status: jogos.ok && palpites.ok && participantes.ok ? "online" : "degraded" },
        netlifyFunctions: { status: "online" },
        footballData: { status: apiStatus, inferred: true, note: "Status inferido pelas sincronizações para não consumir cota da API." },
      },
      sync: {
        last,
        lastSuccess,
        nextScheduledCheck: next.toISOString(),
        scheduleMode: `inteligente (verificação a cada ${SCHEDULE_CHECK_MINUTES} minutos)`,
      },
      cache: {
        available: cacheAvailable,
        id: cache?.id || null,
        lookup: cacheLookup,
        status: cacheStatus,
        updatedAt: cache?.atualizado_em || null,
        ageMs: cacheAgeMs,
        clubs: cacheTable.length,
        source: cacheSource,
        currentMatchday: cache?.payload?.currentMatchday ?? null,
      },
      database: { jogos, palpites, participantes },
      logs,
      autotest: { score, checks },
    }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return errorResponse(error, 500);
  }
};
