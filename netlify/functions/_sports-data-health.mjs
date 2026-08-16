export const SPORTS_DATA_DELAY_MINUTES = 30;
export const SPORTS_DATA_LOOKBACK_HOURS = 6;

const scheduledStatuses = new Set(["agendado", "scheduled", "timed"]);

export function assessSportsDataFreshness(games = [], now = new Date()) {
  const nowMs = new Date(now).getTime();
  const delayedBefore = nowMs - SPORTS_DATA_DELAY_MINUTES * 60_000;
  const recentAfter = nowMs - SPORTS_DATA_LOOKBACK_HOURS * 3_600_000;
  const delayedGames = games.filter((game) => {
    const kickoff = new Date(game?.inicio).getTime();
    const status = String(game?.status || "").trim().toLowerCase();
    return scheduledStatuses.has(status) && Number.isFinite(kickoff) && kickoff >= recentAfter && kickoff <= delayedBefore;
  }).map((game) => ({
    id: Number(game.id_jogo) || null,
    kickoff: game.inicio || null,
    home: String(game.time_casa || "Mandante"),
    away: String(game.time_fora || "Visitante"),
    status: String(game.status || "agendado"),
  }));

  return {
    status: delayedGames.length ? "delayed" : "current",
    delayedCount: delayedGames.length,
    thresholdMinutes: SPORTS_DATA_DELAY_MINUTES,
    delayedGames,
  };
}
