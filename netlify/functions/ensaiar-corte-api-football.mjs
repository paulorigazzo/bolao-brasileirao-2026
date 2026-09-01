import { errorResponse, jsonResponse, methodNotAllowed, requireAdmin, requireEnv, serviceClient } from "./_api-helpers.mjs";
import { runApiFootballCutoverRehearsal } from "./_api-football-cutover-rehearsal.mjs";

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed("POST");
  const admin = await requireAdmin(request);
  if (!admin.ok) return jsonResponse({ ok: false, error: admin.error }, admin.status, { "cache-control": "no-store" });
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Corpo JSON inválido." }, 400, { "cache-control": "no-store" }); }
  try {
    const result = await runApiFootballCutoverRehearsal({ supabase: serviceClient(), apiFootballKey: requireEnv("API_FOOTBALL_KEY"),
      footballDataToken: requireEnv("FOOTBALL_DATA_TOKEN"), round: body?.rodada, confirmation: body?.confirmacao });
    return jsonResponse(result, 200, { "cache-control": "no-store" });
  } catch (error) {
    const code = String(error?.message || "rehearsal_failed").split(":")[0];
    const status = code.endsWith("invalid") ? 400 : code.includes("missing") ? 503 : 409;
    return errorResponse(new Error(code), status, { "cache-control": "no-store" });
  }
};
