const fold = value => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const hasStatus = (game, terms) => {
  const status = fold(game?.status);
  return terms.some(term => status.includes(term));
};

const percent = (value, total) => total ? Math.round((value / total) * 100) : 0;

export function classifyStatisticsGames({
  games = [],
  picks = [],
  isScorableGame,
  isLocked,
  gameStatusDisplay,
} = {}) {
  if (typeof isScorableGame !== "function") throw new TypeError("isScorableGame é obrigatório.");
  if (typeof isLocked !== "function") throw new TypeError("isLocked é obrigatório.");

  const picksByGame = new Map(
    picks
      .filter(Boolean)
      .map(pick => [Number(pick.id_jogo), pick])
      .filter(([gameId]) => Number.isFinite(gameId))
  );

  const groups = {
    completedWithPick: [],
    completedWithoutPick: [],
    openWithPick: [],
    openWithoutPick: [],
    liveWithPick: [],
    liveWithoutPick: [],
    lockedAwaitingResultWithPick: [],
    lockedAwaitingResultWithoutPick: [],
    postponed: [],
    cancelled: [],
    invalid: [],
  };

  for (const game of games.filter(Boolean)) {
    const gameId = Number(game.id_jogo);
    const pick = picksByGame.get(gameId) || null;
    const entry = { game, pick };
    const display = typeof gameStatusDisplay === "function" ? gameStatusDisplay(game) : null;
    const displayKey = String(display?.key || "").toLowerCase();

    const cancelled = displayKey === "cancelled" || hasStatus(game, ["cancel", "anulad"]);
    if (cancelled) {
      groups.cancelled.push(entry);
      continue;
    }

    const postponed = displayKey === "postponed" || hasStatus(game, ["adiad", "postpon", "suspens"]);
    if (postponed) {
      groups.postponed.push(entry);
      continue;
    }

    if (isScorableGame(game)) {
      groups[pick ? "completedWithPick" : "completedWithoutPick"].push(entry);
      continue;
    }

    const live = displayKey === "live" || hasStatus(game, ["vivo", "andamento", "intervalo", "in-play", "paused", "1-tempo", "2-tempo"]);
    if (live) {
      groups[pick ? "liveWithPick" : "liveWithoutPick"].push(entry);
      continue;
    }

    const locked = isLocked(game);
    if (locked) {
      groups[pick ? "lockedAwaitingResultWithPick" : "lockedAwaitingResultWithoutPick"].push(entry);
      continue;
    }

    const kickoff = new Date(game.inicio).getTime();
    if (!Number.isFinite(kickoff)) {
      groups.invalid.push(entry);
      continue;
    }

    groups[pick ? "openWithPick" : "openWithoutPick"].push(entry);
  }

  const completedEligible = groups.completedWithPick.length + groups.completedWithoutPick.length;
  const activeSeasonGames =
    completedEligible +
    groups.openWithPick.length +
    groups.openWithoutPick.length +
    groups.liveWithPick.length +
    groups.liveWithoutPick.length +
    groups.lockedAwaitingResultWithPick.length +
    groups.lockedAwaitingResultWithoutPick.length;

  const coveredSeasonGames =
    groups.completedWithPick.length +
    groups.openWithPick.length +
    groups.liveWithPick.length +
    groups.lockedAwaitingResultWithPick.length;

  const awaitingResult =
    groups.liveWithPick.length +
    groups.liveWithoutPick.length +
    groups.lockedAwaitingResultWithPick.length +
    groups.lockedAwaitingResultWithoutPick.length;

  const excluded = groups.postponed.length + groups.cancelled.length;
  const knownGameIds = new Set(games.map(game => Number(game?.id_jogo)).filter(Number.isFinite));
  const registeredPicks = new Set(
    picks
      .map(pick => Number(pick?.id_jogo))
      .filter(gameId => Number.isFinite(gameId) && knownGameIds.has(gameId))
  ).size;

  const dataQuality = {
    postponed: groups.postponed.length,
    cancelled: groups.cancelled.length,
    invalid: groups.invalid.length,
    awaitingResult,
  };
  dataQuality.totalAttention =
    dataQuality.postponed +
    dataQuality.cancelled +
    dataQuality.invalid +
    dataQuality.awaitingResult;
  dataQuality.hasAttention = dataQuality.totalAttention > 0;
  dataQuality.level = dataQuality.invalid > 0 ? "warning" : dataQuality.hasAttention ? "info" : "ok";

  return {
    groups,
    metrics: {
      registeredPicks,
      completedEligible,
      completedWithPick: groups.completedWithPick.length,
      missedCompleted: groups.completedWithoutPick.length,
      openAvailable: groups.openWithoutPick.length,
      openAlreadyPicked: groups.openWithPick.length,
      awaitingResult,
      excluded,
      invalid: groups.invalid.length,
      activeSeasonGames,
      coveredSeasonGames,
      participationRate: percent(groups.completedWithPick.length, completedEligible),
      seasonCoverageRate: percent(coveredSeasonGames, activeSeasonGames),
    },
    dataQuality,
  };
}

export function analyzeRoundPerformance({ entries = [], pointsForEntry } = {}) {
  if (typeof pointsForEntry !== "function") throw new TypeError("pointsForEntry é obrigatório.");

  const byRound = new Map();
  for (const entry of entries.filter(Boolean)) {
    const round = Number(entry?.game?.rodada);
    if (!Number.isFinite(round)) continue;
    const points = Number(pointsForEntry(entry)) || 0;
    const item = byRound.get(round) || { round, points: 0, games: 0, hits: 0, exact: 0, average: 0 };
    item.points += points;
    item.games += 1;
    if (points > 0) item.hits += 1;
    if (points === 10) item.exact += 1;
    byRound.set(round, item);
  }

  const rounds = [...byRound.values()]
    .map(item => ({ ...item, average: item.games ? item.points / item.games : 0 }))
    .sort((a, b) => a.round - b.round);

  const bestRound = rounds.reduce((best, current) => {
    if (!best) return current;
    if (current.points !== best.points) return current.points > best.points ? current : best;
    if (current.exact !== best.exact) return current.exact > best.exact ? current : best;
    return current.round > best.round ? current : best;
  }, null);

  const recent = rounds.slice(-3);
  const previous = rounds.slice(-6, -3);
  const recentAverage = recent.length ? recent.reduce((sum, item) => sum + item.average, 0) / recent.length : 0;
  const previousAverage = previous.length ? previous.reduce((sum, item) => sum + item.average, 0) / previous.length : 0;
  const delta = previous.length ? recentAverage - previousAverage : 0;
  const trend = rounds.length < 4 ? "insufficient" : Math.abs(delta) < 0.35 ? "stable" : delta > 0 ? "up" : "down";

  return {
    rounds,
    bestRound,
    trend,
    recentAverage,
    previousAverage,
    delta,
  };
}

