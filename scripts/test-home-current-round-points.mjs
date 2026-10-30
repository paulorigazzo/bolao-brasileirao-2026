import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {temporaryRankingGameState} from '../js/temporary-ranking-engine.js';

const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const scoring=app.slice(app.indexOf('function calculatePredictionPoints('),app.indexOf('function predictionResultLabel('));
const scoreStates=app.slice(app.indexOf('function isFinished('),app.indexOf('function gameStatusDisplay('));
const helpers=app.slice(app.indexOf('function homeCurrentRoundPoints('),app.indexOf('function renderHome(){'));
const context={normalizeTeamKey:s=>String(s).toLowerCase(),temporaryRankingGameState};
vm.createContext(context);vm.runInContext(scoreStates+scoring+helpers,context);
const baseGames=[
  {id_jogo:1,rodada:33,status:'encerrado',gols_casa:2,gols_fora:1},
  {id_jogo:2,rodada:33,status:'encerrado',gols_casa:0,gols_fora:0},
  {id_jogo:3,rodada:33,status:'encerrado',gols_casa:3,gols_fora:0},
  {id_jogo:4,rodada:33,status:'em_andamento',gols_casa:2,gols_fora:1},
  {id_jogo:5,rodada:33,status:'intervalo',gols_casa:2,gols_fora:0},
];
const picks=[
  {id_jogo:'1',gols_casa:2,gols_fora:1},
  {id_jogo:2,gols_casa:0,gols_fora:0},
  {id_jogo:3,gols_casa:2,gols_fora:0},
  {id_jogo:4,gols_casa:1,gols_fora:0},
  {id_jogo:5,gols_casa:1,gols_fora:0},
];
const model=(games=baseGames,own=picks)=>context.homeCurrentRoundPoints(33,games,own);
const plain=x=>JSON.parse(JSON.stringify(x));
const before=JSON.stringify({baseGames,picks});
assert.deepEqual(plain(model()),{confirmed:23,provisional:8,total:31,projected:true});
assert.equal(JSON.stringify({baseGames,picks}),before,'Não modifica placares nem palpites');
const render=games=>context.homeCurrentRoundPointsCard(model(games));
assert.match(render(baseGames),/<strong[^>]*>31<span[^>]*>Projeção/);
assert.match(render(baseGames),/23 confirmados/);assert.match(render(baseGames),/8 provisórios/);
assert.match(render(baseGames),/role="button" tabindex="0" data-home-action="stats"/);

let games=baseGames.map(g=>({...g}));
games[3].status='encerrado';
assert.deepEqual(plain(model(games)),{confirmed:28,provisional:3,total:31,projected:true});
games[4].status='encerrado';
assert.deepEqual(plain(model(games)),{confirmed:31,provisional:0,total:31,projected:false});
assert.match(render(games),/<strong>31<\/strong><small>Pontos confirmados<\/small>/);
assert.doesNotMatch(render(games),/Projeção|provisórios/);

for(const status of ['agendado','adiado','cancelado']){
  games=baseGames.map(g=>({...g,status:g.id_jogo>=4?status:g.status}));
  assert.deepEqual(plain(model(games)),{confirmed:23,provisional:0,total:23,projected:false});
}
for(const value of [null,undefined,'',' ',NaN]){
  games=baseGames.map(g=>({...g,gols_casa:g.id_jogo>=4?value:g.gols_casa}));
  assert.equal(model(games).projected,false);assert.equal(model(games).provisional,0);
}
games=[{...baseGames[3],status:'suspenso'}];
assert.equal(model(games).provisional,5,'Suspensão com placar segue a projeção existente');
games=[{...baseGames[3],gols_casa:0,gols_fora:2}];
assert.deepEqual(plain(model(games)),{confirmed:0,provisional:0,total:0,projected:true},'Zero provisório também é projeção disponível');
assert.equal(model(baseGames,picks.slice(0,3)).projected,false,'Sem palpite associado, não projeta');
assert.equal(model([],[]).total,0);assert.equal(model(baseGames,[]).projected,false);

for(const round of [32,34]){
  const extra={...baseGames[3],id_jogo:100,rodada:round,gols_casa:9,gols_fora:9};
  assert.deepEqual(plain(model([...baseGames,extra],[...picks,{id_jogo:100,gols_casa:9,gols_fora:9}])),plain(model()),'Não inclui jogos de outra rodada');
}
games=[{...baseGames[3],gols_casa:1,gols_fora:0}];
assert.equal(model(games).provisional,10,'Mudança de placar recalcula com a função existente');

console.log('Home: confirmados/provisórios, transição sem duplicidade, zero, ausência de dados, isolamento, imutabilidade e destino aprovados.');
