import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('js/app.js','utf8').replaceAll('\r\n','\n');
function extract(name){const start=source.indexOf('function '+name+'(');const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end);}
const team={name:'Corinthians',key:'corinthians',logo:'./assets/clubs/api-football/131.png'};
const games=Array.from({length:5},(_,i)=>({id_jogo:i+1,rodada:25+i,status:'finished',time_casa:'Corinthians',time_fora:'Santos',gols_casa:2,gols_fora:1,inicio:'2026-10-01T21:30:00Z'}));games.push({id_jogo:6,rodada:30,status:'open',time_casa:'Corinthians',time_fora:'Santos',inicio:'2099-10-11T21:30:00Z',local:'Arena'});
const picks=[[2,1],[2,0],[3,2],[0,2],[2,1]].map(([gols_casa,gols_fora],i)=>({id_jogo:i+1,gols_casa,gols_fora}));
const host={innerHTML:''};
const context={state:{participant:{nome:'Paulo',time_favorito:'Corinthians'},standings:{},games,ownPicks:picks},$:()=>host,findTeam:()=>team,favoriteTeamGames:()=>games,isScorableGame:g=>g?.status==='finished',hasValidScore:g=>g&&g.gols_casa!=null&&g.gols_fora!=null,normalizeTeamKey:s=>String(s||'').toLowerCase(),teamDisplayName:s=>s,escapeHtml:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),initials:s=>s.slice(0,2),favoriteTeamStandingsRow:()=>({position:8,points:42,playedGames:29,won:11,draw:9,lost:9,goalDifference:5}),favoriteTeamResult:()=> 'V',favoriteTeamPositionHistory:(_t,rounds)=>rounds.map((round,i)=>({round,position:12-i})),isFinished:g=>g.status==='finished',Date};
vm.createContext(context);
for(const f of ['calculatePredictionPoints','points','favoriteTeamPredictionStats','renderFavoriteTeamPredictionCard','renderHomeFavoriteTeam'])vm.runInContext(extract(f),context);
vm.runInContext('renderHomeFavoriteTeam()',context);
const populated=host.innerHTML;
assert.equal((populated.match(/<article\b/g)||[]).length,1);
for(const text of ['pontos do clube','seus pontos','placares exatos','56%','Em 5 jogos com seu palpite','4 palpites pontuaram','42','28','Arena','Santos','Posição na tabela','Ver Meu Time','data-home-action="standings-favorite"','data-expand-favorite="true"','data-home-action="campaign"','data-home-action="games"'])assert.ok(populated.includes(text),text);
assert.equal((populated.match(/favorite-history-item /g)||[]).length,5);
context.state.ownPicks=[];vm.runInContext('renderHomeFavoriteTeam()',context);assert.match(host.innerHTML,/Seu desempenho aparecerá/);assert.doesNotMatch(host.innerHTML,/role="progressbar"/);
const noPicks=host.innerHTML;
context.findTeam=()=>null;vm.runInContext('renderHomeFavoriteTeam()',context);assert.equal((host.innerHTML.match(/<article\b/g)||[]).length,1);assert.match(host.innerHTML,/data-home-action="profile"/);assert.doesNotMatch(host.innerHTML,/Seus palpites com o clube/);
console.log('Favorito: card único, dados preservados, cálculos originais, ações e estados vazios aprovados.');
if(process.argv[2]){
 fs.writeFileSync(process.argv[2],'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./css/design-system.css"><link rel="stylesheet" href="./css/styles.css"><link rel="stylesheet" href="./css/components.css"><link rel="stylesheet" href="./css/identity-premium.css"><link rel="stylesheet" href="./css/fan-theme.css"><body><main class="home-tab" style="max-width:680px;margin:24px auto;padding:16px"><small style="color:var(--muted)">DADOS SINTÉTICOS · VALIDAÇÃO LOCAL</small><section id="homeFavoriteTeamSection">'+(process.argv[3]==='empty'?host.innerHTML:process.argv[3]==='no-picks'?noPicks:populated)+'</section></main></body></html>');
}
// A seleção usa apenas o clube visível e não fecha um card já aberto.
let expanded=false,clicked=0,scrolled=0;
const summary={getAttribute:()=>String(expanded),click:()=>{expanded=true;clicked++;}};
const mobile={dataset:{teamKey:'corinthians'},getClientRects:()=>[{}],matches:()=>true,querySelector:()=>summary,classList:{add(){},remove(){}},scrollIntoView(){scrolled++;}};
const hidden={dataset:{teamKey:'corinthians'},getClientRects:()=>[],matches:()=>false,classList:{add(){throw Error('Linha oculta selecionada');}}};
context.document={querySelectorAll:()=>[hidden,mobile]};context.setTimeout=()=>{};
vm.runInContext(extract('focusFavoriteTeamInStandings'),context);
vm.runInContext('focusFavoriteTeamInStandings(0,true)',context);
vm.runInContext('focusFavoriteTeamInStandings(0,true)',context);
assert.equal(clicked,1);assert.equal(scrolled,2);
console.log('Classificação: favorito visível selecionado e expansão idempotente aprovados.');
