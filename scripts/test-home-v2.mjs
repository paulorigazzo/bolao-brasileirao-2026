import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildHomeV2Model} from '../js/home-v2.js';
const games=[{id_jogo:1,rodada:29,status:'open'},{id_jogo:2,rodada:29,status:'live'},{id_jogo:3,rodada:29,status:'finished'},{id_jogo:4,rodada:30,status:'open'}];
const inputs={round:29,games,ownPick:id=>id===3?{earned:10,gols_casa:2,gols_fora:1}:id===2?{earned:3,gols_casa:1,gols_fora:0}:null,isOpen:g=>g.status==='open',isLive:g=>g.status==='live',isScorable:g=>g.status==='finished',points:p=>p?.earned||0,livePoints:p=>p?.earned||0};
const build=extra=>buildHomeV2Model({...inputs,...extra});
assert.equal(build().phase,'pending');assert.equal(build().pending.length,1);assert.equal(build().officialPoints,10);assert.equal(build().provisionalPoints,3);assert.equal(build().exact,1);assert.equal(build().current.length,3);
assert.equal(build({ownPick:id=>({earned:id===3?10:3})}).phase,'live');
assert.equal(build({games:[games[0]],ownPick:()=>({earned:0})}).phase,'ready');
assert.equal(build({games:[games[2]]}).phase,'results');
assert.equal(build({games:[]}).phase,'interval');
assert.equal(build({games:[{...games[0],status:'postponed'}]}).phase,'interval');
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
function extract(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end<0?source.length:end);}
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{contains:()=>true},value:'',focus(){}});return nodes.get(id);}
let admin=true;
const context={CSS:{escape:x=>x},buildHomeV2Model,$:node,isAdminUser:()=>admin,show(){},closeHomeV2Picks(){},calculateRanking(){},state:{participant:{nome:'Teste'},leagueContextStatus:'ready',ranking:[{key:'me',name:'Teste',total:25}],games:games.slice(0,3),ownPicks:[]},currentRoundNumber:()=>29,ownPick:inputs.ownPick,locked:g=>g.status!=='open',isFinished:g=>g.status==='finished',isScorableGame:inputs.isScorable,gameStatusDisplay:g=>({key:g.status,label:g.status}),points:inputs.points,calculatePredictionPoints:inputs.livePoints,roundLifecycleSummary:()=>({finished:1,live:1,postponed:0,cancelled:0,status:'PARTIAL'}),pendingEarlierRounds:()=>[],isPostponed:g=>g.status==='postponed',homeRoundHighlightsContext:()=>({round:29,mode:'live'}),isCurrentRankingParticipant:p=>p.key==='me',findTeam:()=>null,activeLeagueName:()=> 'Liga de teste',teamDisplayName:x=>x||'Clube',escapeHtml:x=>String(x??''),liveMatchMinute:()=> '20',hasValidScore:()=>false,homeDeadline:()=> '20:00',formatDate:()=>'',Date,homeV2PicksRound:null};
vm.createContext(context);
for(const name of ['homeV2Model','homeV2Button','renderHomeV2','renderHomeV2Picks'])vm.runInContext(extract(name),context);
vm.runInContext('renderHomeV2()',context);
assert.match(node('homeV2Content').innerHTML,/Completar pendentes/);assert.match(node('homeV2Content').innerHTML,/pontos oficiais/);assert.match(node('homeV2Content').innerHTML,/Destaques · Rodada 29/);assert.doesNotMatch(node('homeV2Content').innerHTML,/Rodada 30/);
context.state.games=[games[0]];context.ownPick=()=>({earned:0,gols_casa:1,gols_fora:0});vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Revisar palpites/);
context.state.games=[games[1]];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Acompanhar meus palpites/);
context.state.games=[games[2]];context.ownPick=inputs.ownPick;vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Entender meus pontos/);assert.match(node('homeV2Content').innerHTML,/Você fez 10 pontos/);
context.state.games=[];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Entre rodadas/);
context.state.leagueContextStatus='idle';vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Selecionar liga/);context.state.leagueContextStatus='ready';context.state.games=games.slice(0,3);
context.homeV2PicksRound=29;context.predictionResultLabel=()=> 'Placar exato';vm.runInContext('renderHomeV2Picks()',context);assert.match(node('homeV2PicksContent').innerHTML,/10 pts oficiais/);assert.match(node('homeV2PicksContent').innerHTML,/3 pts provisórios/);context.homeV2PicksRound=null;
admin=false;vm.runInContext('renderHomeV2()',context);assert.equal(node('homeV2Content').innerHTML,'');
for(const name of ['navigateTo','applyNavigationState'])assert.match(extract(name),/tabName==="homeV2"&&!isAdminUser\(\)/);
// A Home vigente conserva o corpo anterior, com apenas o gancho de atualização experimental.
const {createHash}=await import('node:crypto');
const current=source.slice(source.indexOf('function renderHome(){'),source.indexOf('\nlet homeV2PicksRound='));
const preserved=current.replace('  if(!$("homeV2Tab")?.classList.contains("hidden")) renderHomeV2();\n','').trim();
assert.equal(createHash('sha256').update(preserved).digest('hex'),'526ec08dba8f425bc8fa4d24e1a5c96788671097a9f4bea9d609f0a6b8e5314f','Home vigente preservada');
console.log('Home 2.0: estados, pontos, isolamento, Destaques e Home original aprovados.');

if(process.argv[2]){
  admin=true;vm.runInContext('renderHomeV2()',context);
  const {writeFileSync}=await import('node:fs');
  writeFileSync(process.argv[2], '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="http://localhost:8892/css/design-system.css"><link rel="stylesheet" href="http://localhost:8892/css/styles.css"><link rel="stylesheet" href="http://localhost:8892/css/components.css"><link rel="stylesheet" href="http://localhost:8892/css/identity-premium.css"><link rel="stylesheet" href="http://localhost:8892/css/home-v2.css"><body><main style="max-width:1100px;margin:auto;padding:16px"><section class="home-v2"><header class="v2-heading"><div><span class="eyebrow">DADOS SINTÉTICOS · VALIDAÇÃO LOCAL</span><h2>Home 2.0</h2></div><button class="secondary">Voltar à ADM</button></header><div class="v2-grid">'+node('homeV2Content').innerHTML+'</div></section></main></body></html>');
}
