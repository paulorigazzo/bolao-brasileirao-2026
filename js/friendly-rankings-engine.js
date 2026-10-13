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

function roundRecords({ games, picks, participants, currentParticipant, isScorableGame, pointsForPick }) {
  const rounds = new Map();
  for (const game of games) {
    const round = Number(game.rodada), id = Number(game.id_jogo);
    if (!Number.isInteger(round) || round < 1 || !Number.isInteger(id) || id < 1) continue;
    if (!rounds.has(round)) rounds.set(round, new Map());
    rounds.get(round).set(id, game);
  }
  // Brasileirão: ten distinct fixtures must be present and finalized, including rescheduled games.
  const completed = new Map([...rounds].filter(([, fixtures]) => fixtures.size === 10 && [...fixtures.values()].every(isScorableGame)));
  const gamesById = new Map([...completed.values()].flatMap(fixtures => [...fixtures]));
  const members = participants.filter(participant => participant.ativo !== false);
  const records = new Map(), seen = new Set();
  for (const pick of picks) {
    const game = gamesById.get(Number(pick.id_jogo));
    if (!game) continue;
    const member = members.find(participant => belongsTo(pick, participant));
    if (!member) continue;
    const participant = identity(member);
    const key = participant.id ? `id:${participant.id}` : `name:${normalize(participant.name)}`;
    const pickKey = `${key}:game:${Number(game.id_jogo)}`;
    if (seen.has(pickKey)) continue;
    seen.add(pickKey);
    const round = Number(game.rodada), recordKey = `${key}:round:${round}`;
    if (!records.has(recordKey)) records.set(recordKey, { key: recordKey, ...participant, round, points: 0, exact: 0, fivePointHits: 0, threePointHits: 0, isCurrent: Boolean(currentParticipant && sameParticipant(member, currentParticipant)) });
    const record = records.get(recordKey), earned = Math.max(0, Number(pointsForPick(pick, game)) || 0);
    record.points += earned;
    if (earned === 10) record.exact++;
    if (earned === 5) record.fivePointHits++;
    if (earned === 3) record.threePointHits++;
  }
  const comparePerformance = (a, b) => b.points - a.points || b.exact - a.exact || b.fivePointHits - a.fivePointHits || b.threePointHits - a.threePointHits;
  const ordered = [...records.values()].sort((a, b) => comparePerformance(a, b) || b.round - a.round || a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id));
  const personalBests = new Map();
  for (const record of ordered) {
    const key = record.id ? `id:${record.id}` : `name:${normalize(record.name)}`;
    if (!personalBests.has(key)) personalBests.set(key, record);
  }
  let position = 0, previous = null;
  return [...personalBests.values()]
    .map((item, index) => {
      if (!previous || comparePerformance(previous, item) !== 0) position = index + 1;
      previous = item;
      return { ...item, position };
    });
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
    records: { ranking: roundRecords({ games, picks, participants, currentParticipant, isScorableGame, pointsForPick }) },
  };
}
