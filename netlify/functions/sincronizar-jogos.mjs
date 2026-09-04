import { syncGames } from "./_sync-shared.mjs";
import { jsonResponse, requireAdmin, serviceClient, isMissingTableError, methodNotAllowed, errorResponse, safeErrorMessage } from "./_api-helpers.mjs";
import { MAX_API_CALLS_PER_SYNC } from "./_constants.mjs";
import { officialSportsDataProvider } from "./_sports-data-provider.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const admin = await requireAdmin(request);
  if (!admin.ok) return jsonResponse({ ok: false, error: admin.error }, admin.status, { "cache-control": "no-store" });

  try {
    const result = await syncGames({ trigger: `manual:${admin.email}`, maxApiCalls: MAX_API_CALLS_PER_SYNC });
    return jsonResponse(result, result.ok ? 200 : 409, { "cache-control": "no-store" });
  } catch (error) {
    try {
      const supabase = serviceClient();
      const { error: logError } = await supabase.from("api_sync_log").insert({
        origem: `manual:${admin.email}`,
        sucesso: false,
        erro: safeErrorMessage(error),
        detalhes: { provider: officialSportsDataProvider() },
      });
      if (logError && !isMissingTableError(logError)) console.warn(logError.message);
    } catch (_) {}
    return errorResponse(error, error?.status === 429 ? 429 : 500);
  }
};
