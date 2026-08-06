import { computePayloadHash, scanForbidden, validateSnapshot } from "./contract.mjs";

const STATUS = Object.freeze({ agendado: "scheduled", adiado: "postponed", encerrado: "finished", cancelado: "cancelled" });
const ref = (prefix, value) => `${prefix}-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const iso = (value, label) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} inválido`);
  return date.toISOString();
};

export function buildSnapshot(origin, { packageId, exportedAt } = {}) {
  const forbidden = scanForbidden(origin);
  if (forbidden.length) throw new Error(`Origem sintética recusada:\n- ${forbidden.join("\n- ")}`);
  if (origin?.dataClassification !== "synthetic-only") throw new Error("R06A aceita somente origem synthetic-only");
  const games = Array.isArray(origin.games) ? origin.games : [];
  const people = Array.isArray(origin.participants) ? origin.participants : [];
  const picks = Array.isArray(origin.predictions) ? origin.predictions : [];
  const teamMap = new Map();
  for (const game of games) {
    if (game.id === undefined || String(game.id).trim() === "") throw new Error("Partida sem identificador externo");
    for (const side of ["home", "away"]) {
      if (game[`${side}TeamExternalRef`] === undefined || String(game[`${side}TeamExternalRef`]).trim() === "" || typeof game[`${side}TeamName`] !== "string" || !game[`${side}TeamName`].trim()) throw new Error(`Partida ${game.id} possui time ${side} incompleto`);
      const externalRef = String(game[`${side}TeamExternalRef`]);
      const teamRef = ref("team", externalRef);
      const current = teamMap.get(externalRef);
      const candidate = { ref: teamRef, externalRef, name: game[`${side}TeamName`] };
      if (current && current.name !== candidate.name) throw new Error(`Time ${externalRef} possui nomes divergentes`);
      teamMap.set(externalRef, candidate);
    }
  }
  const participantRefs = new Set(people.map((item) => item.ref));
  const gameRefs = new Map(games.map((item) => [String(item.id), ref("match", item.id)]));
  for (const pick of picks) {
    if (!participantRefs.has(pick.participantRef)) throw new Error(`Palpite referencia participante inexistente: ${pick.participantRef}`);
    if (!gameRefs.has(String(pick.gameId))) throw new Error(`Palpite referencia partida inexistente: ${pick.gameId}`);
    const game = games.find((item) => String(item.id) === String(pick.gameId));
    if (STATUS[game.status] !== "finished") throw new Error(`Palpite de partida não encerrada não pode ser exportado: ${pick.gameId}`);
  }
  const seasonRef = origin.season.ref; const leagueRef = origin.league.ref;
  const matches = games.map((game) => {
    const kickoffAt = iso(game.kickoffAt, `Partida ${game.id}`);
    const status = STATUS[game.status];
    if (!status) throw new Error(`Estado de partida não suportado: ${game.status}`);
    return {
      ref: gameRefs.get(String(game.id)), externalRef: String(game.id), seasonRef, round: game.round,
      homeTeamRef: ref("team", game.homeTeamExternalRef), awayTeamRef: ref("team", game.awayTeamExternalRef),
      kickoffAt, predictionDeadlineAt: new Date(Date.parse(kickoffAt) - 30 * 60 * 1000).toISOString(), status,
      homeScore: status === "finished" ? game.homeScore : null,
      awayScore: status === "finished" ? game.awayScore : null,
    };
  });
  const payload = {
    competitions: [{ ref: origin.competition.ref, name: origin.competition.name }],
    seasons: [{ ref: seasonRef, competitionRef: origin.competition.ref, label: origin.season.label, status: origin.season.status }],
    teams: [...teamMap.values()], matches,
    leagues: [{ ref: leagueRef, seasonRef, name: origin.league.name, status: origin.league.status }],
    participants: people.map((item) => ({ ref: item.ref, syntheticLabel: item.syntheticLabel })),
    memberships: people.map((item) => ({ ref: ref("membership", `${leagueRef}-${item.ref}`), leagueRef, participantRef: item.ref, role: item.role, status: item.status })),
    predictions: picks.map((item) => ({
      ref: ref("prediction", `${leagueRef}-${item.participantRef}-${item.gameId}`), leagueRef,
      participantRef: item.participantRef, matchRef: gameRefs.get(String(item.gameId)),
      homeScore: item.homeScore, awayScore: item.awayScore,
      submittedAt: iso(item.submittedAt, "submittedAt"), updatedAt: iso(item.updatedAt, "updatedAt"),
    })),
  };
  const snapshot = {
    contractVersion: "snapshot-2026/v1", packageId, dataClassification: "synthetic-only",
    source: { product: "bolao-brasileirao-2026", seasonRef, exportedAt: iso(exportedAt, "exportedAt"), mode: "full", sourceRevision: origin.sourceRevision },
    integrity: { algorithm: "sha256", canonicalization: "json-sort-keys-and-arrays-v1", payloadHash: computePayloadHash(payload) },
    payload,
  };
  const validation = validateSnapshot(snapshot);
  if (!validation.ok) throw new Error(`Snapshot gerado é inválido:\n- ${validation.errors.join("\n- ")}`);
  return snapshot;
}
