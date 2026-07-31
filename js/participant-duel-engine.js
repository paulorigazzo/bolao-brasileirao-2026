const normalizeName = value => String(value || "").trim().toLocaleLowerCase("pt-BR");

function participantIdentity(participant = {}) {
  const key = String(participant?.key || "");
  const keyId = key.startsWith("id:") ? key.slice(3) : "";
  return {
    id: String(participant?.user_id || keyId || "").trim(),
    name: String(participant?.name || participant?.nome || "").trim(),
  };
}

function sameParticipant(left, right) {
  const a = participantIdentity(left);
  const b = participantIdentity(right);
  if (a.id && b.id) return a.id === b.id;
  return Boolean(a.name && b.name && normalizeName(a.name) === normalizeName(b.name));
}

function belongsTo(pick, participant) {
  const identity = participantIdentity(participant);
  const pickId = String(pick?.user_id || "").trim();
  if (identity.id && pickId) return identity.id === pickId;
  return Boolean(identity.name && normalizeName(pick?.usuario) === normalizeName(identity.name));
}

function rankingEntry(ranking, participant) {
  return (ranking || []).find(item => sameParticipant(item, participant)) || null;
}

function safePoints(value) {
  const points = Number(value);
  return Number.isFinite(points) ? Math.max(0, points) : 0;
}

function titleFor(side, other) {
  if (side.wins > other.wins) return { key: "ahead", label: "Na dianteira", evidence: `${side.wins} rodada${side.wins === 1 ? "" : "s"} vencida${side.wins === 1 ? "" : "s"}.` };
  if (side.exact > other.exact) return { key: "precision", label: "Olho clínico", evidence: `${side.exact} placar${side.exact === 1 ? "" : "es"} exato${side.exact === 1 ? "" : "s"} no duelo.` };
  if (side.recentWins > other.recentWins) return { key: "form", label: "Em alta", evidence: `${side.recentWins} vitória${side.recentWins === 1 ? "" : "s"} nas últimas rodadas.` };
  if (side.maxMargin > other.maxMargin) return { key: "surge", label: "Maior arrancada", evidence: `Maior vantagem em uma rodada: ${side.maxMargin} ponto${side.maxMargin === 1 ? "" : "s"}.` };
  return { key: "balanced", label: "Páreo duro", evidence: "Confronto sem vantagem individual suficiente para outro título." };
}

function duelMoment({ rounds, current, opponent, officialGap }) {
  if (rounds.length < 3) return { key: "forming", icon: "🌱", label: "Rivalidade em formação", description: "Ainda faltam rodadas comparáveis para definir o momento do duelo." };

  const latestThree = [...rounds].slice(-3);
  if (latestThree.every(item => item.winner === "current")) return { key: "streak", icon: "🔥", label: "Sequência quente", description: `${current.name} venceu as três rodadas comparáveis mais recentes.` };
  if (latestThree.every(item => item.winner === "opponent")) return { key: "streak", icon: "🔥", label: "Sequência quente", description: `${opponent.name} venceu as três rodadas comparáveis mais recentes.` };

  const recent = [...rounds].slice(-5);
  const currentRecentWins = recent.filter(item => item.winner === "current").length;
  const opponentRecentWins = recent.filter(item => item.winner === "opponent").length;
  if (officialGap < 0 && currentRecentWins >= 3) return { key: "comeback", icon: "📈", label: "Virada no radar", description: `${current.name} está atrás no total, mas venceu ${currentRecentWins} das últimas ${recent.length} rodadas.` };
  if (officialGap > 0 && opponentRecentWins >= 3) return { key: "comeback", icon: "📈", label: "Virada no radar", description: `${opponent.name} está atrás no total, mas venceu ${opponentRecentWins} das últimas ${recent.length} rodadas.` };

  const winGap = Math.abs(current.wins - opponent.wins);
  const leaderPoints = Math.max(current.officialPoints, opponent.officialPoints);
  const closePoints = Math.abs(officialGap) <= Math.max(5, Math.round(leaderPoints * 0.1));
  if (winGap <= 1 && closePoints) return { key: "close", icon: "⚖️", label: "Duelo acirrado", description: `A diferença é de ${Math.abs(officialGap)} ponto${Math.abs(officialGap) === 1 ? "" : "s"} e no máximo uma vitória por rodada.` };
  if (winGap >= 3) {
    const leader = current.wins > opponent.wins ? current : opponent;
    return { key: "advantage", icon: "🏁", label: "Vantagem construída", description: `${leader.name} abriu ${winGap} vitórias de diferença no duelo.` };
  }
  return { key: "friendly", icon: "🤝", label: "Disputa amistosa", description: "O confronto segue competitivo, sem uma sequência dominante no momento." };
}

function duelPhrase({ rounds, current, opponent, officialGap }) {
  if (rounds.length < 2) return "A rivalidade está começando — ainda faltam rodadas para esquentar.";
  if (current.wins === opponent.wins) return "Nem o VAR separa vocês: o confronto por rodadas está empatado.";
  const recent = [...rounds].slice(-5);
  const currentRecentWins = recent.filter(item => item.winner === "current").length;
  const opponentRecentWins = recent.filter(item => item.winner === "opponent").length;
  if (officialGap < 0 && currentRecentWins >= 3) return `${opponent.name} está à frente nos pontos oficiais, mas ${current.name} venceu ${currentRecentWins} das últimas ${recent.length}.`;
  if (officialGap > 0 && opponentRecentWins >= 3) return `${current.name} está à frente nos pontos oficiais, mas ${opponent.name} venceu ${opponentRecentWins} das últimas ${recent.length}.`;
  const leader = current.wins > opponent.wins ? current : opponent;
  const trailer = leader === current ? opponent : current;
  const trailerKey = trailer === current ? "current" : "opponent";
  const trailerRecentWins = recent.filter(item => item.winner === trailerKey).length;
  if (recent.length >= 3 && trailerRecentWins >= 3) return `${leader.name} lidera o duelo, mas ${trailer.name} venceu ${trailerRecentWins} das últimas ${recent.length}.`;
  if (officialGap === 0) return `${leader.name} venceu mais rodadas, mas vocês seguem empatados em pontos oficiais.`;
  const pointLeader = officialGap > 0 ? current : opponent;
  if (pointLeader !== leader) return `${leader.name} leva vantagem nas rodadas; ${pointLeader.name} ainda está à frente nos pontos oficiais.`;
  const gap = Math.abs(officialGap);
  if (gap <= Math.max(5, Math.round(Math.max(current.officialPoints, opponent.officialPoints) * 0.1))) return `Só ${gap} ponto${gap === 1 ? "" : "s"} separa${gap === 1 ? "" : "m"} vocês. Qualquer rodada pode mudar o roteiro.`;
  return `${leader.name} está na frente no duelo e construiu ${gap} ponto${gap === 1 ? "" : "s"} de vantagem oficial.`;
}

export function buildParticipantDuelModel({
  games = [],
  picks = [],
  ranking = [],
  currentParticipant,
  opponent,
  isScorableGame,
  gameStatusDisplay,
  pointsForPick,
} = {}) {
  if (typeof isScorableGame !== "function") throw new TypeError("isScorableGame é obrigatório.");
  if (typeof gameStatusDisplay !== "function") throw new TypeError("gameStatusDisplay é obrigatório.");
  if (typeof pointsForPick !== "function") throw new TypeError("pointsForPick é obrigatório.");

  const currentIdentity = participantIdentity(currentParticipant);
  const opponentIdentity = participantIdentity(opponent);
  if (!currentIdentity.name || !opponentIdentity.name) return { available: false, reason: "participant-missing", rounds: [] };
  if (sameParticipant(currentParticipant, opponent)) return { available: false, reason: "same-participant", rounds: [] };

  const gamesByRound = new Map();
  for (const game of games || []) {
    const round = Number(game?.rodada);
    if (!Number.isFinite(round)) continue;
    if (!gamesByRound.has(round)) gamesByRound.set(round, []);
    gamesByRound.get(round).push(game);
  }

  const rounds = [];
  for (const [round, roundGames] of [...gamesByRound.entries()].sort((a, b) => a[0] - b[0])) {
    const statuses = roundGames.map(game => gameStatusDisplay(game)?.key);
    if (statuses.includes("live") || statuses.includes("future")) continue;
    const scorableGames = roundGames.filter(isScorableGame).sort((a, b) => Number(a.id_jogo) - Number(b.id_jogo));
    if (!scorableGames.length) continue;

    const gameIds = new Set(scorableGames.map(game => Number(game.id_jogo)));
    const currentPicks = (picks || []).filter(pick => gameIds.has(Number(pick?.id_jogo)) && belongsTo(pick, currentParticipant));
    const opponentPicks = (picks || []).filter(pick => gameIds.has(Number(pick?.id_jogo)) && belongsTo(pick, opponent));
    if (!currentPicks.length || !opponentPicks.length) continue;

    const currentByGame = new Map(currentPicks.map(pick => [Number(pick.id_jogo), pick]));
    const opponentByGame = new Map(opponentPicks.map(pick => [Number(pick.id_jogo), pick]));
    const totals = { current: 0, opponent: 0, currentExact: 0, opponentExact: 0, currentScored: 0, opponentScored: 0 };
    for (const game of scorableGames) {
      const currentPoints = safePoints(pointsForPick(currentByGame.get(Number(game.id_jogo)) || null, game));
      const opponentPoints = safePoints(pointsForPick(opponentByGame.get(Number(game.id_jogo)) || null, game));
      totals.current += currentPoints;
      totals.opponent += opponentPoints;
      if (currentPoints === 10) totals.currentExact++;
      if (opponentPoints === 10) totals.opponentExact++;
      if (currentPoints > 0) totals.currentScored++;
      if (opponentPoints > 0) totals.opponentScored++;
    }
    const winner = totals.current === totals.opponent ? "tie" : totals.current > totals.opponent ? "current" : "opponent";
    rounds.push({
      round,
      ...totals,
      winner,
      margin: Math.abs(totals.current - totals.opponent),
      gamesConsidered: scorableGames.length,
      provisional: statuses.includes("postponed"),
    });
  }

  if (!rounds.length) return { available: false, reason: "insufficient-data", rounds: [] };

  const currentRanking = rankingEntry(ranking, currentParticipant);
  const opponentRanking = rankingEntry(ranking, opponent);
  const recentRounds = [...rounds].slice(-5).reverse();
  const sideModel = (key, identity, entry) => ({
    key,
    name: identity.name,
    position: entry ? (ranking || []).indexOf(entry) + 1 : null,
    officialPoints: safePoints(entry?.total),
    officialExact: safePoints(entry?.exact),
    officialScored: safePoints(entry?.scored),
    wins: rounds.filter(item => item.winner === key).length,
    exact: rounds.reduce((sum, item) => sum + item[`${key}Exact`], 0),
    scored: rounds.reduce((sum, item) => sum + item[`${key}Scored`], 0),
    recentPoints: recentRounds.reduce((sum, item) => sum + item[key], 0),
    recentWins: recentRounds.filter(item => item.winner === key).length,
    maxMargin: Math.max(0, ...rounds.filter(item => item.winner === key).map(item => item.margin)),
  });
  const current = sideModel("current", currentIdentity, currentRanking);
  const opponentModel = sideModel("opponent", opponentIdentity, opponentRanking);
  const officialGap = current.officialPoints - opponentModel.officialPoints;
  current.title = titleFor(current, opponentModel);
  opponentModel.title = titleFor(opponentModel, current);

  return {
    available: true,
    reason: null,
    current,
    opponent: opponentModel,
    rounds,
    recentRounds,
    comparableRounds: rounds.length,
    ties: rounds.filter(item => item.winner === "tie").length,
    provisional: rounds.some(item => item.provisional),
    officialGap,
    moment: duelMoment({ rounds, current, opponent: opponentModel, officialGap }),
    phrase: duelPhrase({ rounds, current, opponent: opponentModel, officialGap }),
  };
}
