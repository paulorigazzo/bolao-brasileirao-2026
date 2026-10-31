import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { buildMyTeamStatistics, renderMyTeamStatistics } from "../js/my-team-statistics.js";

const normalizeTeamKey = value => String(value || "").trim().toLowerCase();
const isScorableGame = game => game.status === "encerrado" && game.gols_casa != null && game.gols_fora != null;
const team = { name: "Clube" };
const games = [], projections = [];
for (let i = 1; i <= 24; i++) {
  const home = i % 2 === 1;
  const own = { shots: i, shotsOnTarget: 1, fouls: 10, yellowCards: 2, redCards: 0, possession: 55, corners: 4 };
  const other = { shots: 5, shotsOnTarget: 2, corners: 3 };
  games.push({ id_jogo: i, api_football_id: i + 100, rodada: i, inicio: `2026-09-${String(i).padStart(2, "0")}T20:00:00Z`, status: "encerrado", time_casa: home ? "Clube" : "Rival", time_fora: home ? "Rival" : "Clube", gols_casa: home ? 1 : 0, gols_fora: home ? 0 : 1 });
  projections.push({ id_jogo: i, id_externo: i + 100, estatisticas: { home: home ? own : other, away: home ? other : own } });
}
const input = { team, games, projections, normalizeTeamKey, isScorableGame };
const untouched = JSON.stringify(input);
const build = changes => buildMyTeamStatistics({ ...input, ...changes });
const model = build();
assert.equal(model.games, 24);
assert.equal(model.metrics.shots.value, 12.5);
assert.equal(model.metrics.against.value, 5);
assert.equal(model.metrics.balance.value, 7.5);
assert.equal(model.metrics.accuracy.value, 24 / 300 * 100, "taxa deve usar somas, não média dos percentuais");
assert.equal(model.metrics.conversion.value, 24 / 300 * 100);
assert.equal(model.metrics.redCards.value, 0, "zero é dado válido");
assert.equal(model.metrics.clean.value, 24);
assert.deepEqual(model.trends.attack, { before: 1, recent: 1, delta: 0 });
assert.equal(build({ scope: "home" }).metrics.shots.value, 12);
assert.equal(build({ scope: "away" }).metrics.shots.value, 13);
assert.equal(build({ scope: "invalid" }).scope, "all");
assert.equal(build({ games: [...games, games[0]] }).games, 24, "não duplicar jogos");
assert.equal(build({ team: { name: "Ausente" } }).games, 0);
assert.equal(build({ games: games.map(game => ({ ...game, status: "em_andamento" })) }).games, 0);
assert.equal(build({ games: games.map(game => ({ ...game, status: "cancelado" })) }).games, 0);

const missing = structuredClone(projections);
missing[0].estatisticas.home.shots = null;
missing[0].estatisticas.home.yellowCards = undefined;
missing[0].estatisticas.home.redCards = "";
missing[0].estatisticas.home.possession = 101;
assert.equal(build({ projections: missing }).metrics.shots.games, 23);
assert.equal(build({ projections: missing }).metrics.yellowCards.games, 23);
assert.equal(build({ projections: missing }).metrics.redCards.games, 23);
assert.equal(build({ projections: missing }).metrics.possession.games, 23);
assert.equal(build({ projections: [] }).metrics.shots.value, null);
assert.equal(build({ projections: [] }).metrics.clean.games, 24, "placares canônicos independem das estatísticas");
const mismatched = projections.map(projection => ({ ...projection, id_externo: 9999 }));
assert.equal(build({ projections: mismatched }).metrics.shots.games, 0, "não associar cache de outro fixture");
const negative = structuredClone(projections);
negative[0].estatisticas.home.fouls = -2;
negative[0].estatisticas.home.shotsOnTarget = 99;
assert.equal(build({ projections: negative }).metrics.fouls.games, 23);
assert.equal(build({ projections: negative }).metrics.shotsOnTarget.games, 23);
const zeros = projections.map(projection => ({ ...projection, estatisticas: { home: { shots: 0, shotsOnTarget: 0 }, away: { shots: 0, shotsOnTarget: 0 } } }));
assert.equal(build({ projections: zeros }).metrics.accuracy.value, null, "denominador zero não produz porcentagem");
assert.equal(build({ projections: zeros }).metrics.shots.value, 0);

assert.equal(build({ games: games.slice(-9) }).trends.attack, null);
assert.equal(build({ games: games.slice(-10), scope: "home" }).trends.attack, null);
const gap = structuredClone(projections);
delete gap.at(-1).estatisticas.away.yellowCards;
const gapModel = build({ projections: gap });
assert.equal(gapModel.trends.discipline, null, "não buscar jogo antigo para preencher lacuna nos últimos dez");
assert.notEqual(gapModel.trends.attack, null, "lacuna em cartão não impede análise de chutes");
const reordered = [...games].reverse().map(game => ({ ...game, rodada: 40 - game.rodada }));
assert.deepEqual(build({ games: reordered }).trends, model.trends, "sequência usa data do jogo, inclusive reagendados");
const changing = structuredClone(projections);
for (const projection of changing.slice(-5)) {
  const own = projection.id_jogo % 2 === 1 ? projection.estatisticas.home : projection.estatisticas.away;
  own.shotsOnTarget = 3;
  own.yellowCards = 0;
}
const changingModel = build({ games: reordered, projections: changing });
assert.deepEqual(changingModel.trends.attack, { before: 1, recent: 3, delta: 2 });
assert.deepEqual(changingModel.trends.discipline, { before: 2, recent: 0, delta: -2 });
assert.equal(JSON.stringify(input), untouched, "modelo não modifica entradas");

const html = renderMyTeamStatistics(model);
assert.match(html, /Disciplina/);
assert.match(html, /Faltas \/ jogo/);
assert.match(html, /Vermelhos no período/);
assert.match(html, /aria-pressed="true"/);
assert.match(html, /Sem variação/);
assert.equal((html.match(/class="home-mini-card club-stat/g) || []).length, 12, "cada indicador reutiliza o card da Home");
assert.equal((html.match(/class="mini-card-icon" aria-hidden="true"/g) || []).length, 12);
assert.doesNotMatch(html, /home-navigable-card|data-home-action|role="button"/, "cards numéricos são informativos");
assert.match(html, /<span>Finalizações<\/span><strong>12,5<\/strong><small>/);
assert.match(html, /aria-label="Faltas \/ jogo"/);
assert.match(renderMyTeamStatistics(build({ scope: "away" })), /fora de casa/);
assert.match(renderMyTeamStatistics(gapModel), /Comparação disponível/);
assert.match(renderMyTeamStatistics(model, { detailsOpen: true }), /class="club-stat-details" open/);
assert.doesNotMatch(renderMyTeamStatistics(build({ games: [] })), /NaN|Infinity|undefined/);
assert.doesNotMatch(html, /<details[^>]*>\s*<summary>.*Disciplina/);
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(app, /myTeamClubStatistics\(team,statisticsDetailsOpen\)/);
assert.match(app, /section\.outerHTML=myTeamClubStatistics\(team,detailsOpen\)/);
assert.match(app, /focus\(\{preventScroll:true\}\)/);
assert.doesNotMatch(readFileSync(new URL("../js/my-team-statistics.js", import.meta.url), "utf8"), /fetch\(|\.from\(|\.rpc\(/);
// Exercise the actual delegated app handler, including focus and expanded details.
let clickHandler, focused = false, navigation = null;
const section = { outerHTML: "", querySelector: () => ({ open: true }) };
const host = { querySelector: selector => selector === ".club-statistics" ? section : { focus: options => { focused = options.preventScroll; } } };
const context = {
  state: { participant: { time_favorito: "Clube" } },
  myTeamStatisticsScope: "all",
  findTeam: name => ({ name }),
  myTeamClubStatistics: (selectedTeam, open) => `${selectedTeam.name}:${open}`,
  navigateTo: action => { navigation = action; },
  $: id => id === "myTeamTab" ? { addEventListener: (_type, handler) => { clickHandler = handler; } } : host,
};
vm.createContext(context);
const handlerStart = app.indexOf('$("myTeamTab")?.addEventListener("click",event=>{');
const handlerEnd = app.indexOf('$("myTeamTab")?.addEventListener("keydown"', handlerStart);
vm.runInContext(app.slice(handlerStart, handlerEnd), context);
clickHandler({ target: { closest: selector => selector === "[data-club-stat-scope]" ? { dataset: { clubStatScope: "away" } } : null } });
assert.equal(context.myTeamStatisticsScope, "away");
assert.equal(section.outerHTML, "Clube:true");
assert.equal(focused, true);
clickHandler({ target: { closest: selector => selector === "[data-my-team-action]" ? { dataset: { myTeamAction: "games" } } : null } });
assert.equal(navigation, "games", "destinos existentes preservados");
console.log("Estatísticas Meu Time: cálculos, amostras, filtros, dados ausentes, períodos, identidade do cache e renderização aprovados.");
