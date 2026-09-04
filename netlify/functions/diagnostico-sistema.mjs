import { jsonResponse, requireAdmin, methodNotAllowed, errorResponse } from "./_api-helpers.mjs";
import { APP_VERSION, CLASSIFICATION_SNAPSHOT_ID, CACHE_FRESH_MS, CACHE_STALE_MS, MAX_API_CALLS_PER_SYNC, SCHEDULE_CHECK_MINUTES, MAINTENANCE_INTERVAL_MS } from "./_constants.mjs";
import { assessSportsDataFreshness, SPORTS_DATA_LOOKBACK_HOURS } from "./_sports-data-health.mjs";
import { officialSportsDataProvider, providerClassificationSnapshotId, SPORTS_DATA_PROVIDERS } from "./_sports-data-provider.mjs";
import { probeApiFootballLocalCrests } from "./_api-football-local-crests.mjs";

const countTable = async (supabase, table) => {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  return error ? { ok: false, count: null, error: error.message } : { ok: true, count: count ?? 0 };
};

export function diagnosticLogsForProvider(logs = [], provider) {
  return (Array.isArray(logs) ? logs : []).filter((item) => item?.detalhes?.provider === provider);
}

export function diagnosticProviderStatus(logs = [], provider, now = new Date()) {
  const providerLogs = diagnosticLogsForProvider(logs, provider);
  const last = providerLogs[0] || null;
  const lastSuccess = providerLogs.find((item) => item?.sucesso) || null;
  const lastSuccessAgeMs = lastSuccess?.criado_em ? now.getTime() - new Date(lastSuccess.criado_em).getTime() : null;
  const status = !last
    ? "unknown"
    : (last?.sucesso === false && (!lastSuccess || lastSuccessAgeMs > MAINTENANCE_INTERVAL_MS) ? "degraded" : "online");
  return { providerLogs, last, lastSuccess, lastSuccessAgeMs, status };
}

export function diagnosticCrestCheck(provider, localCrests = {}) {
  const required = provider === SPORTS_DATA_PROVIDERS.API_FOOTBALL;
  const available = localCrests?.ok === true;
  return {
    required,
    ok: required ? available : true,
    label: available
      ? `Escudos locais da API-Football disponíveis (${Number(localCrests?.clubs) || 0} clubes)${required ? "" : " para contingência"}`
      : required ? "Escudos locais da API-Football incompletos" : "Escudos locais da API-Football indisponíveis para contingência",
    detail: available ? (required ? "mesma origem do Bolão" : "não afeta a fonte oficial atual") : `${localCrests?.failures?.length || 0} falha(s)`,
  };
}

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const admin = await requireAdmin(request);
  if (!admin.ok) return jsonResponse({ ok: false, error: admin.error }, admin.status, { "cache-control": "no-store" });

  const startedAt = Date.now();
  const { supabase } = admin;
  try {
    const provider = officialSportsDataProvider();
    const snapshotId = providerClassificationSnapshotId(CLASSIFICATION_SNAPSHOT_ID, provider);
    const recentGamesAfter = new Date(Date.now() - SPORTS_DATA_LOOKBACK_HOURS * 3_600_000).toISOString();
    const [logsResult, cacheResult, jogos, palpites, participantes, recentGamesResult, localCrests] = await Promise.all([
      supabase.from("api_sync_log").select("id,criado_em,origem,sucesso,duracao_ms,chamadas_api,jogos_atualizados,erro,detalhes").order("criado_em", { ascending: false }).limit(20),
      supabase.from("classificacao_cache").select("id,atualizado_em,payload").eq("id", snapshotId).maybeSingle(),
      countTable(supabase, "jogos"),
      countTable(supabase, "palpites"),
      countTable(supabase, "participantes_autorizados"),
      supabase.from("jogos").select("id_jogo,inicio,time_casa,time_fora,status").gte("inicio", recentGamesAfter).lte("inicio", new Date().toISOString()),
      probeApiFootballLocalCrests(new URL(request.url).origin),
    ]);

    if (logsResult.error) throw new Error(`Logs: ${logsResult.error.message}`);
    const logs = logsResult.data || [];
    // O cache oficial usa um namespace próprio por fornecedor.
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
    const cacheSource = cache?.payload?.provider || cache?.payload?.source || provider;
    const providerStatus = diagnosticProviderStatus(logs, provider, now);
    const { last, lastSuccess, status: apiStatus } = providerStatus;
    const crestCheck = diagnosticCrestCheck(provider, localCrests);
    const sportsData = recentGamesResult.error
      ? { status: "unknown", delayedCount: null, thresholdMinutes: 30, delayedGames: [], error: recentGamesResult.error.message }
      : assessSportsDataFreshness(recentGamesResult.data || [], now);

    const checks = [
      { id: "function", label: "Netlify Function respondeu", ok: true },
      { id: "supabase", label: "Supabase respondeu", ok: jogos.ok && palpites.ok && participantes.ok },
      { id: "games", label: "Jogos carregados", ok: jogos.ok && jogos.count > 0, detail: jogos.count },
      { id: "cache", label: cacheAvailable ? `Cache encontrado (${cacheTable.length} clubes)` : "Cache da classificação ausente", ok: cacheAvailable, detail: cacheAvailable ? `${cache.id} • ${cacheStatus}` : null },
      { id: "api-football-crests", label: crestCheck.label, ok: crestCheck.ok, detail: crestCheck.detail },
      { id: "sync", label: "Há sincronização bem-sucedida", ok: Boolean(lastSuccess), detail: lastSuccess?.criado_em || null },
      { id: "rate", label: "Última execução respeitou o limite", ok: !last || Number(last.chamadas_api || 0) <= MAX_API_CALLS_PER_SYNC, detail: last?.chamadas_api ?? null },
      { id: "sports-data", label: sportsData.status === "current" ? "Dados esportivos estão atuais" : sportsData.status === "delayed" ? `${sportsData.delayedCount} jogo(s) aguardando atualização da fonte` : "Atualidade dos dados não pôde ser verificada", ok: sportsData.status === "current", detail: sportsData.status === "delayed" ? `mais de ${sportsData.thresholdMinutes} min após o início` : sportsData.error || null },
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
        footballData: { status: provider === SPORTS_DATA_PROVIDERS.FOOTBALL_DATA ? apiStatus : "standby", availabilityStatus: provider === SPORTS_DATA_PROVIDERS.FOOTBALL_DATA ? apiStatus : "unknown", dataStatus: sportsData.status, inferred: true, note: "Disponibilidade inferida pelas sincronizações; atualidade conferida nos jogos armazenados." },
        apiFootball: { status: provider === SPORTS_DATA_PROVIDERS.API_FOOTBALL ? apiStatus : "standby", availabilityStatus: provider === SPORTS_DATA_PROVIDERS.API_FOOTBALL ? apiStatus : "unknown", dataStatus: sportsData.status, inferred: true },
      },
      officialSportsDataProvider: provider,
      sportsData,
      sync: {
        last,
        lastSuccess,
        provider,
        quota: last?.detalhes?.quota || lastSuccess?.detalhes?.quota || null,
        nextScheduledCheck: next.toISOString(),
        scheduleMode: `inteligente (verificação a cada ${SCHEDULE_CHECK_MINUTES} minutos)`,
      },
      cache: {
        available: cacheAvailable,
        expectedId: snapshotId,
        id: cache?.id || null,
        lookup: cacheLookup,
        status: cacheStatus,
        updatedAt: cache?.atualizado_em || null,
        ageMs: cacheAgeMs,
        clubs: cacheTable.length,
        source: cacheSource,
        currentMatchday: cache?.payload?.currentMatchday ?? null,
      },
      localCrests: { ok: localCrests.ok, clubs: localCrests.clubs, failures: localCrests.failures.map((item) => ({ teamId: item.teamId ?? null, errors: item.errors })) },
      database: { jogos, palpites, participantes },
      logs,
      autotest: { score, checks },
    }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return errorResponse(error, 500);
  }
};
