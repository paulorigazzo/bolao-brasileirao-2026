import { randomUUID } from "node:crypto";
import { PSEUDONYMOUS_CONTRACT_VERSION, computePayloadHash, validateSnapshot } from "./contract.mjs";
import { opaqueRef } from "./pseudonymize.mjs";

const ref = (prefix, value) => `${prefix}-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const iso = (value, label) => { const date = new Date(value); if (!Number.isFinite(date.getTime())) throw new Error(`${label} inválido`); return date.toISOString(); };

export function buildPseudonymousSnapshot(origin, { secret, packageId = randomUUID(), exportedAt = new Date().toISOString() } = {}) {
  const games = Array.isArray(origin?.games) ? origin.games : [];
  const predictions = Array.isArray(origin?.predictions) ? origin.predictions : [];
  const finished = games.filter((game) => game.status === "encerrado");
  if (finished.length !== games.length) throw new Error("R06B aceita somente partidas encerradas");
  const gameById = new Map(finished.map((game) => [String(game.id), game]));
  const participantKeys = [...new Set(predictions.map((item) => item.participantKey))];
  if (!participantKeys.length) throw new Error("Nenhum participante competitivo encontrado");
  const participantRef = new Map(participantKeys.map((key) => [key, opaqueRef("participant", key, secret)]));
  const teams = new Map();
  for (const game of finished) for (const side of ["home", "away"]) {
    if (game[`${side}TeamExternalRef`] === undefined || game[`${side}TeamExternalRef`] === null || !String(game[`${side}TeamName`] ?? "").trim()) throw new Error(`Partida ${game.id} possui time ${side} incompleto`);
    const externalRef = String(game[`${side}TeamExternalRef`]);
    const candidate = { ref: ref("team", externalRef), externalRef, name: game[`${side}TeamName`] };
    if (teams.has(externalRef) && teams.get(externalRef).name !== candidate.name) throw new Error(`Time ${externalRef} possui nomes divergentes`);
    teams.set(externalRef, candidate);
  }
  const seasonRef = origin.season.ref; const leagueRef = origin.league.ref;
  const matches = finished.map((game) => ({
    ref: ref("match", game.id), externalRef: String(game.id), seasonRef, round: game.round,
    homeTeamRef: ref("team", game.homeTeamExternalRef), awayTeamRef: ref("team", game.awayTeamExternalRef),
    kickoffAt: iso(game.kickoffAt, "kickoffAt"), predictionDeadlineAt: new Date(Date.parse(game.kickoffAt) - 30 * 60 * 1000).toISOString(),
    status: "finished", homeScore: game.homeScore, awayScore: game.awayScore,
  }));
  const payload = {
    competitions: [{ ref: origin.competition.ref, name: origin.competition.name }],
    seasons: [{ ref: seasonRef, competitionRef: origin.competition.ref, label: origin.season.label, status: origin.season.status }],
    teams: [...teams.values()], matches,
    leagues: [{ ref: leagueRef, seasonRef, name: origin.league.name, status: origin.league.status }],
    participants: participantKeys.map((key) => ({ ref: participantRef.get(key) })),
    memberships: participantKeys.map((key) => ({ ref: opaqueRef("membership", `${leagueRef}:${key}`, secret), leagueRef, participantRef: participantRef.get(key), role: "member", status: "active" })),
    predictions: predictions.map((item) => {
      const game = gameById.get(String(item.gameId));
      if (!game || !participantRef.has(item.participantKey)) throw new Error("Palpite contém relação inválida");
      return { ref: opaqueRef("prediction", `${leagueRef}:${item.participantKey}:${item.gameId}`, secret), leagueRef, participantRef: participantRef.get(item.participantKey), matchRef: ref("match", item.gameId), homeScore: item.homeScore, awayScore: item.awayScore, submittedAt: iso(item.submittedAt, "submittedAt"), updatedAt: iso(item.updatedAt, "updatedAt") };
    }),
  };
  const snapshot = { contractVersion: PSEUDONYMOUS_CONTRACT_VERSION, packageId, dataClassification: "pseudonymous-test", source: { product: "bolao-brasileirao-2026", seasonRef, exportedAt: iso(exportedAt, "exportedAt"), mode: "full", sourceRevision: origin.sourceRevision }, integrity: { algorithm: "sha256", canonicalization: "json-sort-keys-and-arrays-v1", payloadHash: computePayloadHash(payload) }, payload };
  const validation = validateSnapshot(snapshot);
  if (!validation.ok) throw new Error(`Snapshot pseudonimizado inválido:\n- ${validation.errors.join("\n- ")}`);
  return snapshot;
}
