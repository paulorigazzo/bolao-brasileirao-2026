import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {analyzeRankingHistory} from "../js/statistics-engine.js";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const source=app.slice(app.indexOf("function homePreviousRoundModel("),app.indexOf("function renderHomePreviousRound("));
const scoring=app.slice(app.indexOf("function calculatePredictionPoints("),app.indexOf("function predictionResultLabel("));
const scoreRules=app.slice(app.indexOf("function isFinished("),app.indexOf("function gameStatusDisplay("));
const picks=new Map([[1,{gols_casa:2,gols_fora:1}],[2,{gols_casa:1,gols_fora:0}],[3,{gols_casa:0,gols_fora:0}]]);
const sandbox={ownPick:id=>picks.get(id),normalizeTeamKey:s=>s.toLowerCase(),gameStatusDisplay:g=>({key:g.status==="cancelado"?"cancelled":g.status}),CONFIG:{}};
vm.createContext(sandbox);
vm.runInContext(scoreRules+scoring+source,sandbox);
const model=(round,games)=>sandbox.homePreviousRoundModel(round,games);
const games=[{id_jogo:1,rodada:32,status:"encerrado",gols_casa:2,gols_fora:1},{id_jogo:2,rodada:32,status:"encerrado",gols_casa:2,gols_fora:0},{id_jogo:3,rodada:32,status:"adiado",gols_casa:null,gols_fora:null},{id_jogo:4,rodada:33,status:"encerrado",gols_casa:9,gols_fora:9}];
assert.equal(model(1,games),null);
assert.equal(model(34,games).round,33,"usa exatamente a rodada anterior");
assert.equal(model(30,games),null,"oculta quando não há partidas");
let result=model(33,games);
assert.equal(result.registered,3);assert.equal(result.total,3);assert.equal(result.finished,2);
assert.equal(result.points,13);assert.equal(result.exact,1);assert.equal(result.partial,true);
assert.equal(result.rate,65,"pontos sobre dez vezes todos os jogos avaliados");
games[2]={...games[2],status:"em_andamento",gols_casa:0,gols_fora:0};
assert.equal(model(33,games).points,13,"não inclui placares ao vivo");
games[2].status="encerrado";
result=model(33,games);assert.equal(result.points,23);assert.equal(result.exact,2);assert.equal(result.partial,false);
assert.equal(result.rate,77,"percentual arredondado para inteiro");
games[2].gols_casa=null;
assert.equal(model(33,games).partial,true,"resultado sem placar válido não consolida números");
picks.clear();result=model(33,games);assert.equal(result.registered,0);assert.equal(result.points,0);assert.equal(result.exact,0);
assert.equal(result.rate,0,"sem palpites em partidas avaliadas representa zero por cento");
assert.equal(model(33,[{...games[0],status:"adiado"}]).rate,null,"sem jogos avaliados não representa zero");
assert.ok(html.indexOf('id="homeOverview"')<html.indexOf('id="homePreviousRound"'));
assert.ok(html.indexOf('id="homePreviousRound"')<html.indexOf('id="homeLeagueHighlights"'));
const host={innerHTML:"",classList:{toggle(){}}};
sandbox.$=()=>host;sandbox.state={games,leagueContextStatus:"ready",participant:{nome:"Ana"}};
sandbox.publicPicksRefreshPending=false;
let series=[{round:31,position:5},{round:32,position:2},{round:33,position:1}];
sandbox.currentRankingHistory=name=>{assert.equal(name,"Ana");return {selectedSeries:series};};
vm.runInContext(app.slice(app.indexOf("function homePreviousRoundMovement("),app.indexOf("function homePreviousRoundModel(")),sandbox);
vm.runInContext(app.slice(app.indexOf("function renderHomePreviousRound("),app.indexOf("function renderHome(){")),sandbox);
vm.runInContext("renderHomePreviousRound(33)",sandbox);
assert.equal((host.innerHTML.match(/home-navigable-card/g)||[]).length,3);
assert.equal((host.innerHTML.match(/role="button" tabindex="0"/g)||[]).length,3);
assert.match(host.innerHTML,/data-home-action="ranking"/);
assert.match(host.innerHTML,/home-round-movement up">↑ 3/);
assert.match(host.innerHTML,/posições conquistadas/);
assert.match(host.innerHTML,/home-round-rate">0% de aproveitamento/);
assert.doesNotMatch(host.innerHTML,/data-home-action="legacy-games"/);
assert.match(host.innerHTML,/data-home-action="previous-round-stats" data-round="32"/);
assert.match(host.innerHTML,/data-home-action="round-highlights" data-round-highlights-round="32"/);
assert.equal((host.innerHTML.match(/<b aria-hidden="true">›<\/b>/g)||[]).length,3);
console.log("Rodada anterior: isolamento, pontos, exatos, parciais, reagendados e posição na Home aprovados.");

for(const [positions,expected,label] of [
  [[2,5],-3,'queda'],[[2,2],0,'estabilidade'],[[5,2],3,'subida'],
]){
  series=[{round:31,position:positions[0]},{round:32,position:positions[1]},{round:33,position:99}];
  assert.equal(sandbox.homePreviousRoundMovement(32),expected,label);
  sandbox.renderHomePreviousRound(33);
  assert.match(host.innerHTML,new RegExp(`home-round-movement ${expected>0?'up':expected<0?'down':'flat'}`));
}
series=[{round:30,position:5},{round:32,position:2}];
assert.equal(sandbox.homePreviousRoundMovement(32),null,'não substitui rodada ausente por outra rodada');
sandbox.renderHomePreviousRound(33);assert.match(host.innerHTML,/Sem histórico comparável/);
series=[{round:31,position:5},{round:32,position:2}];
sandbox.publicPicksRefreshPending=true;assert.equal(sandbox.homePreviousRoundMovement(32),null);
sandbox.publicPicksRefreshPending=false;sandbox.state.leagueContextStatus="loading";
assert.equal(sandbox.homePreviousRoundMovement(32),null,'não usa contexto anterior durante troca de liga');
sandbox.state.leagueContextStatus="ready";
// Integração com o histórico canônico: pontuação, desempate e rodada atual isolados.
const historicalGames=[31,32,33].map((round,index)=>({id_jogo:index+10,rodada:round,status:'encerrado',gols_casa:2,gols_fora:1}));
const historicalPicks=[
  {id_jogo:10,usuario:'Ana',gols_casa:0,gols_fora:1},{id_jogo:10,usuario:'Bia',gols_casa:1,gols_fora:0},
  {id_jogo:11,usuario:'Ana',gols_casa:2,gols_fora:1},{id_jogo:11,usuario:'Bia',gols_casa:0,gols_fora:1},
  {id_jogo:12,usuario:'Bia',gols_casa:2,gols_fora:1},
];
sandbox.currentRankingHistory=selectedParticipant=>analyzeRankingHistory({games:historicalGames,picks:historicalPicks,participantNames:['Ana','Bia'],selectedParticipant,isScorableGame:sandbox.isScorableGame,pointsForPick:sandbox.points});
assert.equal(sandbox.homePreviousRoundMovement(32),1,'reutiliza cálculo histórico e ignora rodada 33');
sandbox.currentRankingHistory=selectedParticipant=>analyzeRankingHistory({games:historicalGames,picks:historicalPicks.filter(p=>p.usuario==='Ana'),participantNames:['Ana'],selectedParticipant,isScorableGame:sandbox.isScorableGame,pointsForPick:sandbox.points});
assert.equal(sandbox.homePreviousRoundMovement(32),0,'nova liga não herda posições da anterior');
console.log('Variação: histórico canônico, subida, queda, estabilidade, dados ausentes, atualização e troca de liga aprovados.');

const navigationSource=app.slice(app.indexOf("function openPreviousRoundStatistics("),app.indexOf("function navigateTo("));
const interactions=[];
let hasRow=true,reduced=false;
const row={scrollIntoView:o=>interactions.push(["scroll",o.behavior]),focus:()=>interactions.push(["row-focus"]),classList:{add:c=>interactions.push(["add",c]),remove:c=>interactions.push(["remove",c])}};
const title={scrollIntoView:()=>interactions.push(["title-scroll"]),focus:()=>interactions.push(["title-focus"])};
const navContext={Number,navigateTo:(tab,{onReady})=>{assert.equal(tab,"stats");onReady();},$:id=>id==="statsTab"?{classList:{contains:()=>false}}:id==="statsEvolutionTitle"?title:{querySelector:selector=>{assert.equal(selector,'[data-stats-round-highlights="32"]');return hasRow?row:null;}},prefersReducedMotion:()=>reduced,document:{querySelectorAll:()=>[]},setTimeout:fn=>fn()};
vm.createContext(navContext);vm.runInContext(navigationSource,navContext);
navContext.openPreviousRoundStatistics(32);
assert.deepEqual(interactions,[["scroll","smooth"],["row-focus"],["add","stats-round-target"],["remove","stats-round-target"]]);
interactions.length=0;reduced=true;navContext.openPreviousRoundStatistics(32);assert.equal(interactions[0][1],"auto");
interactions.length=0;hasRow=false;navContext.openPreviousRoundStatistics(32);assert.deepEqual(interactions,[["title-scroll"],["title-focus"]]);
interactions.length=0;navContext.openPreviousRoundStatistics("inválida");assert.equal(interactions.length,0);
console.log("Destino Estatísticas: rodada correta, destaque temporário, movimento reduzido e ausência de dados aprovados.");
