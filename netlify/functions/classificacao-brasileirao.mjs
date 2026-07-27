import { jsonResponse, serviceClient, isMissingTableError, requireEnv, methodNotAllowed, errorResponse } from "./_api-helpers.mjs";
import {
  FOOTBALL_API_BASE,
  COMPETITION_CODE,
  SEASON_YEAR,
  CLASSIFICATION_SNAPSHOT_ID,
} from "./_constants.mjs";

async function readSnapshot(supabase) {
  const { data, error } = await supabase
    .from("classificacao_cache")
    .select("payload,atualizado_em")
    .eq("id", CLASSIFICATION_SNAPSHOT_ID)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data?.payload ? { ...data.payload, source: "cache", cachedAt: data.atualizado_em } : null;
}

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const supabase = serviceClient();

  try {
    const token = requireEnv("FOOTBALL_DATA_TOKEN");
    const response = await fetch(`${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/standings?season=${SEASON_YEAR}`, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
    });
    const rawText = await response.text();
    if (!response.ok) throw new Error(`football-data.org ${response.status}: ${rawText.slice(0, 500)}`);

    const payload = JSON.parse(rawText);
    const totalStanding = (payload.standings || []).find((standing) => String(standing.type || "").toUpperCase() === "TOTAL");
    const table = Array.isArray(totalStanding?.table) ? totalStanding.table : [];
    const result = {
      ok: true,
      competition: payload.competition?.name || "Campeonato Brasileiro Série A",
      season: payload.season?.startDate?.slice(0, 4) || SEASON_YEAR,
      currentMatchday: payload.season?.currentMatchday ?? null,
      updatedAt: new Date().toISOString(),
      source: "api",
      table: table.map((row) => ({
        position: row.position, teamId: row.team?.id ?? null,
        team: row.team?.shortName || row.team?.name || "Clube", crest: row.team?.crest ?? null,
        playedGames: row.playedGames ?? 0, won: row.won ?? 0, draw: row.draw ?? 0, lost: row.lost ?? 0,
        points: row.points ?? 0, goalsFor: row.goalsFor ?? 0, goalsAgainst: row.goalsAgainst ?? 0,
        goalDifference: row.goalDifference ?? 0,
      })),
    };

    const { error: cacheError } = await supabase.from("classificacao_cache").upsert({
      id: CLASSIFICATION_SNAPSHOT_ID,
      payload: result,
      atualizado_em: result.updatedAt,
    }, { onConflict: "id" });
    if (cacheError && !isMissingTableError(cacheError)) console.warn("Falha ao salvar cache da classificação:", cacheError.message);

    return jsonResponse(result, 200, { "cache-control": "public, max-age=300, s-maxage=300" });
  } catch (error) {
    try {
      const snapshot = await readSnapshot(supabase);
      if (snapshot) {
        return jsonResponse({ ...snapshot, ok: true, warning: "API indisponível; exibindo a última classificação salva." }, 200, {
          "cache-control": "public, max-age=60, s-maxage=60",
          "x-bolao-fallback": "classification-cache",
        });
      }
    } catch (cacheError) {
      console.warn("Falha ao ler cache da classificação:", cacheError);
    }
    return errorResponse(error, 500);
  }
};
