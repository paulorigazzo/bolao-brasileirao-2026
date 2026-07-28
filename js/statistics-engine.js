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


export function analyzeAdvancedStatistics({
  entries = [],
  rounds = [],
  ranking = [],
  selectedParticipant = "",
  pointsForEntry,
} = {}) {
  if (typeof pointsForEntry !== "function") throw new TypeError("pointsForEntry é obrigatório.");

  const selected = String(selectedParticipant || "").trim();
  const scores = entries.filter(Boolean).map(entry => Math.max(0, Number(pointsForEntry(entry)) || 0));
  const total = scores.reduce((sum, value) => sum + value, 0);
  const exact = scores.filter(value => value === 10).length;
  const hits = scores.filter(value => value > 0).length;
  const evaluated = scores.length;

  const roundPoints = rounds.map(item => Number(item?.points) || 0);
  const roundAverage = roundPoints.length ? roundPoints.reduce((sum, value) => sum + value, 0) / roundPoints.length : 0;
  const variance = roundPoints.length
    ? roundPoints.reduce((sum, value) => sum + ((value - roundAverage) ** 2), 0) / roundPoints.length
    : 0;
  const standardDeviation = Math.sqrt(variance);
  const consistency = roundPoints.length < 2 ? null : Math.max(0, Math.min(100, Math.round(100 - (standardDeviation / Math.max(1, roundAverage)) * 45)));

  let currentScoringStreak = 0;
  for (let index = scores.length - 1; index >= 0 && scores[index] > 0; index -= 1) currentScoringStreak += 1;
  let bestScoringStreak = 0;
  let bestExactStreak = 0;
  let scoringRun = 0;
  let exactRun = 0;
  for (const score of scores) {
    scoringRun = score > 0 ? scoringRun + 1 : 0;
    exactRun = score === 10 ? exactRun + 1 : 0;
    bestScoringStreak = Math.max(bestScoringStreak, scoringRun);
    bestExactStreak = Math.max(bestExactStreak, exactRun);
  }

  const validRanking = ranking.filter(item => Number(item?.scored) > 0);
  const sorted = [...validRanking].sort((a, b) => Number(b.total) - Number(a.total) || Number(b.exact) - Number(a.exact));
  const meIndex = sorted.findIndex(item => String(item?.name || "").trim() === selected);
  const me = meIndex >= 0 ? sorted[meIndex] : null;
  const leader = sorted[0] || null;
  const above = meIndex > 0 ? sorted[meIndex - 1] : null;
  const below = meIndex >= 0 && meIndex < sorted.length - 1 ? sorted[meIndex + 1] : null;
  const groupAverageTotal = sorted.length ? sorted.reduce((sum, item) => sum + Number(item.total || 0), 0) / sorted.length : 0;
  const percentile = meIndex >= 0 && sorted.length > 1 ? Math.round(((sorted.length - 1 - meIndex) / (sorted.length - 1)) * 100) : me ? 100 : null;

  const personalRecords = {
    bestRound: rounds.length ? [...rounds].sort((a, b) => Number(b.points) - Number(a.points) || Number(b.exact) - Number(a.exact))[0] : null,
    bestScoringStreak,
    bestExactStreak,
    exact,
    hits,
    evaluated,
  };

  const medals = [];
  const addMedal = (key, icon, title, description, earned) => medals.push({ key, icon, title, description, earned: Boolean(earned) });
  addMedal("exact", "🎯", "Mira de Elite", `${exact} placar${exact === 1 ? "" : "es"} exato${exact === 1 ? "" : "s"}.`, exact >= 2);
  addMedal("streak", "🔥", "Sequência Quente", `Melhor série de ${bestScoringStreak} jogos pontuando.`, bestScoringStreak >= 4);
  addMedal("consistency", "🏆", "Consistência de Ferro", consistency == null ? "Aguardando mais rodadas." : `Índice de regularidade de ${consistency}%.`, consistency != null && consistency >= 70);
  addMedal("leader", "🥇", "Líder do Bolão", "Ocupa a primeira posição da classificação.", meIndex === 0 && Boolean(me));
  addMedal("top3", "🚀", "Pelotão de Elite", "Está entre os três melhores participantes.", meIndex >= 0 && meIndex < 3);
  addMedal("recovery", "📈", "Fase Ascendente", "Média recente superior ao período anterior.", rounds.length >= 4 && Number(rounds.at(-1)?.average || 0) > Number(rounds.at(-2)?.average || 0));

  const comparisons = sorted.filter(item => item !== me).map((item, index) => ({
    name: item.name,
    position: index + 1 + (meIndex >= 0 && index >= meIndex ? 1 : 0),
    total: Number(item.total || 0),
    difference: me ? Number(me.total || 0) - Number(item.total || 0) : null,
    exact: Number(item.exact || 0),
  })).sort((a, b) => Math.abs(a.difference ?? Infinity) - Math.abs(b.difference ?? Infinity));

  const insights = [];
  if (consistency != null) insights.push(consistency >= 70
    ? `Sua regularidade é forte: o índice de consistência está em ${consistency}%.`
    : `Sua pontuação varia bastante entre rodadas; o índice de consistência está em ${consistency}%.`);
  if (me && leader) insights.push(meIndex === 0
    ? `Você lidera o bolão com ${Number(me.total || 0)} pontos.`
    : `Faltam ${Math.max(0, Number(leader.total || 0) - Number(me.total || 0))} pontos para alcançar a liderança.`);
  if (above && me) insights.push(`O participante imediatamente acima está ${Math.max(0, Number(above.total || 0) - Number(me.total || 0))} ponto${Math.abs(Number(above.total || 0) - Number(me.total || 0)) === 1 ? "" : "s"} à frente.`);
  if (bestScoringStreak >= 3) insights.push(`Sua melhor sequência foi de ${bestScoringStreak} jogos consecutivos pontuando.`);
  if (evaluated >= 3) insights.push(`${Math.round((hits / evaluated) * 100)}% dos palpites avaliados renderam pontos.`);

  return {
    totals: { total, exact, hits, evaluated },
    consistency: { index: consistency, average: roundAverage, standardDeviation },
    streaks: { currentScoringStreak, bestScoringStreak, bestExactStreak },
    personalRecords,
    group: {
      position: meIndex >= 0 ? meIndex + 1 : null,
      participantCount: sorted.length,
      percentile,
      groupAverageTotal,
      gapToLeader: me && leader ? Math.max(0, Number(leader.total || 0) - Number(me.total || 0)) : null,
      gapToAbove: me && above ? Math.max(0, Number(above.total || 0) - Number(me.total || 0)) : null,
      leadOverBelow: me && below ? Math.max(0, Number(me.total || 0) - Number(below.total || 0)) : null,
      leader: leader?.name || null,
      above: above?.name || null,
      below: below?.name || null,
    },
    comparisons,
    medals,
    insights,
  };
}


export function buildStatisticsDashboardModel({
  advancedStats,
  roundAnalysis,
  predictionProfile,
  totalPoints = 0,
  counts = {},
  finished = 0,
} = {}) {
  if (!advancedStats || !roundAnalysis || !predictionProfile) {
    throw new TypeError("advancedStats, roundAnalysis e predictionProfile são obrigatórios.");
  }

  const group = advancedStats.group || {};
  const consistency = Number(advancedStats.consistency?.index);
  const relationToAverage = Number.isFinite(group.groupAverageTotal)
    ? Number(totalPoints) - Number(group.groupAverageTotal)
    : null;
  const trendDirectory = {
    up: { icon: "↗", label: "Em alta", title: "Seu ritmo está crescendo", detail: `+${Math.abs(Number(roundAnalysis.delta) || 0).toFixed(1)} pt/jogo recentemente`, text: `Sua média recente subiu ${Math.abs(Number(roundAnalysis.delta) || 0).toFixed(1)} ponto por jogo.` },
    down: { icon: "↘", label: "Em atenção", title: "Hora de buscar a reação", detail: `-${Math.abs(Number(roundAnalysis.delta) || 0).toFixed(1)} pt/jogo recentemente`, text: `Sua média recente caiu ${Math.abs(Number(roundAnalysis.delta) || 0).toFixed(1)} ponto por jogo.` },
    stable: { icon: "→", label: "Estável", title: "Você mantém o ritmo", detail: "média próxima das rodadas anteriores", text: "Sua média recente está próxima das rodadas anteriores." },
    insufficient: { icon: "·", label: "Em formação", title: "Sua história está começando", detail: "aguardando mais rodadas", text: "São necessárias mais rodadas completas para identificar uma tendência." },
  };
  const trend = trendDirectory[roundAnalysis.trend] || trendDirectory.insufficient;

  const nearestGap = group.position === 1
    ? { label: "Vantagem atual", value: group.leadOverBelow == null ? "—" : `${group.leadOverBelow} pts`, detail: group.below || "sem perseguidor" }
    : { label: "Próxima posição", value: group.gapToAbove == null ? "—" : `${group.gapToAbove} pts`, detail: group.above || "participante acima" };

  const specialtyDirectory = [
    { key: "exact", label: "Placares exatos", title: "Rei dos Placares", icon: "🎯" },
    { key: "difference", label: "Diferenças exatas", title: "Mestre do Saldo", icon: "📐" },
    { key: "winner", label: "Vencedores corretos", title: "Leitor de Jogo", icon: "🏁" },
    { key: "draw", label: "Empates", title: "Mestre dos Empates", icon: "⚖️" },
  ];
  const specialty = specialtyDirectory.map(item => ({ ...item, value: Number(counts[item.key]) || 0 })).sort((a, b) => b.value - a.value)[0];

  let dynamicTitle = { icon: "⚽", title: "Palpiteiro em Evolução", description: "Seu perfil ficará mais claro a cada rodada." };
  if (group.position === 1) dynamicTitle = { icon: "👑", title: "Dono da Liderança", description: "Você é a referência atual do bolão." };
  else if (roundAnalysis.trend === "up") dynamicTitle = { icon: "🔥", title: "Em Ascensão", description: "Seu desempenho recente está ganhando força." };
  else if (Number.isFinite(consistency) && consistency >= 75) dynamicTitle = { icon: "⭐", title: "Muralha da Regularidade", description: "Você mantém um nível de pontuação muito consistente." };
  else if (group.gapToLeader != null && group.gapToLeader <= 8) dynamicTitle = { icon: "🦁", title: "Caçador do Líder", description: "A liderança está ao alcance de uma boa sequência." };
  else if (finished >= 3 && specialty?.value) dynamicTitle = { icon: specialty.icon, title: specialty.title, description: `${specialty.label} são o destaque do seu perfil.` };

  let moment = { tone: "neutral", icon: "⚽", eyebrow: "SEU MOMENTO", title: "Temporada em construção", text: "Continue registrando seus palpites para revelar tendências mais precisas.", badge: dynamicTitle.title };
  if (group.position === 1 && roundAnalysis.trend !== "down") moment = { tone: "celebration", icon: "👑", eyebrow: "SEU MOMENTO", title: "Você dita o ritmo do bolão", text: group.leadOverBelow != null ? `A liderança é sua, com ${group.leadOverBelow} ponto${group.leadOverBelow===1?'':'s'} de vantagem sobre ${group.below || 'o perseguidor mais próximo'}.` : "Você está na liderança e é o participante a ser alcançado.", badge: dynamicTitle.title };
  else if (roundAnalysis.trend === "up") moment = { tone: "positive", icon: "🔥", eyebrow: "SEU MOMENTO", title: "Em grande fase", text: group.gapToAbove != null ? `Sua média está subindo e faltam ${group.gapToAbove} ponto${group.gapToAbove===1?'':'s'} para alcançar ${group.above || 'a próxima posição'}.` : "Sua média recente cresceu. É uma boa hora para manter a sequência.", badge: dynamicTitle.title };
  else if (roundAnalysis.trend === "down") moment = { tone: "attention", icon: "⚠️", eyebrow: "SEU MOMENTO", title: "Hora da reação", text: "As últimas rodadas ficaram abaixo do seu ritmo anterior. Uma boa rodada pode mudar rapidamente esse cenário.", badge: dynamicTitle.title };
  else if (Number.isFinite(consistency) && consistency >= 75) moment = { tone: "steady", icon: "🛡️", eyebrow: "SEU MOMENTO", title: "Regularidade em destaque", text: "Seu desempenho varia pouco entre as rodadas, uma qualidade importante para permanecer competitivo.", badge: dynamicTitle.title };

  const recommendations = [];
  if (group.position > 1 && group.gapToAbove != null && group.gapToAbove <= 5) recommendations.push({ icon: "🚀", title: "Próxima posição ao alcance", text: `Apenas ${group.gapToAbove} ponto${group.gapToAbove===1?' separa':'s separam'} você de ${group.above || 'quem está logo acima'}.` });
  if (finished >= 4 && specialty?.value) recommendations.push({ icon: specialty.icon, title: `Aproveite seu ponto forte`, text: `${specialty.label} representam ${Math.round((specialty.value / finished) * 100)}% dos seus palpites avaliados.` });
  if (roundAnalysis.trend === "down") recommendations.push({ icon: "🎯", title: "Volte ao básico", text: "Priorize primeiro o vencedor provável; o placar exato pode vir como consequência." });
  else if (roundAnalysis.trend === "up") recommendations.push({ icon: "🔥", title: "Mantenha o método", text: "Seu desempenho recente melhorou. Evite mudanças bruscas na forma de palpitar." });
  if (Number.isFinite(consistency)) recommendations.push({ icon: consistency >= 75 ? "🛡️" : "📊", title: consistency >= 75 ? "Regularidade é sua aliada" : "Busque mais regularidade", text: consistency >= 75 ? "Seu nível de consistência ajuda a sustentar posições ao longo do campeonato." : "Resultados mais equilibrados entre rodadas podem reduzir oscilações no ranking." });
  if (!recommendations.length) recommendations.push({ icon: "📅", title: "Continue participando", text: "Quanto mais rodadas completas, mais úteis e personalizadas ficam suas análises." });

  const insights = [{ key: "trend", icon: trend.icon, eyebrow: "TENDÊNCIA RECENTE", title: trend.title, text: trend.text, tone: `trend-${roundAnalysis.trend || "insufficient"}` }];
  if (finished && specialty?.value) insights.push({ key: "specialty", icon: specialty.icon, eyebrow: "SEU DESTAQUE", title: specialty.label, text: `${specialty.value} ocorrência${specialty.value === 1 ? "" : "s"} · ${Math.round((specialty.value / finished) * 100)}% dos palpites avaliados.`, tone: "" });
  else insights.push({ key: "specialty", icon: "✨", eyebrow: "SEU DESTAQUE", title: "Especialidade em formação", text: "Os primeiros resultados revelarão seu tipo de acerto mais frequente.", tone: "" });
  const bestRound = advancedStats.personalRecords?.bestRound || null;
  if (bestRound) insights.push({ key: "best-round", icon: "🏆", eyebrow: "MELHOR RODADA", title: `Rodada ${bestRound.round} · ${bestRound.points} pts`, text: `${bestRound.hits || 0} acerto${bestRound.hits === 1 ? "" : "s"} em ${bestRound.games || 0} jogo${bestRound.games === 1 ? "" : "s"}${bestRound.exact ? ` · ${bestRound.exact} placar${bestRound.exact === 1 ? "" : "es"} exato${bestRound.exact === 1 ? "" : "s"}` : ""}.`, tone: "" });

  const consistencyLabel = !Number.isFinite(consistency) ? { label: "Em formação", stars: 0 } : consistency >= 85 ? { label: "Muito consistente", stars: 5 } : consistency >= 70 ? { label: "Consistente", stars: 4 } : consistency >= 50 ? { label: "Em evolução", stars: 3 } : { label: "Oscilante", stars: 2 };

  return {
    executive: { available: Boolean(group.position), position: group.position, participantCount: group.participantCount, totalPoints: Number(totalPoints) || 0, relationToAverage, nearestGap, trend: { ...trend, key: roundAnalysis.trend || "insufficient" }, consistency: { value: Number.isFinite(consistency) ? consistency : null, ...consistencyLabel } },
    moment,
    dynamicTitle,
    recommendations: recommendations.slice(0, 3),
    records: advancedStats.personalRecords || {},
    medals: advancedStats.medals || [],
    insights: insights.slice(0, 3),
    comparison: { groupAverageTotal: Number(group.groupAverageTotal) || 0, gapToLeader: group.gapToLeader, gapToAbove: group.gapToAbove, leadOverBelow: group.leadOverBelow },
  };
}
