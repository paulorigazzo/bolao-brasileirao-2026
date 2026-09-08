import { createHash } from "node:crypto";
import { buildApiFootballEventProjection } from "./api-football-event-projection.mjs";

export const GOAL_EVENT_BACKFILL = Object.freeze({
  round: 26,
  expectedGames: 10,
  confirmation: "APPLY_GOAL_EVENTS_ROUND_26",
});

const integer = (value) => Number.isInteger(Number(value)) ? Number(value) : null;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isScoringGoal = (event) => String(event?.typeRaw || "").trim().toLowerCase() === "goal"
  && String(event?.detailRaw || "").trim().toLowerCase() !== "missed penalty";

function canonicalSnapshot(game) {
  return {
    idJogo: integer(game.id_jogo),
    fixtureId: integer(game.api_football_id),
    homeTeamId: integer(game.api_football_time_casa_id),
    awayTeamId: integer(game.api_football_time_fora_id),
    homeScore: integer(game.gols_casa),
    awayScore: integer(game.gols_fora),
    status: String(game.status || ""),
  };
}

function eligibleCanonicalGames(games) {
  const selected = (games || []).filter((game) => Number(game.rodada) === GOAL_EVENT_BACKFILL.round);
  if (selected.length !== GOAL_EVENT_BACKFILL.expectedGames) throw new Error(`round26_game_count_unexpected:${selected.length}`);
  if (selected.some((game) => String(game.status || "").toLowerCase() !== "encerrado")) throw new Error("round26_not_fully_finished");
  if (selected.some((game) => !game.api_football_id || !game.api_football_time_casa_id || !game.api_football_time_fora_id)) {
    throw new Error("round26_mapping_incomplete");
  }
  return selected.sort((a, b) => Number(a.id_jogo) - Number(b.id_jogo));
}

export function buildGoalEventBackfillArtifact({ canonicalGames, providerGames, observation, observedAt }) {
  const selected = eligibleCanonicalGames(canonicalGames);
  const providers = new Map((providerGames || []).map((game) => [Number(game.providerFixtureId), game]));
  if (providers.size !== GOAL_EVENT_BACKFILL.expectedGames) throw new Error(`round26_fixture_count_unexpected:${providers.size}`);
  const projections = selected.map((canonical) => {
    const provider = providers.get(Number(canonical.api_football_id));
    if (!provider) throw new Error(`round26_fixture_missing:${canonical.id_jogo}`);
    if (Number(provider.competitionProviderId) !== 71 || Number(provider.season) !== 2026
      || Number(provider.roundNumber) !== GOAL_EVENT_BACKFILL.round || !provider.status?.isFinal) {
      throw new Error(`round26_fixture_scope_invalid:${canonical.id_jogo}`);
    }
    const candidate = buildApiFootballEventProjection(provider, canonical, observedAt);
    if (!candidate.eligible) throw new Error(`round26_events_invalid:${canonical.id_jogo}:${candidate.reason}`);
    return candidate.row;
  });
  const stable = {
    contract: "api-football-goal-events-backfill-v1",
    round: GOAL_EVENT_BACKFILL.round,
    gameCount: projections.length,
    eventCount: projections.reduce((sum, row) => sum + row.eventos.length, 0),
    goalCount: projections.reduce((sum, row) => sum + row.eventos.filter(isScoringGoal).length, 0),
    canonical: selected.map(canonicalSnapshot),
    projectionHashes: projections.map((row) => ({ idJogo: row.id_jogo, hash: row.hash_eventos })),
  };
  return {
    manifest: { ...stable, generatedAt: observedAt, quota: {
      dailyLimit: observation?.dailyLimit ?? null, dailyRemaining: observation?.dailyRemaining ?? null,
      minuteLimit: observation?.minuteLimit ?? null, minuteRemaining: observation?.minuteRemaining ?? null,
    }, manifestHash: hash(stable) },
    projections,
  };
}

export function verifyGoalEventBackfillArtifact({ artifact, canonicalGames, approvedHash, confirmation }) {
  if (confirmation !== GOAL_EVENT_BACKFILL.confirmation) throw new Error("round26_backfill_confirmation_invalid");
  if (approvedHash !== artifact?.manifest?.manifestHash) throw new Error("round26_backfill_hash_not_approved");
  if (artifact.manifest.contract !== "api-football-goal-events-backfill-v1"
    || Number(artifact.manifest.round) !== GOAL_EVENT_BACKFILL.round
    || Number(artifact.manifest.gameCount) !== GOAL_EVENT_BACKFILL.expectedGames) {
    throw new Error("round26_backfill_manifest_scope_invalid");
  }
  const selected = eligibleCanonicalGames(canonicalGames);
  const stable = {
    contract: artifact.manifest.contract, round: artifact.manifest.round, gameCount: artifact.manifest.gameCount,
    eventCount: artifact.manifest.eventCount, goalCount: artifact.manifest.goalCount,
    canonical: artifact.manifest.canonical, projectionHashes: artifact.manifest.projectionHashes,
  };
  if (hash(stable) !== artifact.manifest.manifestHash) throw new Error("round26_backfill_manifest_changed");
  if (hash(selected.map(canonicalSnapshot)) !== hash(artifact.manifest.canonical)) throw new Error("round26_backfill_canonical_changed");
  if (!Array.isArray(artifact.projections) || artifact.projections.length !== GOAL_EVENT_BACKFILL.expectedGames) {
    throw new Error("round26_backfill_projection_count_invalid");
  }
  const expectedIds = selected.map((game) => Number(game.id_jogo)).sort((a, b) => a - b);
  const projectedIds = artifact.projections.map((row) => Number(row.id_jogo)).sort((a, b) => a - b);
  if (hash(projectedIds) !== hash(expectedIds)) throw new Error("round26_backfill_projection_scope_invalid");
  for (const row of artifact.projections) {
    if (hash(row.eventos) !== row.hash_eventos) throw new Error(`round26_backfill_projection_changed:${row.id_jogo}`);
  }
  return true;
}

export async function persistGoalEventBackfill({ supabase, artifact, canonicalGames, approvedHash, confirmation }) {
  verifyGoalEventBackfillArtifact({ artifact, canonicalGames, approvedHash, confirmation });
  const ids = artifact.projections.map((row) => row.id_jogo);
  const existing = await supabase.from("eventos_partida_cache").select("id_jogo,hash_eventos").in("id_jogo", ids);
  if (existing.error) throw new Error(`round26_backfill_preflight_failed:${existing.error.message}`);
  const conflicts = (existing.data || []).filter((row) => {
    const candidate = artifact.projections.find((item) => Number(item.id_jogo) === Number(row.id_jogo));
    return candidate?.hash_eventos !== row.hash_eventos;
  });
  if (conflicts.length) throw new Error(`round26_backfill_existing_conflict:${conflicts.map((row) => row.id_jogo).join(",")}`);
  const write = await supabase.from("eventos_partida_cache").upsert(artifact.projections, { onConflict: "id_jogo" });
  if (write.error) throw new Error(`round26_backfill_write_failed:${write.error.message}`);
  return { ok: true, round: 26, rows: artifact.projections.length, unchanged: (existing.data || []).length };
}
