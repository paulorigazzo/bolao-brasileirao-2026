import assert from "node:assert/strict";
import { buildParticipantDuelModel } from "../js/participant-duel-engine.js";

const participants = {
  current: { user_id: "u1", name: "Paulo", key: "id:u1" },
  opponent: { user_id: "u2", name: "Mariana", key: "id:u2" },
};

const game = (id, round, status = "finished") => ({ id_jogo: id, rodada: round, status });
const pick = (userId, name, gameId, points) => ({ user_id: userId, usuario: name, id_jogo: gameId, testPoints: points });
const isScorableGame = item => item.status === "finished";
const gameStatusDisplay = item => ({ key: item.status });
const pointsForPick = item => Number(item?.testPoints) || 0;

function model({ rounds, ranking = [{ ...participants.current, total: 80, exact: 4, scored: 18 }, { ...participants.opponent, total: 85, exact: 3, scored: 19 }] }) {
  const games = [];
  const picks = [];
  rounds.forEach((entry, index) => {
    const id = index + 1;
    games.push(game(id, entry.round, entry.status || "finished"));
    picks.push(pick("u1", "Nome antigo", id, entry.current));
    picks.push(pick("u2", "Mariana", id, entry.opponent));
    if (entry.postponed) games.push(game(100 + id, entry.round, "postponed"));
  });
  return buildParticipantDuelModel({ games, picks, ranking, ...participants, currentParticipant: participants.current, opponent: participants.opponent, isScorableGame, gameStatusDisplay, pointsForPick });
}

{
  const result = model({ rounds: [{ round: 1, current: 10, opponent: 3 }, { round: 2, current: 4, opponent: 4 }, { round: 3, current: 0, opponent: 5 }] });
  assert.equal(result.available, true);
  assert.equal(result.current.wins, 1);
  assert.equal(result.opponent.wins, 1);
  assert.equal(result.ties, 1);
  assert.equal(result.current.exact, 1);
  assert.equal(result.phrase, "Nem o VAR separa vocês: o confronto por rodadas está empatado.");
}

{
  const result = model({ rounds: [{ round: 1, current: 3, opponent: 1 }, { round: 2, current: 5, opponent: 0 }, { round: 3, current: 10, opponent: 3 }] });
  assert.equal(result.moment.key, "streak");
  assert.equal(result.current.title.key, "ahead");
}

{
  const result = model({
    rounds: [{ round: 1, current: 0, opponent: 10 }, { round: 2, current: 5, opponent: 3 }, { round: 3, current: 5, opponent: 3 }, { round: 4, current: 5, opponent: 3 }, { round: 5, current: 0, opponent: 3 }],
    ranking: [{ ...participants.current, total: 70, exact: 2, scored: 15 }, { ...participants.opponent, total: 90, exact: 4, scored: 20 }],
  });
  assert.equal(result.moment.key, "comeback");
  assert.match(result.phrase, /venceu 3 das últimas 5/);
}

{
  const result = model({
    rounds: [{ round: 1, current: 10, opponent: 3 }, { round: 2, current: 2, opponent: 4 }, { round: 3, current: 3, opponent: 3 }],
    ranking: [{ ...participants.current, total: 100, exact: 5, scored: 22 }, { ...participants.opponent, total: 104, exact: 4, scored: 23 }],
  });
  assert.equal(result.moment.key, "close");
  assert.equal(result.current.title.key, "precision");
}

{
  const result = model({
    rounds: [{ round: 1, current: 10, opponent: 0 }, { round: 2, current: 5, opponent: 0 }, { round: 3, current: 3, opponent: 0 }, { round: 4, current: 0, opponent: 1 }, { round: 5, current: 3, opponent: 0 }],
    ranking: [{ ...participants.current, total: 95, exact: 4, scored: 20 }, { ...participants.opponent, total: 80, exact: 3, scored: 18 }],
  });
  assert.equal(result.moment.key, "advantage");
  assert.equal(result.opponent.title.key, "balanced");
  assert.equal(result.current.maxMargin, 10);
}

{
  const result = model({ rounds: [{ round: 1, current: 3, opponent: 0 }, { round: 2, current: 0, opponent: 3 }] });
  assert.equal(result.moment.key, "forming");
}

{
  const result = model({
    rounds: [
      { round: 1, current: 3, opponent: 0 },
      { round: 2, current: 3, opponent: 0 },
      { round: 3, current: 0, opponent: 3 },
      { round: 4, current: 3, opponent: 0 },
      { round: 5, current: 0, opponent: 3 },
      { round: 6, current: 0, opponent: 3 },
    ],
  });
  assert.equal(result.current.wins, result.opponent.wins);
  assert.equal(result.opponent.title.key, "form");
}

{
  const result = model({ rounds: [{ round: 1, current: 8, opponent: 0 }, { round: 2, current: 0, opponent: 3 }] });
  assert.equal(result.current.wins, result.opponent.wins);
  assert.equal(result.current.title.key, "surge");
}

{
  const games = [game(1, 1, "future"), game(2, 2, "live"), game(3, 3, "finished"), game(4, 3, "postponed"), game(5, 4, "cancelled")];
  const picks = [pick("u1", "Paulo", 1, 10), pick("u2", "Mariana", 1, 0), pick("u1", "Paulo", 2, 10), pick("u2", "Mariana", 2, 0), pick("u1", "Paulo", 3, 5), pick("u2", "Mariana", 3, 3)];
  const result = buildParticipantDuelModel({ games, picks, ranking: [], currentParticipant: participants.current, opponent: participants.opponent, isScorableGame, gameStatusDisplay, pointsForPick });
  assert.deepEqual(result.rounds.map(item => item.round), [3]);
  assert.equal(result.provisional, true);
}

{
  const result = buildParticipantDuelModel({ games: [game(1, 1)], picks: [pick("u1", "Paulo", 1, 3)], ranking: [], currentParticipant: participants.current, opponent: participants.opponent, isScorableGame, gameStatusDisplay, pointsForPick });
  assert.equal(result.available, false);
  assert.equal(result.reason, "insufficient-data");
}

{
  const inputRounds = [{ round: 3, current: 3, opponent: 1 }, { round: 1, current: 1, opponent: 3 }, { round: 2, current: 4, opponent: 4 }];
  const forward = model({ rounds: inputRounds });
  const backward = model({ rounds: [...inputRounds].reverse() });
  assert.deepEqual(forward.rounds, backward.rounds);
  assert.equal(forward.phrase, backward.phrase);
}

{
  const result = buildParticipantDuelModel({ games: [game(1, 1)], picks: [], ranking: [], currentParticipant: participants.current, opponent: participants.current, isScorableGame, gameStatusDisplay, pointsForPick });
  assert.equal(result.reason, "same-participant");
}

console.log("Motor de duelo entre participantes verificado com sucesso.");
