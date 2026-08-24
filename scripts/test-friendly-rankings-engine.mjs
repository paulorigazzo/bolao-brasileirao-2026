import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildFriendlyRankingsModel } from "../js/friendly-rankings-engine.js";

const participants = ["Ana", "Bia", "Caio"].map((name, index) => ({ user_id: `u${index + 1}`, nome: name }));
const games = [];
const picks = [];
for (let round = 1; round <= 3; round++) {
  for (let index = 1; index <= 10; index++) {
    const id = round * 100 + index;
    games.push({ id_jogo: id, rodada: round, status: "encerrado", gols_casa: 1, gols_fora: 0 });
    participants.forEach((participant, participantIndex) => {
      if (participant.nome === "Caio" && index > 6) return;
      picks.push({ user_id: participant.user_id, usuario: participant.nome, id_jogo: id, score: participantIndex === 0 ? 3 : participantIndex === 1 ? 2 : 10 });
    });
  }
}

const model = buildFriendlyRankingsModel({
  games,
  picks,
  participants,
  currentParticipant: participants[1],
  isScorableGame: game => game.status === "encerrado",
  pointsForPick: pick => pick.score,
});

assert.equal(model.efficiency.ranking.length, 2, "mínimo de 20 palpites deve ser aplicado");
assert.equal(model.efficiency.ranking[0].name, "Ana");
assert.equal(model.efficiency.ranking[1].isCurrent, true);
assert.deepEqual(model.hot.ranking[0].rounds, [1, 2, 3]);
assert.equal(model.hot.ranking.some(item => item.name === "Caio"), false, "rodadas com menos de 7 palpites não são elegíveis");

const tied = buildFriendlyRankingsModel({
  games: games.slice(0, 20),
  picks: [
    ...games.slice(0, 20).map(game => ({ user_id: "u1", usuario: "Ana", id_jogo: game.id_jogo, score: 2 })),
    ...games.slice(0, 20).map((game, index) => ({ user_id: "u2", usuario: "Bia", id_jogo: game.id_jogo, score: index < 4 ? 10 : 0 })),
  ],
  participants: participants.slice(0, 2),
  isScorableGame: () => true,
  pointsForPick: pick => pick.score,
});
assert.equal(tied.efficiency.ranking[0].name, "Bia", "taxa proporcional de exatos desempata médias iguais");
assert.match(model.teaser, /Ana.*dividir os troféus/i);

const root = fileURLToPath(new URL("../", import.meta.url));
const html = readFileSync(`${root}index.html`, "utf8");
const app = readFileSync(`${root}js/app.js`, "utf8");
assert.equal((html.match(/id="friendlyRankingsModal"/g) || []).length, 1);
assert.match(html, /id="rankingTableTitle"[\s\S]*id="rankingUpdatedAt"[\s\S]*id="friendlyRankingsTeaser"/i, "a chamada deve aparecer depois da classificação completa");
assert.match(html, /Quem joga, resolve[\s\S]*Tá vindo quente/i);
assert.match(app, /minimumEvaluated = 20|buildFriendlyRankingsModel\([\s\S]*pointsForPick/i);
assert.match(app, /friendlyRankingsReturnFocus[\s\S]*target\?\.focus/i, "o foco deve voltar ao acionador");
assert.match(app, /event\.key!=="Escape"[\s\S]*closeFriendlyRankings/i);

console.log("Rankings recreativos verificados com sucesso.");
