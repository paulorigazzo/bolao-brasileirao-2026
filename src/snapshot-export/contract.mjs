import { createHash } from "node:crypto";

export const CONTRACT_VERSION = "snapshot-2026/v1";
export const COLLECTIONS = Object.freeze([
  "competitions", "seasons", "teams", "matches", "leagues",
  "participants", "memberships", "predictions",
]);

const REF = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const FORBIDDEN_KEY = /^(?:auth|authUserId|userId|user_id|email|phone|telefone|celular|token|session|password|secret|serviceRoleKey|databaseUrl|supabaseUrl|ranking|points|pontuacao|cache|logs?|sql)$/i;
const FORBIDDEN_VALUE = /(?:postgres(?:ql)?:\/\/|https?:\/\/[^\s]*\.supabase\.co|\b(?:service[_-]?role|jwt[_-]?secret)\b|\b(?:select|insert|update|delete|drop|alter|create|grant|revoke)\b[\s\S]*\b(?:from|into|table|on)\b)/i;
const SETS = Object.freeze({
  season: new Set(["planning", "open", "closed", "archived"]),
  league: new Set(["planning", "open", "closed", "archived"]),
  match: new Set(["scheduled", "postponed", "finished", "cancelled"]),
  role: new Set(["admin", "member"]),
  member: new Set(["active", "inactive"]),
});

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const timestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
const score = (value) => Number.isInteger(value) && value >= 0 && value <= 99;

export function scanForbidden(value, path = "input", errors = []) {
  if (Array.isArray(value)) value.forEach((item, index) => scanForbidden(item, `${path}[${index}]`, errors));
  else if (object(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) errors.push(`${path}.${key} é campo proibido`);
      scanForbidden(child, `${path}.${key}`, errors);
    }
  } else if (typeof value === "string" && FORBIDDEN_VALUE.test(value)) {
    errors.push(`${path} contém comando, credencial ou endpoint proibido`);
  }
  return errors;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).sort().join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function computePayloadHash(payload) {
  return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}

function exact(value, keys, path, errors) {
  if (!object(value)) return errors.push(`${path} deve ser objeto`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) errors.push(`${path}.${key} não é permitido`);
}

function index(items, name, allowedKeys, errors) {
  const result = new Map();
  if (!Array.isArray(items)) {
    errors.push(`payload.${name} deve ser lista`);
    return result;
  }
  items.forEach((item, position) => {
    const path = `payload.${name}[${position}]`;
    exact(item, allowedKeys, path, errors);
    if (!REF.test(item?.ref ?? "")) errors.push(`${path}.ref inválida`);
    else if (result.has(item.ref)) errors.push(`${name} contém referência duplicada: ${item.ref}`);
    else result.set(item.ref, item);
  });
  return result;
}

export function validateSnapshot(snapshot) {
  const errors = scanForbidden(snapshot, "snapshot", []);
  exact(snapshot, ["contractVersion", "packageId", "dataClassification", "source", "integrity", "payload"], "snapshot", errors);
  if (snapshot?.contractVersion !== CONTRACT_VERSION) errors.push(`contractVersion deve ser ${CONTRACT_VERSION}`);
  if (!UUID.test(snapshot?.packageId ?? "")) errors.push("packageId deve ser UUID");
  if (snapshot?.dataClassification !== "synthetic-only") errors.push("R06A aceita somente synthetic-only");
  exact(snapshot?.source, ["product", "seasonRef", "exportedAt", "mode", "sourceRevision"], "source", errors);
  if (snapshot?.source?.product !== "bolao-brasileirao-2026") errors.push("source.product inválido");
  if (!REF.test(snapshot?.source?.seasonRef ?? "")) errors.push("source.seasonRef inválida");
  if (!timestamp(snapshot?.source?.exportedAt)) errors.push("source.exportedAt inválido");
  if (snapshot?.source?.mode !== "full") errors.push("source.mode deve ser full");
  if (typeof snapshot?.source?.sourceRevision !== "string" || !snapshot.source.sourceRevision) errors.push("source.sourceRevision inválida");
  exact(snapshot?.integrity, ["algorithm", "canonicalization", "payloadHash"], "integrity", errors);
  if (snapshot?.integrity?.algorithm !== "sha256") errors.push("integrity.algorithm inválido");
  if (snapshot?.integrity?.canonicalization !== "json-sort-keys-and-arrays-v1") errors.push("integrity.canonicalization inválida");
  if (!HASH.test(snapshot?.integrity?.payloadHash ?? "")) errors.push("integrity.payloadHash inválido");
  exact(snapshot?.payload, COLLECTIONS, "payload", errors);

  const p = snapshot?.payload ?? {};
  const competitions = index(p.competitions, "competitions", ["ref", "name"], errors);
  const seasons = index(p.seasons, "seasons", ["ref", "competitionRef", "label", "status"], errors);
  const teams = index(p.teams, "teams", ["ref", "externalRef", "name"], errors);
  const matches = index(p.matches, "matches", ["ref", "externalRef", "seasonRef", "round", "homeTeamRef", "awayTeamRef", "kickoffAt", "predictionDeadlineAt", "status", "homeScore", "awayScore"], errors);
  const leagues = index(p.leagues, "leagues", ["ref", "seasonRef", "name", "status"], errors);
  const participants = index(p.participants, "participants", ["ref", "syntheticLabel"], errors);
  index(p.memberships, "memberships", ["ref", "leagueRef", "participantRef", "role", "status"], errors);
  index(p.predictions, "predictions", ["ref", "leagueRef", "participantRef", "matchRef", "homeScore", "awayScore", "submittedAt", "updatedAt"], errors);
  for (const name of COLLECTIONS.filter((item) => item !== "predictions")) if (Array.isArray(p[name]) && p[name].length === 0) errors.push(`payload.${name} não pode ser vazio`);
  if (!seasons.has(snapshot?.source?.seasonRef)) errors.push("source.seasonRef não encontrado");

  p.competitions?.forEach((item, i) => { if (!item.name) errors.push(`payload.competitions[${i}].name inválido`); });
  p.seasons?.forEach((item, i) => {
    if (!competitions.has(item.competitionRef)) errors.push(`payload.seasons[${i}].competitionRef não encontrado`);
    if (!item.label || !SETS.season.has(item.status)) errors.push(`payload.seasons[${i}] inválida`);
  });
  const teamExternal = new Set();
  p.teams?.forEach((item, i) => {
    if (!item.externalRef || !item.name) errors.push(`payload.teams[${i}] inválido`);
    if (teamExternal.has(item.externalRef)) errors.push(`teams contém externalRef duplicada: ${item.externalRef}`);
    teamExternal.add(item.externalRef);
  });
  const matchExternal = new Set();
  p.matches?.forEach((item, i) => {
    const path = `payload.matches[${i}]`;
    if (!item.externalRef || matchExternal.has(item.externalRef)) errors.push(`${path}.externalRef inválida ou duplicada`);
    matchExternal.add(item.externalRef);
    if (!seasons.has(item.seasonRef) || !teams.has(item.homeTeamRef) || !teams.has(item.awayTeamRef)) errors.push(`${path} contém referência inexistente`);
    if (item.homeTeamRef === item.awayTeamRef) errors.push(`${path} repete o mesmo time`);
    if (!Number.isInteger(item.round) || item.round < 1 || !timestamp(item.kickoffAt) || !timestamp(item.predictionDeadlineAt) || Date.parse(item.predictionDeadlineAt) > Date.parse(item.kickoffAt)) errors.push(`${path} contém rodada ou horário inválido`);
    if (!SETS.match.has(item.status)) errors.push(`${path}.status inválido`);
    if (item.status === "finished" ? (!score(item.homeScore) || !score(item.awayScore)) : (item.homeScore !== null || item.awayScore !== null)) errors.push(`${path} contém placar incompatível com o estado`);
  });
  p.leagues?.forEach((item, i) => { if (!seasons.has(item.seasonRef) || !item.name || !SETS.league.has(item.status)) errors.push(`payload.leagues[${i}] inválida`); });
  p.participants?.forEach((item, i) => { if (!item.syntheticLabel) errors.push(`payload.participants[${i}].syntheticLabel inválido`); });
  const memberKeys = new Set();
  p.memberships?.forEach((item, i) => {
    const key = `${item.leagueRef}:${item.participantRef}`;
    if (!leagues.has(item.leagueRef) || !participants.has(item.participantRef) || !SETS.role.has(item.role) || !SETS.member.has(item.status) || memberKeys.has(key)) errors.push(`payload.memberships[${i}] inválida ou duplicada`);
    memberKeys.add(key);
  });
  const predictionKeys = new Set();
  p.predictions?.forEach((item, i) => {
    const league = leagues.get(item.leagueRef); const match = matches.get(item.matchRef); const key = `${item.leagueRef}:${item.participantRef}:${item.matchRef}`;
    if (!league || !match || !participants.has(item.participantRef) || !memberKeys.has(`${item.leagueRef}:${item.participantRef}`) || league?.seasonRef !== match?.seasonRef || !score(item.homeScore) || !score(item.awayScore) || !timestamp(item.submittedAt) || !timestamp(item.updatedAt) || Date.parse(item.updatedAt) < Date.parse(item.submittedAt) || Date.parse(item.updatedAt) > Date.parse(match?.predictionDeadlineAt) || predictionKeys.has(key)) errors.push(`payload.predictions[${i}] inválida ou duplicada`);
    predictionKeys.add(key);
  });
  if (snapshot?.integrity?.payloadHash !== computePayloadHash(p)) errors.push("integrity.payloadHash não corresponde ao payload canônico");
  return { ok: errors.length === 0, errors };
}

export function assertValidSnapshot(snapshot) {
  const result = validateSnapshot(snapshot);
  if (!result.ok) throw new Error(`Snapshot inválido:\n- ${result.errors.join("\n- ")}`);
  return snapshot;
}
