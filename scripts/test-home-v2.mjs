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
const oldLive={id_jogo:9,rodada:21,status:'live'};
const futureLive={id_jogo:10,rodada:30,status:'live'};
const crossRound=build({games:[games[1],oldLive,futureLive],ownPick:id=>({earned:id===9?7:3})});
assert.equal(crossRound.live.length,1);assert.equal(crossRound.displayedLive.length,2);assert.equal(crossRound.provisionalPoints,3);assert.equal(crossRound.displayedProvisionalPoints,10);
assert.equal(build({games:[oldLive]}).phase,'live');
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
function extract(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end<0?source.length:end);}
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{contains:()=>true},value:'',focus(){}});return nodes.get(id);}
let admin=true;
const context={publicPicksRefreshPending:false,buildRoundHighlights:()=>({facts:{personal:[{key:"personal-round-performance",title:"Você fez 10 pontos na rodada",detail:"Resumo dos resultados oficiais."},{key:"new-personal-best",title:"Sua melhor rodada até agora",detail:"Novo recorde pessoal: 10 pontos."}],group:[]},isProvisional:false}),teamNamesDisplayText:x=>x,provisionalRoundHighlightFact:x=>x,normalizeTeamKey:x=>String(x||"").toLowerCase(),CSS:{escape:x=>x},buildHomeV2Model,$:node,isAdminUser:()=>admin,show(){},closeHomeV2Picks(){},calculateRanking(){},state:{participant:{nome:'Teste'},leagueContextStatus:'ready',ranking:[{key:'me',name:'Teste',total:25}],games:games.slice(0,3),ownPicks:[]},currentRoundNumber:()=>29,ownPick:inputs.ownPick,locked:g=>g.status!=='open',isFinished:g=>g.status==='finished',isScorableGame:inputs.isScorable,gameStatusDisplay:g=>({key:g.status,label:g.status}),points:inputs.points,calculatePredictionPoints:inputs.livePoints,roundLifecycleSummary:()=>({finished:1,live:1,postponed:0,cancelled:0,status:'PARTIAL'}),pendingEarlierRounds:()=>[],isPostponed:g=>g.status==='postponed',homeRoundHighlightsContext:()=>({round:29,mode:'live'}),isCurrentRankingParticipant:p=>p.key==='me',findTeam:()=>null,activeLeagueName:()=> 'Liga de teste',teamDisplayName:x=>x||'Clube',escapeHtml:x=>String(x??''),rankingAvatar:()=>'<span class="ranking-avatar">T</span>',teamLogo:()=>'<span>⚽</span>',deadlineText:()=>"Fecha em 45 min",liveMatchMinute:()=> '20',hasValidScore:()=>false,homeDeadline:()=> '20:00',formatDate:()=>'',Date,homeV2PicksRound:null};
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
context.state.games=[oldLive];context.ownPick=()=>({earned:3,gols_casa:2,gols_fora:0});vm.runInContext('renderHomeV2()',context);
assert.match(node('homeV2Content').innerHTML,/RODADA 21 · REAGENDADA/);assert.match(node('homeV2Content').innerHTML,/data-v2-action="live-picks"/);
context.state.games=[games[1],{...games[1],id_jogo:8},oldLive,futureLive];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/\+1 jogo em andamento/);assert.doesNotMatch(node('homeV2Content').innerHTML,/Rodada 30/);
context.homeV2PicksRound='live';vm.runInContext('renderHomeV2Picks()',context);assert.match(node('homeV2PicksContent').innerHTML,/9 pontos provisórios/);assert.match(node('homeV2PicksContent').innerHTML,/Rodada 21/);assert.doesNotMatch(node('homeV2PicksContent').innerHTML,/Rodada 30/);context.homeV2PicksRound=null;context.state.games=games.slice(0,3);context.ownPick=inputs.ownPick;
assert.match(node('homeV2Content').innerHTML,/1º de 1 participante/);
context.findTeam=()=>({name:'Corinthians',logo:''});context.favoriteTeamStandingsRow=()=>({position:8,points:42});
context.favoriteTeamGames=()=>[{id_jogo:11,rodada:30,status:'open',inicio:'2099-10-11T21:30:00Z',time_casa:'Corinthians',time_fora:'Santos'}];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Próximo: Santos · em casa/);
context.favoriteTeamGames=()=>[{id_jogo:11,rodada:30,status:'open',inicio:'2099-10-11T21:30:00Z',time_casa:'Santos',time_fora:'Corinthians'}];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/Próximo: Santos · fora/);context.findTeam=()=>null;
context.state.ranking=[{key:'first',name:'Líder',total:30},{key:'me',name:'Teste',total:25},{key:'last',name:'Próximo',total:23}];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/2º de 3 participantes/);assert.match(node('homeV2Content').innerHTML,/5 pts do líder · 2 pts à frente do próximo/);assert.match(node('homeV2Content').innerHTML,/Sua melhor rodada até agora/);
admin=false;vm.runInContext('renderHomeV2()',context);assert.equal(node('homeV2Content').innerHTML,'');
for(const name of ['navigateTo','applyNavigationState'])assert.match(extract(name),/tabName==="homeV2"&&!isAdminUser\(\)/);
// Referência da Home aprovada na v6.46.1; inclui a revisão visual da Visão Geral.
const {createHash}=await import('node:crypto');
const current=source.slice(source.indexOf('function renderHome(){'),source.indexOf('\nlet homeV2PicksRound='));
const preserved=current.replace('  if(!$("homeV2Tab")?.classList.contains("hidden")) renderHomeV2();\n','').trim();
assert.equal(createHash('sha256').update(preserved).digest('hex'),'3bf4d9a84071d26eb8c3c257b65c8957c3957b08a32d34b107c14d6bf3248828','Home vigente preservada');
console.log('Home 2.0: estados, pontos, isolamento, Destaques e Home original aprovados.');

if(process.argv[2]){
  admin=true;
  const crest=id=>'http://localhost:8892/assets/clubs/api-football/'+id+'.png';
  context.state.participant={nome:'Paulo',time_favorito:'Corinthians'};
  context.state.ranking=[{key:'camilo',name:'Camilo',total:220},{key:'me',name:'Paulo',total:217},{key:'gustavo',name:'Gustavo',total:215}];
  context.rankingAvatar=p=>'<span class="ranking-avatar">'+p.name[0]+'</span>';
  context.findTeam=()=>({name:'Corinthians',logo:crest(131)});
  context.favoriteTeamStandingsRow=()=>({position:8,points:42});
  context.teamLogo=(url,name)=>'<img src="'+url+'" alt="'+name+'">';
  context.state.games=[{id_jogo:1,rodada:29,status:'open',time_casa:'Corinthians',time_fora:'Santos',time_casa_logo:crest(131),time_fora_logo:crest(128),inicio:'2026-10-11T21:30:00Z'},{id_jogo:2,rodada:29,status:'open',time_casa:'Flamengo',time_fora:'Bahia',time_casa_logo:crest(127),time_fora_logo:crest(118),inicio:'2026-10-11T23:30:00Z'}];
  context.favoriteTeamGames=()=>context.state.games.slice(0,1);
  context.roundLifecycleSummary=gs=>({finished:gs.filter(g=>g.status==='finished').length,live:gs.filter(g=>g.status==='live').length,postponed:0,cancelled:0,status:gs.every(g=>g.status==='finished')?'FINISHED':'PARTIAL'});
  context.buildRoundHighlights=()=>({facts:{personal:[{key:'unique-exact:1',title:'Só você acertou Corinthians × Santos',detail:'Placar exato de 2 × 1 nos resultados desta rodada.'}],group:[]},isProvisional:false});
  context.formatDate=()=> 'hoje, 18h30';context.ownPick=()=>null;
  if(process.argv[3]==='live'){context.state.games.push({...context.state.games[0],id_jogo:9,rodada:21});context.state.games.forEach(g=>{g.status='live';g.gols_casa=1;g.gols_fora=0;});context.ownPick=()=>({earned:3,gols_casa:2,gols_fora:0});context.hasValidScore=()=>true;}
  if(process.argv[3]==='results'){context.state.games.forEach(g=>{g.status='finished';g.gols_casa=2;g.gols_fora=1;});context.ownPick=()=>({earned:10,gols_casa:2,gols_fora:1});context.hasValidScore=()=>true;context.roundLifecycleSummary=()=>({finished:2,live:0,postponed:0,cancelled:0,status:'FINISHED'});}
  vm.runInContext('renderHomeV2()',context);
  const {writeFileSync}=await import('node:fs');
  writeFileSync(process.argv[2], '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="http://localhost:8892/css/design-system.css"><link rel="stylesheet" href="http://localhost:8892/css/styles.css"><link rel="stylesheet" href="http://localhost:8892/css/components.css"><link rel="stylesheet" href="http://localhost:8892/css/identity-premium.css"><link rel="stylesheet" href="http://localhost:8892/css/home-v2.css"><body><main style="max-width:1100px;margin:auto;padding:16px"><section class="home-v2"><header class="v2-heading"><div><span class="eyebrow">DADOS SINTÉTICOS · VALIDAÇÃO LOCAL</span><h2>Home 2.0</h2></div><button class="secondary">Voltar à ADM</button></header><div class="v2-grid">'+node('homeV2Content').innerHTML+'</div></section></main></body></html>');
}
