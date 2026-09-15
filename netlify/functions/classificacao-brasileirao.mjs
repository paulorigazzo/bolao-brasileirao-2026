import { jsonResponse, serviceClient, isMissingTableError, methodNotAllowed, errorResponse } from "./_api-helpers.mjs";
import { CLASSIFICATION_SNAPSHOT_ID } from "./_constants.mjs";
import { providerClassificationSnapshotId } from "./_sports-data-provider.mjs";
import { apiFootballClassification } from "./_api-football-official.mjs";
import { canonicalizeApiFootballClassificationResult } from "../../src/sports-data/api-football-team-catalog.mjs";

async function readSnapshot(supabase, snapshotId) {
  const { data, error } = await supabase.from("classificacao_cache").select("payload,atualizado_em").eq("id", snapshotId).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data?.payload ? { ...data.payload, source: "cache", cachedAt: data.atualizado_em } : null;
}

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const supabase = serviceClient();
  const snapshotId = providerClassificationSnapshotId(CLASSIFICATION_SNAPSHOT_ID);
  let canonicalGames = null;
  try {
    const { data, error: canonicalError } = await supabase.from("jogos").select("time_casa,time_fora,api_football_time_casa_id,api_football_time_fora_id");
    if (canonicalError) throw canonicalError;
    canonicalGames = data || [];
    const classification = await apiFootballClassification(canonicalGames);
    const { error: cacheError } = await supabase.from("classificacao_cache").upsert({
      id: classification.id, payload: classification.result, atualizado_em: classification.result.updatedAt,
    }, { onConflict: "id" });
    if (cacheError && !isMissingTableError(cacheError)) console.warn("Falha ao salvar cache da classificação:", cacheError.message);
    return jsonResponse(classification.result, 200, { "cache-control": "public, max-age=300, s-maxage=300" });
  } catch (error) {
    try {
      const snapshot = await readSnapshot(supabase, snapshotId);
      if (snapshot) {
        const safeSnapshot = canonicalizeApiFootballClassificationResult(snapshot, canonicalGames || []);
        return jsonResponse({ ...safeSnapshot, ok: true, warning: "API indisponível; exibindo a última classificação salva." }, 200, {
          "cache-control": "public, max-age=60, s-maxage=60", "x-bolao-fallback": "classification-cache",
        });
      }
    } catch (cacheError) {
      console.warn("Falha ao ler cache da classificação:", cacheError);
    }
    return errorResponse(error, 500);
  }
};
