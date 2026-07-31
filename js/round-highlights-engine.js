const fold = value => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const finiteNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const plural = (value, singular, pluralForm = `${singular}s`) => value === 1 ? singular : pluralForm;

function participantIdentity(participant = {}) {
  const id = String(participant.user_id ?? participant.id ?? "").trim();
  const name = String(participant.name ?? participant.nome ?? participant.usuario ?? "").trim();
  return {
    key: id ? `user:${id}` : name ? `name:${fold(name)}` : "",
    userId: id || null,
    name,
  };
}

function createParticipantDirectory(participants, picks) {
  const byKey = new Map();
  const byName = new Map();

  const register = candidate => {
    const identity = participantIdentity(candidate);
    if (!identity.key) return null;
    const current = byKey.get(identity.key);
    const resolved = {
      key: identity.key,
      userId: identity.userId || current?.userId || null,
      name: current?.name || identity.name || "Participante",
    };
    byKey.set(resolved.key, resolved);
    if (resolved.name) byName.set(fold(resolved.name), resolved.key);
    return resolved;
  };

  participants.filter(Boolean).forEach(register);
  picks.filter(Boolean).forEach(pick => {
    const raw = participantIdentity(pick);
    const nameKey = fold(raw.name);
    if (!raw.userId && nameKey && byName.has(nameKey)) return;
    register(pick);
  });

  const resolve = candidate => {
    const identity = participantIdentity(candidate);
    if (identity.userId && byKey.has(`user:${identity.userId}`)) return byKey.get(`user:${identity.userId}`);
    const knownKey = identity.name ? byName.get(fold(identity.name)) : "";
    if (knownKey) return byKey.get(knownKey);
    return register(candidate);
  };

  return { byKey, resolve };
}

function lifecycleForRound(games, { isScorableGame, gameStatusDisplay }) {
  const lifecycle = { total: games.length, finished: 0, live: 0, future: 0, postponed: 0, cancelled: 0, invalid: 0 };
  for (const game of games) {
    if (isScorableGame(game)) {
      lifecycle.finished += 1;
      continue;
    }
    const key = String(gameStatusDisplay(game)?.key || "").toLowerCase();
    if (["live", "future", "postponed", "cancelled"].includes(key)) lifecycle[key] += 1;
    else lifecycle.invalid += 1;
  }
  lifecycle.concluded = lifecycle.finished + lifecycle.cancelled;
  lifecycle.completion = lifecycle.total ? Math.round((lifecycle.concluded / lifecycle.total) * 100) : 0;
  lifecycle.isComplete = lifecycle.total > 0 && lifecycle.finished + lifecycle.cancelled === lifecycle.total;
  lifecycle.isProvisional = !lifecycle.isComplete || lifecycle.postponed > 0 || lifecycle.invalid > 0;
  lifecycle.status = !lifecycle.total ? "empty" : lifecycle.isProvisional ? "provisional" : "finished";
  return lifecycle;
}

function emptyScore(identity) {
  return { ...identity, points: 0, exact: 0, hits: 0, picks: 0, position: null };
}

function scoreRound({ games, picks, directory, pointsForPick }) {
  const gameById = new Map(games.map(game => [Number(game.id_jogo), game]));
  const scores = new Map([...directory.byKey.values()].map(identity => [identity.key, emptyScore(identity)]));
  const exactByGame = new Map();

  for (const pick of picks) {
    const game = gameById.get(Number(pick?.id_jogo));
    const identity = directory.resolve(pick);
    if (!game || !identity) continue;
    if (!scores.has(identity.key)) scores.set(identity.key, emptyScore(identity));
    const item = scores.get(identity.key);
    const points = Math.max(0, finiteNumber(pointsForPick(pick, game)));
    item.points += points;
    item.picks += 1;
    if (points > 0) item.hits += 1;
    if (points === 10) {
      item.exact += 1;
      const exact = exactByGame.get(Number(game.id_jogo)) || [];
      exact.push(identity.key);
      exactByGame.set(Number(game.id_jogo), exact);
    }
  }
  return { scores, exactByGame };
}

function rankingFromScores(scores) {
  return [...scores.values()]
    .sort((a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name, "pt-BR"))
    .map((item, index) => ({ ...item, position: index + 1 }));
}

function cumulativeRanking({ rounds, picks, directory, pointsForPick }) {
  const totals = new Map([...directory.byKey.values()].map(identity => [identity.key, emptyScore(identity)]));
  for (const roundGames of rounds) {
    const roundScore = scoreRound({ games: roundGames, picks, directory, pointsForPick }).scores;
    for (const item of roundScore.values()) {
      if (!totals.has(item.key)) totals.set(item.key, emptyScore(item));
      const total = totals.get(item.key);
      total.points += item.points;
      total.exact += item.exact;
      total.hits += item.hits;
      total.picks += item.picks;
    }
  }
  return rankingFromScores(totals);
}

function makeFact({ key, scope, priority, title, detail, evidence, participantKeys = [] }) {
  return { key, scope, priority, title, detail, participantKeys, evidence };
}

function winnersBy(items, selector) {
  if (!items.length) return [];
  const best = Math.max(...items.map(selector));
  return best > 0 ? items.filter(item => selector(item) === best) : [];
}

export function buildRoundHighlightsModel({
  round,
  games = [],
  picks = [],
  participants = [],
  selectedParticipantId = "",
  selectedParticipantName = "",
  isScorableGame,
  gameStatusDisplay,
  pointsForPick,
} = {}) {
  if (!Number.isFinite(Number(round))) throw new TypeError("round é obrigatório.");
  if (typeof isScorableGame !== "function") throw new TypeError("isScorableGame é obrigatório.");
  if (typeof gameStatusDisplay !== "function") throw new TypeError("gameStatusDisplay é obrigatório.");
  if (typeof pointsForPick !== "function") throw new TypeError("pointsForPick é obrigatório.");

  const selectedRound = Number(round);
  const directory = createParticipantDirectory(participants, picks);
  const roundGames = games.filter(game => Number(game?.rodada) === selectedRound);
  const scorableRoundGames = roundGames.filter(isScorableGame);
  const lifecycle = lifecycleForRound(roundGames, { isScorableGame, gameStatusDisplay });
  const roundScore = scoreRound({ games: scorableRoundGames, picks, directory, pointsForPick });
  const roundRanking = rankingFromScores(roundScore.scores);

  const completedRounds = [...new Set(games.filter(isScorableGame).map(game => Number(game?.rodada)).filter(value => Number.isFinite(value) && value <= selectedRound))].sort((a, b) => a - b);
  const gamesByRound = new Map(completedRounds.map(value => [value, games.filter(game => Number(game?.rodada) === value && isScorableGame(game))]));
  const previousRoundNumbers = completedRounds.filter(value => value < selectedRound);
  const previousRanking = cumulativeRanking({ rounds: previousRoundNumbers.map(value => gamesByRound.get(value)), picks, directory, pointsForPick });
  const currentRanking = cumulativeRanking({ rounds: completedRounds.map(value => gamesByRound.get(value)), picks, directory, pointsForPick });
  const previousPositions = new Map(previousRanking.map(item => [item.key, item.position]));
  const movements = currentRanking.map(item => ({
    key: item.key,
    name: item.name,
    from: previousPositions.get(item.key) ?? null,
    to: item.position,
    places: previousPositions.has(item.key) ? previousPositions.get(item.key) - item.position : 0,
  }));

  const selectedIdentity = directory.resolve({ user_id: selectedParticipantId, nome: selectedParticipantName });
  const selectedRoundScore = selectedIdentity ? roundRanking.find(item => item.key === selectedIdentity.key) || emptyScore(selectedIdentity) : null;
  const selectedCurrent = selectedIdentity ? currentRanking.find(item => item.key === selectedIdentity.key) || null : null;
  const selectedMovement = selectedIdentity ? movements.find(item => item.key === selectedIdentity.key) || null : null;

  const participantRoundHistory = selectedIdentity ? previousRoundNumbers.map(value => {
    const result = scoreRound({ games: gamesByRound.get(value), picks, directory, pointsForPick }).scores.get(selectedIdentity.key);
    return { round: value, points: result?.points || 0, exact: result?.exact || 0 };
  }) : [];
  const historicalAverage = participantRoundHistory.length
    ? participantRoundHistory.reduce((sum, item) => sum + item.points, 0) / participantRoundHistory.length
    : null;
  const previousBest = participantRoundHistory.length ? Math.max(...participantRoundHistory.map(item => item.points)) : null;

  const groupFacts = [];
  const personalFacts = [];
  const roundWinners = winnersBy(roundRanking, item => item.points);
  if (roundWinners.length) groupFacts.push(makeFact({
    key: "round-winner",
    scope: "group",
    priority: 100,
    title: roundWinners.length === 1 ? `${roundWinners[0].name} venceu a rodada` : `${roundWinners.length} participantes empataram na rodada`,
    detail: `${roundWinners[0].points} ${plural(roundWinners[0].points, "ponto")}.`,
    participantKeys: roundWinners.map(item => item.key),
    evidence: { source: "round-ranking", round: selectedRound, points: roundWinners[0].points, participantKeys: roundWinners.map(item => item.key) },
  }));

  const exactLeaders = winnersBy(roundRanking, item => item.exact);
  if (exactLeaders.length) groupFacts.push(makeFact({
    key: "exact-leader",
    scope: "group",
    priority: 70,
    title: exactLeaders.length === 1 ? `${exactLeaders[0].name} liderou nos placares exatos` : `${exactLeaders.length} participantes lideraram nos placares exatos`,
    detail: `${exactLeaders[0].exact} ${plural(exactLeaders[0].exact, "placar exato", "placares exatos")}.`,
    participantKeys: exactLeaders.map(item => item.key),
    evidence: { source: "round-exact-scores", round: selectedRound, exact: exactLeaders[0].exact, participantKeys: exactLeaders.map(item => item.key) },
  }));

  const climbs = movements.filter(item => item.places > 0);
  const biggestClimbs = winnersBy(climbs, item => item.places);
  if (biggestClimbs.length) groupFacts.push(makeFact({
    key: "biggest-climb",
    scope: "group",
    priority: 80,
    title: biggestClimbs.length === 1 ? `${biggestClimbs[0].name} teve a maior subida` : `${biggestClimbs.length} participantes tiveram a maior subida`,
    detail: `${biggestClimbs[0].places} ${plural(biggestClimbs[0].places, "posição", "posições")}.`,
    participantKeys: biggestClimbs.map(item => item.key),
    evidence: { source: "ranking-history", round: selectedRound, places: biggestClimbs[0].places, movements: biggestClimbs },
  }));

  const gameById = new Map(scorableRoundGames.map(game => [Number(game.id_jogo), game]));
  for (const [gameId, participantKeys] of roundScore.exactByGame) {
    if (participantKeys.length !== 1) continue;
    const participant = directory.byKey.get(participantKeys[0]);
    const game = gameById.get(gameId);
    const fact = makeFact({
      key: `unique-exact:${gameId}`,
      scope: "group",
      priority: 90,
      title: `${participant.name} teve um acerto exclusivo`,
      detail: `${String(game?.time_casa || "Mandante")} × ${String(game?.time_fora || "Visitante")}.`,
      participantKeys,
      evidence: { source: "exact-picks-by-game", round: selectedRound, gameId, participantKeys },
    });
    groupFacts.push(fact);
    if (selectedIdentity?.key === participantKeys[0]) personalFacts.push({ ...fact, scope: "personal", priority: 110 });
  }

  if (selectedRoundScore) {
    const comparison = historicalAverage == null ? "insufficient" : selectedRoundScore.points > historicalAverage + 0.5 ? "above" : selectedRoundScore.points < historicalAverage - 0.5 ? "below" : "near";
    personalFacts.push(makeFact({
      key: "personal-round-performance",
      scope: "personal",
      priority: 100,
      title: `${selectedRoundScore.points} ${plural(selectedRoundScore.points, "ponto")} na rodada`,
      detail: comparison === "above" ? "Desempenho acima da sua média." : comparison === "below" ? "Desempenho abaixo da sua média." : comparison === "near" ? "Desempenho próximo da sua média." : "Ainda não há histórico suficiente para comparação.",
      participantKeys: [selectedRoundScore.key],
      evidence: { source: "participant-round-history", round: selectedRound, points: selectedRoundScore.points, historicalAverage, comparison },
    }));

    if (previousBest != null && selectedRoundScore.points >= previousBest) personalFacts.push(makeFact({
      key: selectedRoundScore.points > previousBest ? "new-personal-best" : "matched-personal-best",
      scope: "personal",
      priority: selectedRoundScore.points > previousBest ? 105 : 85,
      title: selectedRoundScore.points > previousBest ? "Nova melhor rodada pessoal" : "Você igualou sua melhor rodada",
      detail: `${selectedRoundScore.points} ${plural(selectedRoundScore.points, "ponto")}.`,
      participantKeys: [selectedRoundScore.key],
      evidence: { source: "participant-round-history", round: selectedRound, points: selectedRoundScore.points, previousBest },
    }));
  }

  if (selectedMovement?.from != null && selectedMovement.places !== 0) personalFacts.push(makeFact({
    key: "personal-ranking-movement",
    scope: "personal",
    priority: 95,
    title: selectedMovement.places > 0 ? `Você subiu ${selectedMovement.places} ${plural(selectedMovement.places, "posição", "posições")}` : `Você caiu ${Math.abs(selectedMovement.places)} ${plural(Math.abs(selectedMovement.places), "posição", "posições")}`,
    detail: `${selectedMovement.from}º → ${selectedMovement.to}º.`,
    participantKeys: [selectedMovement.key],
    evidence: { source: "ranking-history", round: selectedRound, ...selectedMovement },
  }));

  if (selectedCurrent && currentRanking.length) {
    const leader = currentRanking[0];
    const gap = Math.max(0, leader.points - selectedCurrent.points);
    personalFacts.push(makeFact({
      key: "personal-ranking-context",
      scope: "personal",
      priority: 60,
      title: selectedCurrent.position === 1 ? "Você está na liderança" : `${gap} ${plural(gap, "ponto")} até a liderança`,
      detail: `${selectedCurrent.position}º lugar de ${currentRanking.length}.`,
      participantKeys: [selectedCurrent.key],
      evidence: { source: "cumulative-ranking", round: selectedRound, position: selectedCurrent.position, participantCount: currentRanking.length, leaderKey: leader.key, gap },
    }));
  }

  const sortFacts = facts => [...facts].sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
  return {
    round: selectedRound,
    status: lifecycle.status,
    isProvisional: lifecycle.isProvisional,
    lifecycle,
    selectedParticipant: selectedIdentity || null,
    roundRanking,
    currentRanking,
    movements,
    facts: {
      personal: sortFacts(personalFacts),
      group: sortFacts(groupFacts),
    },
    provenance: {
      engine: "round-highlights-v1",
      round: selectedRound,
      scorableGameIds: scorableRoundGames.map(game => Number(game.id_jogo)),
      excludedGameIds: roundGames.filter(game => !isScorableGame(game)).map(game => Number(game.id_jogo)),
    },
  };
}
