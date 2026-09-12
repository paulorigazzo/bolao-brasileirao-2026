import { repairMojibake } from "./text-normalization.js";

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function goalMarker(detail) {
  const normalized = String(detail || "").toLowerCase();
  if (normalized.includes("own goal")) return " (GC)";
  if (normalized.includes("penalty")) return " (P)";
  return "";
}

function goalMinute(event) {
  const elapsed = integer(event?.elapsed);
  if (elapsed == null) return null;
  const extra = integer(event?.extra);
  return `${elapsed}${extra > 0 ? `+${extra}` : ""}'`;
}

function isScoringGoal(event) {
  const type = String(event?.typeRaw || "").trim().toLowerCase();
  const detail = String(event?.detailRaw || "").trim().toLowerCase();
  return type === "goal" && detail !== "missed penalty";
}

export function buildGameGoalEventsModel(game, projection) {
  const homeScore = integer(game?.gols_casa);
  const awayScore = integer(game?.gols_fora);
  if (homeScore == null || awayScore == null || homeScore + awayScore === 0) return { status: "hidden", home: [], away: [] };
  if (!projection || Number(projection.id_externo) !== Number(game?.api_football_id) || !Array.isArray(projection.eventos)) {
    return { status: "updating", home: [], away: [] };
  }

  const homeId = Number(game.api_football_time_casa_id);
  const awayId = Number(game.api_football_time_fora_id);
  const goals = projection.eventos
    .filter(isScoringGoal)
    .map((event, index) => ({
      side: Number(event.teamProviderId) === homeId ? "home" : Number(event.teamProviderId) === awayId ? "away" : null,
      player: repairMojibake(String(event.playerName || "").trim()),
      minute: goalMinute(event),
      marker: goalMarker(event.detailRaw),
      order: index,
      elapsed: integer(event.elapsed) ?? Number.MAX_SAFE_INTEGER,
      extra: integer(event.extra) ?? 0,
    }))
    .sort((a, b) => a.elapsed - b.elapsed || a.extra - b.extra || a.order - b.order);
  const home = goals.filter((goal) => goal.side === "home");
  const away = goals.filter((goal) => goal.side === "away");
  const complete = goals.every((goal) => goal.side && goal.player && goal.minute) && home.length === homeScore && away.length === awayScore;
  return complete ? { status: "ready", home, away } : { status: "updating", home: [], away: [] };
}
