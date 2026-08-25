import { errorResponse, jsonResponse, methodNotAllowed, requireAdmin, requireEnv, serviceClient } from "./_api-helpers.mjs";
import { collectApiFootballShadowMatch } from "./_api-football-shadow.mjs";

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed("POST");
  const admin = await requireAdmin(request);
  if (!admin.ok) return jsonResponse({ ok: false, error: admin.error }, admin.status, { "cache-control": "no-store" });
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ ok: false, error: "Corpo JSON inválido." }, 400, { "cache-control": "no-store" });
  }
  try {
    const result = await collectApiFootballShadowMatch({
      supabase: serviceClient(), apiKey: requireEnv("API_FOOTBALL_KEY"),
      canonicalGameId: body?.id_jogo, fixtureId: body?.fixture_id, trigger: `manual:${admin.email}`,
    });
    return jsonResponse(result, result.status, { "cache-control": "no-store" });
  } catch (error) {
    const known = new Map([
      ["canonical_game_id_invalid", [400, "ID interno do jogo inválido."]],
      ["fixture_id_invalid", [400, "Fixture ID inválido."]],
      ["canonical_game_not_found", [404, "Jogo não encontrado no Bolão."]],
      ["api_football_key_missing", [503, "Credencial da coleta em sombra indisponível."]],
    ]);
    const mapped = known.get(error?.message);
    if (mapped) return jsonResponse({ ok: false, error: mapped[1] }, mapped[0], { "cache-control": "no-store" });
    return errorResponse(new Error("A coleta em sombra não pôde ser concluída."), 500);
  }
};
