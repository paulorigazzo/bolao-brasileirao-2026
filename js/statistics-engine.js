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



const outcomeKey = game => {
  const home = Number(game?.gols_casa);
  const away = Number(game?.gols_fora);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home === away) return "draw";
  return home > away ? "home" : "away";
};

export function analyzePredictionProfile({ entries = [], pointsForEntry } = {}) {
  if (typeof pointsForEntry !== "function") throw new TypeError("pointsForEntry é obrigatório.");

  const scenarioDirectory = {
    home: { key: "home", label: "Vitória do mandante", shortLabel: "Mandante", games: 0, hits: 0, points: 0, rate: 0 },
    draw: { key: "draw", label: "Empate", shortLabel: "Empate", games: 0, hits: 0, points: 0, rate: 0 },
    away: { key: "away", label: "Vitória do visitante", shortLabel: "Visitante", games: 0, hits: 0, points: 0, rate: 0 },
  };
  const teamMap = new Map();

  for (const entry of entries.filter(Boolean)) {
    const game = entry.game || {};
    const points = Math.max(0, Number(pointsForEntry(entry)) || 0);
    const outcome = outcomeKey(game);
    if (outcome) {
      const scenario = scenarioDirectory[outcome];
      scenario.games += 1;
      scenario.points += points;
      if (points > 0) scenario.hits += 1;
    }

    for (const teamName of [game.time_casa, game.time_fora]) {
      const name = String(teamName || "").trim();
      if (!name) continue;
      const key = fold(name);
      const item = teamMap.get(key) || { key, name, games: 0, hits: 0, misses: 0, points: 0, average: 0, hitRate: 0 };
      item.games += 1;
      item.points += points;
      if (points > 0) item.hits += 1;
      else item.misses += 1;
      teamMap.set(key, item);
    }
  }

  const scenarios = Object.values(scenarioDirectory).map(item => ({
    ...item,
    rate: percent(item.hits, item.games),
    average: item.games ? item.points / item.games : 0,
  }));
  const scenariosWithData = scenarios.filter(item => item.games > 0);
  const strongestScenario = [...scenariosWithData].sort((a, b) => b.rate - a.rate || b.average - a.average || b.games - a.games)[0] || null;
  const weakestScenario = [...scenariosWithData].sort((a, b) => a.rate - b.rate || a.average - b.average || b.games - a.games)[0] || null;

  const teams = [...teamMap.values()].map(item => ({
    ...item,
    average: item.games ? item.points / item.games : 0,
    hitRate: percent(item.hits, item.games),
  }));
  const eligibleTeams = teams.filter(item => item.games >= 2);
  const comparisonTeams = eligibleTeams.length ? eligibleTeams : teams;
  const bestTeam = [...comparisonTeams].sort((a, b) => b.points - a.points || b.average - a.average || b.hits - a.hits)[0] || null;
  const challengeTeam = [...comparisonTeams]
    .filter(item => item.misses > 0)
    .sort((a, b) => b.misses - a.misses || a.average - b.average || b.games - a.games)[0] || null;

  return {
    scenarios,
    strongestScenario,
    weakestScenario,
    teams,
    bestTeam,
    challengeTeam,
    hasEnoughData: entries.length >= 3,
  };
}

export function analyzeRankingHistory({
  games = [],
  picks = [],
  participantNames = [],
  selectedParticipant = "",
  isScorableGame,
  pointsForPick,
} = {}) {
  if (typeof isScorableGame !== "function") throw new TypeError("isScorableGame é obrigatório.");
  if (typeof pointsForPick !== "function") throw new TypeError("pointsForPick é obrigatório.");

  const names = [...new Set([
    ...participantNames,
    ...picks.map(pick => pick?.usuario),
  ].map(name => String(name || "").trim()).filter(Boolean))];
  const selected = String(selectedParticipant || "").trim();
  if (selected && !names.includes(selected)) names.push(selected);

  const scorableGames = games.filter(game => isScorableGame(game) && Number.isFinite(Number(game?.rodada)));
  const completedRounds = [...new Set(scorableGames.map(game => Number(game.rodada)))].sort((a, b) => a - b);
  const gameById = new Map(scorableGames.map(game => [Number(game.id_jogo), game]));
  const picksByRound = new Map();

  for (const pick of picks.filter(Boolean)) {
    const game = gameById.get(Number(pick.id_jogo));
    if (!game) continue;
    const round = Number(game.rodada);
    const list = picksByRound.get(round) || [];
    list.push({ pick, game });
    picksByRound.set(round, list);
  }

  const totals = new Map(names.map(name => [name, { name, total: 0, exact: 0, scored: 0 }]));
  const seriesByParticipant = new Map(names.map(name => [name, []]));
  const rounds = [];

  for (const round of completedRounds) {
    for (const { pick, game } of picksByRound.get(round) || []) {
      const name = String(pick.usuario || "").trim();
      if (!name) continue;
      if (!totals.has(name)) {
        totals.set(name, { name, total: 0, exact: 0, scored: 0 });
        seriesByParticipant.set(name, []);
      }
      const item = totals.get(name);
      const score = Math.max(0, Number(pointsForPick(pick, game)) || 0);
      item.total += score;
      item.scored += 1;
      if (score === 10) item.exact += 1;
    }

    const ranking = [...totals.values()].sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));
    const snapshot = ranking.map((item, index) => ({ ...item, position: index + 1 }));
    rounds.push({ round, ranking: snapshot });
    for (const item of snapshot) {
      seriesByParticipant.get(item.name).push({ round, position: item.position, points: item.total, exact: item.exact });
    }
  }

  const participants = [...seriesByParticipant.entries()].map(([name, series]) => ({ name, series }));
  const selectedSeries = seriesByParticipant.get(selected) || [];
  const positions = selectedSeries.map(item => item.position);
  let biggestClimb = null;
  let biggestDrop = null;
  for (let index = 1; index < selectedSeries.length; index += 1) {
    const previous = selectedSeries[index - 1];
    const current = selectedSeries[index];
    const movement = previous.position - current.position;
    if (movement > 0 && (!biggestClimb || movement > biggestClimb.places)) biggestClimb = { round: current.round, places: movement, from: previous.position, to: current.position };
    if (movement < 0 && (!biggestDrop || Math.abs(movement) > biggestDrop.places)) biggestDrop = { round: current.round, places: Math.abs(movement), from: previous.position, to: current.position };
  }

  const latest = selectedSeries.at(-1) || null;
  return {
    rounds,
    participants,
    selectedSeries,
    summary: {
      currentPosition: latest?.position ?? null,
      currentPoints: latest?.points ?? 0,
      bestPosition: positions.length ? Math.min(...positions) : null,
      worstPosition: positions.length ? Math.max(...positions) : null,
      biggestClimb,
      biggestDrop,
      completedRounds: completedRounds.length,
      participantCount: names.length,
    },
  };
}

