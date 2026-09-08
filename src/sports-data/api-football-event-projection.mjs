import { createHash } from "node:crypto";

function normalizedEvent(event) {
  return {
    providerEventKey: String(event?.providerEventKey || ""),
    elapsed: Number.isInteger(event?.elapsed) ? event.elapsed : null,
    extra: Number.isInteger(event?.extra) ? event.extra : null,
    teamProviderId: Number.isInteger(event?.teamProviderId) ? event.teamProviderId : null,
    teamName: event?.teamName || null,
    playerProviderId: Number.isInteger(event?.playerProviderId) ? event.playerProviderId : null,
    playerName: event?.playerName || null,
    relatedPlayerProviderId: Number.isInteger(event?.relatedPlayerProviderId) ? event.relatedPlayerProviderId : null,
    relatedPlayerName: event?.relatedPlayerName || null,
    typeRaw: event?.typeRaw || "unknown",
    detailRaw: event?.detailRaw || null,
    comments: event?.comments || null,
  };
}

function isGoal(event) {
  return String(event?.typeRaw || "").trim().toLowerCase() === "goal";
}

export function buildApiFootballEventProjection(providerGame, canonicalGame, observedAt = new Date().toISOString()) {
  const observation = providerGame?.eventObservation;
  if (!observation?.available || !observation?.valid) return { eligible: false, reason: "events_unavailable" };

  const events = (providerGame?.events || []).map(normalizedEvent);
  const homeId = Number(canonicalGame?.api_football_time_casa_id);
  const awayId = Number(canonicalGame?.api_football_time_fora_id);
  const goals = events.filter(isGoal);
  const homeGoals = goals.filter((event) => Number(event.teamProviderId) === homeId).length;
  const awayGoals = goals.filter((event) => Number(event.teamProviderId) === awayId).length;
  const expectedHome = Number(providerGame?.score?.home);
  const expectedAway = Number(providerGame?.score?.away);
  const competitive = providerGame?.status?.isLive || providerGame?.status?.isFinal;

  if (!competitive && events.length === 0) return { eligible: false, reason: "no_relevant_events" };

  if (competitive && (homeGoals !== expectedHome || awayGoals !== expectedAway)) {
    return { eligible: false, reason: "goal_count_mismatch" };
  }
  if (goals.some((event) => !event.playerName || event.elapsed == null || ![homeId, awayId].includes(Number(event.teamProviderId)))) {
    return { eligible: false, reason: "goal_details_incomplete" };
  }

  const serialized = JSON.stringify(events);
  return {
    eligible: true,
    row: {
      id_jogo: Number(canonicalGame.id_jogo),
      fornecedor: "api-football",
      id_externo: Number(providerGame.providerFixtureId),
      eventos: events,
      hash_eventos: createHash("sha256").update(serialized).digest("hex"),
      observado_em: observedAt,
      atualizado_em: observedAt,
    },
  };
}
