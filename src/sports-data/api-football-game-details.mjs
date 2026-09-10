import { createHash } from "node:crypto";

const STAT_TYPES = new Map([
  ["Ball Possession", "possession"], ["Total Shots", "shots"], ["Shots on Goal", "shotsOnTarget"],
  ["Corner Kicks", "corners"], ["Offsides", "offsides"], ["Fouls", "fouls"],
  ["Yellow Cards", "yellowCards"], ["Red Cards", "redCards"],
]);
const integer = (value) => value === null || value === undefined || value === "" ? null
  : Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function normalizeValue(key, value) {
  if (key === "possession") {
    const match = String(value ?? "").match(/^(\d{1,3})%$/);
    return match && Number(match[1]) <= 100 ? Number(match[1]) : null;
  }
  return integer(value);
}

function normalizeStatistics(raw, homeId, awayId) {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const byTeam = new Map(raw.map((item) => [Number(item?.team?.id), item]));
  if (!byTeam.has(homeId) || !byTeam.has(awayId) || homeId === awayId) return null;
  const side = (teamId) => {
    const result = {};
    for (const item of byTeam.get(teamId)?.statistics || []) {
      const key = STAT_TYPES.get(item?.type);
      if (!key) continue;
      const value = normalizeValue(key, item?.value);
      if (value !== null) result[key] = value;
    }
    return result;
  };
  const statistics = { home: side(homeId), away: side(awayId) };
  return Object.keys(statistics.home).length || Object.keys(statistics.away).length ? statistics : null;
}

function normalizePlayer(item) {
  const player = item?.player || item;
  const name = text(player?.name);
  if (!name) return null;
  return { id: integer(player?.id), name, number: integer(player?.number), position: text(player?.pos), grid: text(player?.grid) };
}

function normalizeLineups(raw, homeId, awayId) {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const byTeam = new Map(raw.map((item) => [Number(item?.team?.id), item]));
  if (!byTeam.has(homeId) || !byTeam.has(awayId) || homeId === awayId) return null;
  const side = (teamId) => {
    const item = byTeam.get(teamId);
    const starters = (item?.startXI || []).map(normalizePlayer).filter(Boolean);
    if (starters.length !== 11) return null;
    return { formation: text(item?.formation), coach: text(item?.coach?.name), starters };
  };
  const home = side(homeId), away = side(awayId);
  return home && away ? { home, away } : null;
}

export function buildApiFootballGameDetailsProjection(rawFixture, canonicalGame, observedAt = new Date().toISOString()) {
  const fixtureId = Number(rawFixture?.fixture?.id);
  const homeId = Number(canonicalGame?.api_football_time_casa_id);
  const awayId = Number(canonicalGame?.api_football_time_fora_id);
  if (fixtureId !== Number(canonicalGame?.api_football_id)) return { eligible: false, reason: "fixture_identity_mismatch" };
  if (Number(rawFixture?.teams?.home?.id) !== homeId || Number(rawFixture?.teams?.away?.id) !== awayId) {
    return { eligible: false, reason: "team_identity_mismatch" };
  }
  const statistics = normalizeStatistics(rawFixture?.statistics, homeId, awayId);
  const lineups = normalizeLineups(rawFixture?.lineups, homeId, awayId);
  if (!statistics && !lineups) return { eligible: false, reason: "details_unavailable" };
  return { eligible: true, row: {
    id_jogo: Number(canonicalGame.id_jogo), fornecedor: "api-football", id_externo: fixtureId,
    estatisticas: statistics, hash_estatisticas: statistics ? digest(statistics) : null,
    escalacoes: lineups, hash_escalacoes: lineups ? digest(lineups) : null,
    estatisticas_observadas_em: statistics ? observedAt : null,
    escalacoes_observadas_em: lineups ? observedAt : null,
    atualizado_em: observedAt,
  } };
}

export function mergeGameDetailsProjection(existing = {}, candidate = {}) {
  return {
    ...candidate,
    estatisticas: candidate.estatisticas ?? existing.estatisticas ?? null,
    hash_estatisticas: candidate.hash_estatisticas ?? existing.hash_estatisticas ?? null,
    estatisticas_observadas_em: candidate.estatisticas_observadas_em ?? existing.estatisticas_observadas_em ?? null,
    escalacoes: candidate.escalacoes ?? existing.escalacoes ?? null,
    hash_escalacoes: candidate.hash_escalacoes ?? existing.hash_escalacoes ?? null,
    escalacoes_observadas_em: candidate.escalacoes_observadas_em ?? existing.escalacoes_observadas_em ?? null,
  };
}

export function gameDetailsFixtureIds(games = [], now = new Date()) {
  const current = now.getTime();
  return games.filter((game) => {
    const status = String(game?.status || "").toLowerCase();
    const kickoff = new Date(game?.inicio).getTime();
    if (["em_andamento", "intervalo"].includes(status)) return true;
    return status === "agendado" && Number.isFinite(kickoff) && kickoff - current >= 0 && kickoff - current <= 90 * 60 * 1000;
  }).map((game) => Number(game.api_football_id)).filter(Number.isInteger).slice(0, 20);
}
