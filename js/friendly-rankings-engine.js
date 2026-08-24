const normalize = value => String(value || "").trim().toLocaleLowerCase("pt-BR");

function identity(value = {}) {
  return {
    id: String(value.user_id || value.userId || "").trim(),
    name: String(value.nome || value.name || value.usuario || "Participante").trim(),
  };
}

function belongsTo(pick, participant) {
  const left = identity(pick);
  const right = identity(participant);
  if (left.id && right.id) return left.id === right.id;
  return normalize(left.name) === normalize(right.name);
}

function sameParticipant(left, right) {
  return belongsTo(left, right);
}

function rank(items) {
  return items
    .sort((a, b) => b.average - a.average || b.exactRate - a.exactRate || b.hitRate - a.hitRate || b.evaluated - a.evaluated || a.name.localeCompare(b.name, "pt-BR"))
    .map((item, index) => ({ ...item, position: index + 1 }));
}

function leaderPhrase(kind, ranking) {
  const leader = ranking[0];
  const second = ranking[1];
  if (!leader) return kind === "efficiency" ? "A calculadora ainda está esperando material." : "A chapa ainda não esquentou.";
  if (kind === "efficiency") {
    if (second && leader.average - second.average < 0.02) return `${leader.name} lidera por um espirro estatístico. ${second.name} já pediu recontagem.`;
    return `${leader.name} aparece pouco, resolve bastante e agora tem números para provocar.`;
  }
  if (second && leader.average - second.average < 0.15) return `${leader.name} está em alta, com ${second.name} devidamente instalado no retrovisor.`;
  return `${leader.name} aumentou a temperatura. A humildade fica para a próxima rodada.`;
}

function participantPhrase(kind, item, ranking, criteria) {
  const above = item.position > 1 ? ranking[item.position - 2] : null;
  const gap = above ? Math.max(0, above.average - item.average) : 0;
  if (kind === "efficiency") {
    if (item.position === 1) return "Poucos ou muitos palpites: a calculadora só registrou o estrago.";
    if (gap < 0.02) return "Separado da posição acima por um espirro estatístico.";
    if (item.position <= 3) return "Eficiência em zona de medalha e argumentos em plena circulação.";
    if (item.evaluated <= criteria.minimumEvaluated + 5) return "Amostra enxuta, confiança aparentemente ilimitada.";
    if (item.exactRate >= 0.1) return "Placar exato aparece com frequência suspeitosamente conveniente.";
    if (item.hitRate >= 0.45) return "Nem sempre crava, mas raramente sai sem assunto.";
    return "Cada palpite ajuda a estatística a perder a timidez.";
  }
  if (item.position === 1) return "A fase está quente e a modéstia ficou para a próxima rodada.";
  if (gap < 0.15) return "Já apareceu no retrovisor de quem está logo acima.";
  if (item.position <= 3) return "Pódio recente: o campeonato recebeu uma ameaça educada.";
  if (item.average >= 2) return "Três rodadas de bons argumentos e pouca cerimônia.";
  if (item.hitRate >= 0.45) return "Pontuando o bastante para manter a conversa desconfortável.";
  return "A reação está em construção e já trouxe capacete.";
}

function addParticipantPhrases(kind, ranking, criteria) {
  return ranking.map(item => ({ ...item, effectPhrase: participantPhrase(kind, item, ranking, criteria) }));
}

export function buildFriendlyRankingsModel({
  games = [],
  picks = [],
  participants = [],
  currentParticipant = null,
  isScorableGame,
  pointsForPick,
  minimumEvaluated = 20,
  minimumRoundPicks = 7,
  recentRoundCount = 3,
} = {}) {
  if (typeof isScorableGame !== "function") throw new TypeError("isScorableGame é obrigatório.");
  if (typeof pointsForPick !== "function") throw new TypeError("pointsForPick é obrigatório.");

  const scorableGames = games.filter(isScorableGame);
  const gamesById = new Map(scorableGames.map(game => [Number(game.id_jogo), game]));
  const directory = new Map();
  const ensure = source => {
    const item = identity(source);
    const key = item.id ? `id:${item.id}` : `name:${normalize(item.name)}`;
    if (!directory.has(key)) directory.set(key, { key, ...item, entries: [] });
    return directory.get(key);
  };
  participants.forEach(ensure);
  for (const pick of picks) {
    const game = gamesById.get(Number(pick.id_jogo));
    if (!game) continue;
    const participant = ensure(pick);
    participant.entries.push({ game, points: Math.max(0, Number(pointsForPick(pick, game)) || 0) });
  }

  const efficiency = rank([...directory.values()].map(participant => {
    const evaluated = participant.entries.length;
    const points = participant.entries.reduce((sum, entry) => sum + entry.points, 0);
    const exact = participant.entries.filter(entry => entry.points === 10).length;
    const hits = participant.entries.filter(entry => entry.points > 0).length;
    return { key: participant.key, id: participant.id, name: participant.name, evaluated, points, average: evaluated ? points / evaluated : 0, exactRate: evaluated ? exact / evaluated : 0, hitRate: evaluated ? hits / evaluated : 0, exact, hits };
  }).filter(item => item.evaluated >= minimumEvaluated));

  const hot = rank([...directory.values()].map(participant => {
    const byRound = new Map();
    for (const entry of participant.entries) {
      const round = Number(entry.game.rodada);
      if (!Number.isFinite(round)) continue;
      const item = byRound.get(round) || { round, entries: [] };
      item.entries.push(entry);
      byRound.set(round, item);
    }
    const rounds = [...byRound.values()].filter(item => item.entries.length >= minimumRoundPicks).sort((a, b) => b.round - a.round).slice(0, recentRoundCount).reverse();
    const entries = rounds.flatMap(item => item.entries);
    const points = entries.reduce((sum, entry) => sum + entry.points, 0);
    const exact = entries.filter(entry => entry.points === 10).length;
    const hits = entries.filter(entry => entry.points > 0).length;
    return { key: participant.key, id: participant.id, name: participant.name, rounds: rounds.map(item => item.round), roundCount: rounds.length, evaluated: entries.length, points, average: entries.length ? points / entries.length : 0, exactRate: entries.length ? exact / entries.length : 0, hitRate: entries.length ? hits / entries.length : 0, exact, hits };
  }).filter(item => item.roundCount === recentRoundCount));

  const current = currentParticipant ? identity(currentParticipant) : null;
  const markCurrent = ranking => ranking.map(item => ({ ...item, isCurrent: Boolean(current && sameParticipant(item, current)) }));
  const criteria = { minimumEvaluated, minimumRoundPicks, recentRoundCount };
  const efficiencyRanking = addParticipantPhrases("efficiency", markCurrent(efficiency), criteria);
  const hotRanking = addParticipantPhrases("hot", markCurrent(hot), criteria);
  const efficiencyLeader = efficiencyRanking[0] || null;
  const hotLeader = hotRanking[0] || null;
  const teaser = efficiencyLeader && hotLeader
    ? efficiencyLeader.name === hotLeader.name
      ? `${efficiencyLeader.name} aparentemente não entendeu o conceito de dividir os troféus.`
      : `${efficiencyLeader.name} lidera em eficiência; ${hotLeader.name} segue impossível nas últimas rodadas.`
    : "As disputas paralelas ainda estão aquecendo os números.";

  return {
    criteria,
    teaser,
    efficiency: { ranking: efficiencyRanking, phrase: leaderPhrase("efficiency", efficiencyRanking) },
    hot: { ranking: hotRanking, phrase: leaderPhrase("hot", hotRanking) },
  };
}
