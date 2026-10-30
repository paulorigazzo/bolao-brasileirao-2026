import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildHomeV2Model,buildHomeV2PersonalContext,buildHomeV2LeagueHighlights,buildHomeV2RoundLeader,buildHomeV2RoundRecord} from '../js/home-v2.js';
import {buildRoundLiveHighlightsModel} from '../js/round-live-highlights-engine.js';
import {buildFriendlyRankingsModel} from '../js/friendly-rankings-engine.js';
import {buildRoundHighlightsModel} from '../js/round-highlights-engine.js';
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
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{contains:()=>true},value:'',addEventListener(){},focus(){}});return nodes.get(id);}
let admin=true;
const context={publicPicksRefreshPending:false,roundHighlightsLoader:{peek:()=>null},roundHighlightsKey:()=>'test',roundHighlightsAvailable:()=>false,buildRoundLiveHighlightsModel,buildHomeV2RoundLeader,buildHomeV2PersonalContext,buildHomeV2LeagueHighlights,buildFriendlyRankingsModel,buildRoundHighlights:()=>({facts:{personal:[{key:"personal-round-performance",title:"Você fez 10 pontos na rodada",detail:"Resumo dos resultados oficiais."},{key:"new-personal-best",title:"Sua melhor rodada até agora",detail:"Novo recorde pessoal: 10 pontos."}],group:[]},isProvisional:false}),teamNamesDisplayText:x=>x,provisionalRoundHighlightFact:x=>x,normalizeTeamKey:x=>String(x||"").toLowerCase(),CSS:{escape:x=>x},buildHomeV2Model,$:node,isAdminUser:()=>admin,show(){},closeHomeV2Picks(){},calculateRanking(){},state:{participant:{nome:'Teste'},leagueContextStatus:'ready',ranking:[{key:'me',name:'Teste',total:25}],games:games.slice(0,3),ownPicks:[]},currentRoundNumber:()=>29,ownPick:inputs.ownPick,locked:g=>g.status!=='open',isFinished:g=>g.status==='finished',isScorableGame:inputs.isScorable,gameStatusDisplay:g=>({key:g.status,label:g.status}),points:inputs.points,calculatePredictionPoints:inputs.livePoints,roundLifecycleSummary:()=>({finished:1,live:1,postponed:0,cancelled:0,status:'PARTIAL'}),pendingEarlierRounds:()=>[],isPostponed:g=>g.status==='postponed',homeRoundHighlightsContext:()=>({round:29,mode:'live'}),isCurrentRankingParticipant:p=>p.key==='me',findTeam:()=>null,activeLeagueName:()=> 'Liga de teste',teamDisplayName:x=>x||'Clube',escapeHtml:x=>String(x??''),rankingAvatar:()=>'<span class="ranking-avatar">T</span>',teamLogo:()=>'<span>⚽</span>',deadlineText:()=>"Fecha em 45 min",liveMatchMinute:()=> '20',hasValidScore:()=>false,homeDeadline:()=> '20:00',formatDate:()=>'',Date,homeV2PicksRound:null};
vm.createContext(context);
for(const name of ['homeV2Model','homeV2Button','homeV2Help','homeV2FriendlyRankings','homeV2LeagueMetricContent','homeV2LeagueMetric','homeV2LeagueHighlights','homeRoundHighlightsAccess','renderHomeV2RoundLeader','renderHomeV2','renderHomeV2Picks'])vm.runInContext(extract(name),context);
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
context.state.ranking=[{key:'first',name:'Líder',total:30},{key:'me',name:'Teste',total:25},{key:'last',name:'Próximo',total:23}];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/2º de 3 participantes/);assert.match(node('homeV2Content').innerHTML,/5 pts do líder · 2 pts à frente do próximo/);assert.doesNotMatch(node('homeV2Content').innerHTML,/Sua melhor rodada até agora/);
// Contexto pessoal deriva dos Destaques e Disputas reais, sem recriar suas regras.
const members=[{user_id:'me',nome:'Teste'},{user_id:'other',nome:'Outro'}];
const history=Array.from({length:30},(_,i)=>({id_jogo:i+1,rodada:Math.floor(i/10)+1,status:'finished',gols_casa:2,gols_fora:1}));
const personalPicks=history.map(g=>({user_id:'me',usuario:'Teste',id_jogo:g.id_jogo,score:(g.id_jogo-1)%10<g.rodada+1?10:0}));
const deps={isScorableGame:g=>g.status==='finished',gameStatusDisplay:g=>({key:g.status}),pointsForPick:p=>p.score};
const highlights=(round=3,picks=personalPicks,gs=history)=>buildRoundHighlightsModel({round,games:gs,picks,participants:members,selectedParticipantId:'me',...deps});
const friendly=(picks=personalPicks,participants=members)=>buildFriendlyRankingsModel({games:history,picks,participants,currentParticipant:members[0],...deps});
let personal=buildHomeV2PersonalContext({highlights:highlights(),friendlyRankings:friendly()});
assert.equal(personal.comparison.average,25);assert.match(personal.comparison.detail,/acima/);assert.equal(personal.record.key,'new-personal-best');assert.equal(personal.parallel.view,'hot');
const changedRound=score=>personalPicks.map(p=>p.id_jogo>20?{...p,score:p.id_jogo===21?score:0}:p);
assert.match(buildHomeV2PersonalContext({highlights:highlights(3,changedRound(10))}).comparison.detail,/abaixo/);
assert.match(buildHomeV2PersonalContext({highlights:highlights(3,changedRound(25))}).comparison.detail,/próximo/);
assert.equal(buildHomeV2PersonalContext({highlights:highlights(3,changedRound(30))}).record.key,'matched-personal-best');
assert.equal(buildHomeV2PersonalContext({highlights:highlights(1)}).comparison,null);
assert.equal(buildHomeV2PersonalContext({highlights:highlights(1)}).record,null);
for(const status of ['postponed','future','live','cancelled']){
  const incomplete=history.map(g=>g.id_jogo===30?{...g,status}:g);
  const partial=buildHomeV2PersonalContext({highlights:highlights(3,personalPicks,incomplete)});
  assert.equal(partial.comparison,null,status);assert.equal(partial.record,null,status);
}
assert.equal(buildHomeV2PersonalContext({highlights:highlights(3,personalPicks,history.filter(g=>g.id_jogo!==30))}).record,null);
assert.equal(buildHomeV2PersonalContext({friendlyRankings:friendly(personalPicks.filter(p=>p.id_jogo<=20))}).parallel.view,'efficiency');
assert.equal(buildHomeV2PersonalContext({friendlyRankings:friendly([])}).parallel.position,null);
assert.equal(buildHomeV2PersonalContext({friendlyRankings:friendly([],[members[1]])}).parallel.position,null,'recordes não atravessam ligas');
const savedHighlights=context.buildRoundHighlights;
context.buildRoundHighlights=()=>({...highlights(),round:29});context.state.participants=members;context.state.publicPicks=personalPicks;context.state.participant={nome:'Teste',user_id:'me'};
context.state.games=[games[2]];context.roundLifecycleSummary=()=>({finished:10,live:0,postponed:0,cancelled:0,status:'FINISHED'});
vm.runInContext('renderHomeV2()',context);
assert.match(node('homeV2Content').innerHTML,/Sua média anterior: 25 pontos por rodada/);
assert.match(node('homeV2Content').innerHTML,/Nova melhor rodada pessoal/);
assert.equal((node('homeV2Content').innerHTML.match(/Nova melhor rodada pessoal/g)||[]).length,1);
assert.match(node('homeV2Content').innerHTML,/data-v2-action="records"/);
assert.match(node('homeV2Content').innerHTML,/href="\/central\/#pontuacao"/);
assert.match(node('homeV2Content').innerHTML,/href="\/central\/#disputas"/);
assert.match(node('homeV2Content').innerHTML,/Dúvidas\? Explore a Central/);
context.publicPicksRefreshPending=true;vm.runInContext('renderHomeV2()',context);
assert.doesNotMatch(node('homeV2Content').innerHTML,/Sua média anterior|Nova melhor rodada/);
assert.match(node('homeV2Content').innerHTML,/Conheça as Disputas Paralelas/);
context.publicPicksRefreshPending=false;context.buildRoundHighlights=savedHighlights;
// Exercita os novos acessos pelo listener real e sua reconstrução do contexto da liga.
let clickHome;node('homeV2Content').addEventListener=(_,handler)=>{clickHome=handler;};
let opened=null;context.openFriendlyRankings=trigger=>{opened=trigger;context.friendlyRankingsView='efficiency';};context.renderFriendlyRankingsModal=()=>{};
context.friendlyRankingsModel=null;context.friendlyRankingsView='efficiency';
const listenerStart=source.indexOf('$("homeV2Content")?.addEventListener("click"');
vm.runInContext(source.slice(listenerStart,source.indexOf('\nfunction participantTeam(',listenerStart)),context);
const recordButton={dataset:{v2Action:'records'}};
await clickHome({target:{closest:()=>recordButton}});assert.equal(opened,recordButton);assert.equal(context.friendlyRankingsView,'records');
context.openRoundHighlights=(round,trigger)=>{opened={round,trigger};};
const roundButton={dataset:{v2Action:'highlights',round:'29'}};
await clickHome({target:{closest:()=>roundButton}});assert.equal(opened.round,29);assert.equal(opened.trigger,roundButton);
await clickHome({target:{closest:()=>({dataset:{v2Action:'parallel',view:'hot'}})}});assert.equal(context.friendlyRankingsView,'hot');
context.state.publicPicks=[];await clickHome({target:{closest:()=>({dataset:{v2Action:'parallel',view:'efficiency'}})}});assert.equal(context.friendlyRankingsView,'efficiency');assert.equal(context.friendlyRankingsModel.hot.ranking.length,0);
context.state.games=[games[0]];context.ownPick=()=>null;vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/href="\/central\/#palpites"/);
context.state.games=[games[1]];vm.runInContext('renderHomeV2()',context);assert.match(node('homeV2Content').innerHTML,/href="\/central\/#ranking"/);

// Badges apresentam o modelo canônico, incluindo empates reais (sem comparar médias arredondadas).
assert.deepEqual(buildHomeV2LeagueHighlights(),[]);
const tiedPicks=members.flatMap(member=>history.map(game=>({user_id:member.user_id,usuario:member.nome,id_jogo:game.id_jogo,score:10})));
const tied=buildFriendlyRankingsModel({games:history,picks:tiedPicks,participants:members,currentParticipant:members[0],...deps});
const badges=buildHomeV2LeagueHighlights(tied);
assert.deepEqual(badges.map(card=>card.view),['efficiency','hot']);
assert.equal(badges[0].value,'10,00');assert.equal(badges[0].leaders.length,1);
assert.equal(badges[0].leaders[0].detail,'30 palpites avaliados');
assert.equal(badges[1].leaders[0].detail,'Rodadas 1, 2, 3');
assert.equal(buildHomeV2LeagueHighlights({efficiency:{ranking:[]},hot:tied.hot}).length,1);
assert.equal(buildHomeV2LeagueHighlights(friendly(personalPicks.slice(0,19))).some(card=>card.view==='efficiency'||card.view==='hot'),false);
const savedPoints=context.points;
context.state.games=history;context.state.publicPicks=tiedPicks;context.state.participants=members;context.points=p=>p?.score??p?.earned??0;
context.state.participant=members[1];context.state.activeLeague={liga_id:'a'};
vm.runInContext('renderHomeV2()',context);
let badgeHtml=node('homeV2Content').innerHTML;
assert.equal((badgeHtml.match(/class="premium-feature-card v2-league-metric/g)||[]).length,2);
assert.match(badgeHtml,/v2-metric-you/);
assert.ok(badgeHtml.indexOf('v2-dispute')<badgeHtml.indexOf('v2-league-highlights'));
assert.ok(badgeHtml.indexOf('v2-league-highlights')<badgeHtml.indexOf('v2-favorite'));
for(const view of ['efficiency','hot','records']){
  await clickHome({target:{closest:()=>({dataset:{v2Action:view==='records'?'records':'parallel',view}})}});
  assert.equal(context.friendlyRankingsView,view);
}
context.publicPicksRefreshPending=true;vm.runInContext('renderHomeV2()',context);
assert.doesNotMatch(node('homeV2Content').innerHTML,/class="premium-feature-card v2-league-metric/);
context.publicPicksRefreshPending=false;
context.state.activeLeague={liga_id:'b'};context.state.participants=[];context.state.publicPicks=[];vm.runInContext('renderHomeV2()',context);
assert.doesNotMatch(node('homeV2Content').innerHTML,/class="premium-feature-card v2-league-metric/,'troca de liga não conserva badges antigos');
context.state.participants=members;context.state.publicPicks=tiedPicks;context.points=savedPoints;

// Líder provisório usa exclusivamente o agregado autorizado e a rodada atual.
const leaderPayload={leagueId:'a',round:29,lifecycle:{complete:false,finished:2,total:10,live:1,liveWithScore:1,suspendedWithScore:0},ranking:[
  {user_id:'me',nome:'Teste',position:1,confirmed:20,provisional:8,total:28,exact:2,officialPosition:1,projectedPosition:1,gap:0},
  {user_id:'other',nome:'Outro',position:2,confirmed:20,provisional:8,total:28,exact:1,officialPosition:2,projectedPosition:2,gap:0}
]};
const leaderModel=buildRoundLiveHighlightsModel(leaderPayload,'me');
let leaderCard=buildHomeV2RoundLeader(leaderModel,29,'me');
assert.equal(leaderCard.value,'28');assert.equal(leaderCard.shared,true);assert.equal(leaderCard.leaders.length,2);assert.equal(leaderCard.leaders[0].isCurrent,true);
assert.equal(leaderCard.status,'Ao vivo · Provisório');assert.equal(leaderCard.action,'highlights');assert.equal(leaderCard.round,29);
assert.equal(buildHomeV2RoundLeader(leaderModel,30,'me'),null);
assert.equal(buildHomeV2RoundLeader(null,29,'me'),null);
assert.equal(buildHomeV2RoundLeader({...leaderModel,hasResults:false},29,'me'),null);
assert.equal(buildHomeV2RoundLeader({...leaderModel,ranking:[{...leaderModel.ranking[0],total:0}]},29,'me'),null);
assert.equal(buildHomeV2RoundLeader({...leaderModel,isProvisional:false},29,'me').status,'Resultado final');
assert.equal(buildHomeV2RoundLeader({...leaderModel,projected:false},29,'me').status,'Provisório');

const leaderSlot={innerHTML:'',querySelector(){return this.button||null;}};
const leaderSection={classList:{toggle(_name,value){this.hidden=value;}},querySelector:()=>leaderSlot.innerHTML||leaderSlot.button||null};
const leaderTab={classList:{contains:()=>false}};
const leaderContext={publicPicksRefreshPending:false,buildHomeV2RoundRecord,homeV2FriendlyRankings:()=>null,isScorableGame:()=>false,gameStatusDisplay:()=>({key:'scheduled'}),hasValidScore:()=>false,$:id=>({homeV2RoundLeaderSlot:leaderSlot,homeV2LeagueHighlightsSection:leaderSection,homeV2Tab:leaderTab}[id]),isAdminUser:()=>true,state:{games:[],user:{id:'me'},activeLeague:{liga_id:'a'},leagueContextStatus:'ready'},currentRoundNumber:()=>29,buildHomeV2RoundLeader,buildRoundLiveHighlightsModel,escapeHtml:context.escapeHtml};
vm.createContext(leaderContext);
for(const name of ['homeV2LeagueMetricContent','homeV2LeagueMetric','renderHomeV2RoundLeader'])vm.runInContext(extract(name),leaderContext);
leaderContext.entry={data:leaderPayload};vm.runInContext('renderHomeV2RoundLeader(entry,29)',leaderContext);
assert.match(leaderSlot.innerHTML,/data-v2-action="highlights"/);assert.match(leaderSlot.innerHTML,/data-round="29"/);assert.match(leaderSlot.innerHTML,/Ao vivo · Provisório/);
leaderSlot.button={innerHTML:'old',dataset:{view:'round-leader'}};const stableButton=leaderSlot.button;
vm.runInContext('renderHomeV2RoundLeader(entry,29)',leaderContext);assert.equal(leaderSlot.button,stableButton,'atualização mantém o botão para retorno de foco');
leaderContext.entry={data:{...leaderPayload,leagueId:'b'}};vm.runInContext('renderHomeV2RoundLeader(entry,29)',leaderContext);assert.equal(leaderSlot.innerHTML,'');
leaderContext.entry={data:leaderPayload,error:true};vm.runInContext('renderHomeV2RoundLeader(entry,29)',leaderContext);assert.equal(leaderSlot.innerHTML,'');
leaderContext.entry={data:{...leaderPayload,round:28}};vm.runInContext('renderHomeV2RoundLeader(entry,29)',leaderContext);assert.equal(leaderSlot.innerHTML,'');

// A consulta compartilhada só ganha a rodada atual enquanto a Home 2.0 está visível.
let roundLoads=0,roundRenders=0,releaseRound,delayRound=false,hiddenV2=false;
const refreshContext={document:{hidden:false},$:id=>id==='homeV2Tab'?{classList:{contains:()=>hiddenV2}}:null,isAdminUser:()=>true,state:{user:{id:'me'},activeLeague:{liga_id:'a'},leagueContextStatus:'ready'},currentRoundNumber:()=>29,roundHighlightsAvailable:()=>true,roundHighlightsSelection:null,roundHighlightsSession:0,roundHighlightsKey:()=>refreshContext.state.activeLeague.liga_id,roundHighlightsLoader:{load:async()=>{roundLoads++;if(delayRound)return new Promise(resolve=>{releaseRound=resolve;});return {data:leaderPayload};}},renderHomeV2RoundLeader:()=>{roundRenders++;}};
vm.createContext(refreshContext);
const refreshStart=source.indexOf('async function refreshRoundHighlightsViews(');
vm.runInContext(source.slice(refreshStart,source.indexOf('\nfunction roundHighlightsPicks(',refreshStart)),refreshContext);
await vm.runInContext('refreshRoundHighlightsViews()',refreshContext);assert.equal(roundLoads,1);assert.equal(roundRenders,1);
hiddenV2=true;await vm.runInContext('refreshRoundHighlightsViews()',refreshContext);assert.equal(roundLoads,1,'Home 2.0 oculta não adiciona consulta');
hiddenV2=false;delayRound=true;const lateRound=vm.runInContext('refreshRoundHighlightsViews()',refreshContext);refreshContext.state.activeLeague={liga_id:'b'};releaseRound({data:leaderPayload});await lateRound;assert.equal(roundRenders,1,'resposta atrasada de outra liga é descartada');

// A Home pública reutiliza os cards, sem depender da condição administrativa.
node('homeLeagueHighlights').addEventListener=(_,handler)=>{context.clickLeague=handler;};
vm.runInContext(extract('renderHomeLeagueHighlights'),context);
admin=false;context.state.leagueContextStatus='ready';
context.state.games=history;context.state.publicPicks=tiedPicks;context.state.participants=members;context.points=p=>p?.score??0;
vm.runInContext('renderHomeLeagueHighlights()',context);
assert.match(node('homeLeagueHighlights').innerHTML,/id="homeLeagueHighlightsSection"/);
assert.match(node('homeLeagueHighlights').innerHTML,/id="homeRoundLeaderSlot"/);
assert.doesNotMatch(node('homeLeagueHighlights').innerHTML,/id="homeV2/);
assert.match(node('homeLeagueHighlights').innerHTML,/Quem joga, resolve/);
context.clickLeague({target:{closest:()=>({dataset:{v2Action:'parallel',view:'hot'}})}});assert.equal(context.friendlyRankingsView,'hot');
context.clickLeague({target:{closest:()=>roundButton}});assert.equal(opened.round,29);
context.publicPicksRefreshPending=true;vm.runInContext('renderHomeLeagueHighlights()',context);
assert.doesNotMatch(node('homeLeagueHighlights').innerHTML,/class="premium-feature-card v2-league-metric/);
context.publicPicksRefreshPending=false;context.state.leagueContextStatus='loading';vm.runInContext('renderHomeLeagueHighlights()',context);assert.equal(node('homeLeagueHighlights').innerHTML,'');
context.state.leagueContextStatus='ready';
context.roundHighlightsAvailable=round=>round===28;
context.highlightsContext={round:28,mode:'recent'};
vm.runInContext('renderHomeLeagueHighlights(highlightsContext)',context);
assert.match(node('homeRoundHighlightsAccess').innerHTML,/data-round-highlights-round="28"/);
assert.doesNotMatch(node('homeLeagueHighlights').innerHTML,/data-round-highlights-round=/);
assert.doesNotMatch(vm.runInContext('homeV2LeagueHighlights([],"home",homeRoundHighlightsAccess(highlightsContext))',context),/class="v2-league-highlights hidden"/,'acesso disponível mantém a seção mesmo sem cards');
assert.equal(vm.runInContext('homeRoundHighlightsAccess(null)',context),'');
assert.equal(vm.runInContext('homeRoundHighlightsAccess({round:30})',context),'');
context.roundHighlightsAvailable=()=>false;
assert.doesNotMatch(source,/homeRoundLiveFacts|homeRoundHighlightsHtml/);
const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(markup.indexOf('id="homePreviousRound"')<markup.indexOf('id="homeRoundHighlightsAccess"'));
assert.ok(markup.indexOf('id="homeRoundHighlightsAccess"')<markup.indexOf('id="homeLeagueHighlights"'));
assert.ok(markup.indexOf('id="homeOverview"')<markup.indexOf('id="homeLeagueHighlights"'));
assert.ok(markup.indexOf('id="homeLeagueHighlights"')<markup.indexOf('id="homeLiveSection"'));
leaderContext.$=id=>({homeRoundLeaderSlot:leaderSlot,homeLeagueHighlightsSection:leaderSection,homeTab:leaderTab}[id]);
leaderContext.isAdminUser=()=>false;leaderContext.entry={data:leaderPayload};leaderSlot.button=null;
vm.runInContext('renderHomeV2RoundLeader(entry,29,"home")',leaderContext);assert.match(leaderSlot.innerHTML,/Ao vivo · Provisório/);

admin=false;vm.runInContext('renderHomeV2()',context);assert.equal(node('homeV2Content').innerHTML,'');
for(const name of ['navigateTo','applyNavigationState'])assert.match(extract(name),/tabName==="homeV2"&&!isAdminUser\(\)/);
// Referência v6.51.2: retira apenas o bloco antigo de Destaques da rodada.
const {createHash}=await import('node:crypto');
const current=source.slice(source.indexOf('function renderHome(){'),source.indexOf('\nlet homeV2PicksRound='));
// v6.58.0: normalize somente as duas substituições aprovadas do card de pontos.
assert.ok(current.includes('const roundPointModel=homeCurrentRoundPoints(round,roundGames,state.ownPicks);'));
assert.ok(current.includes('${homeCurrentRoundPointsCard(roundPointModel)}'));
const comparable=current.replace('  const roundPointModel=homeCurrentRoundPoints(round,roundGames,state.ownPicks);',"  const roundPoints=state.ownPicks.reduce((sum,pick)=>{\n    const game=roundGames.find(item=>Number(item.id_jogo)===Number(pick.id_jogo));\n    return sum+points(pick,game);\n  },0);").replace('${homeCurrentRoundPointsCard(roundPointModel)}',"<article class=\"home-mini-card card mini-tone-gold home-navigable-card\" role=\"button\" tabindex=\"0\" data-home-action=\"stats\" aria-label=\"Abrir estatísticas\"><span class=\"mini-card-icon\">⭐</span><span>Pontos<br>da rodada</span><b aria-hidden=\"true\">›</b><strong>${roundPoints}</strong><small>Pontos confirmados</small></article>");
const preserved=comparable.replace('  if(!$("homeV2Tab")?.classList.contains("hidden")) renderHomeV2();\n','').replace('  renderHomeLeagueHighlights(highlightsContext);\n','').replace('  renderHomePreviousRound(round);\n','').trim();
assert.equal(createHash('sha256').update(preserved).digest('hex'),'a5bf0d01608190e869031d8b254ad1a9b2780283ecacb5494a55831f45c8f72f','Demais blocos da Home preservados na v6.51.2');
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
  if(process.argv[3]==='results'||process.argv[3]==='badges'||process.argv[3]==='home'||process.argv[3]==='home-record'){
    context.state.games=history.map(g=>({...g,rodada:g.rodada+26}));
    context.state.participant={nome:'Paulo',user_id:'me'};context.state.participants=[{user_id:'me',nome:'Paulo'}];
    context.state.publicPicks=personalPicks.map(p=>({...p,earned:p.score}));
    context.ownPick=id=>context.state.publicPicks.find(p=>p.id_jogo===id);
    context.buildRoundHighlights=()=>({...highlights(),round:29});
    context.hasValidScore=()=>true;
  }
  if(process.argv[3]==='badges'){
    context.state.participant={nome:'Paulo Rigazzo',user_id:'me'};
    context.state.participants=[{user_id:'me',nome:'Paulo Rigazzo'},{user_id:'other',nome:'Alexandre de Albuquerque e Silva'}];
    context.state.publicPicks=context.state.participants.flatMap(member=>context.state.games.map(game=>({user_id:member.user_id,usuario:member.nome,id_jogo:game.id_jogo,earned:10})));
    context.ownPick=id=>context.state.publicPicks.find(p=>p.user_id==='me'&&p.id_jogo===id);
  }
  vm.runInContext('renderHomeV2()',context);
  const sampleModel=buildRoundLiveHighlightsModel({...leaderPayload,ranking:leaderPayload.ranking.slice(0,process.argv[3]==='badges'?2:1)},'me');
  const sampleCard=process.argv[3]==='home-record'?buildHomeV2RoundRecord({records:{ranking:[{position:1,name:'Paulo Rigazzo',points:53,round:31,isCurrent:true}]}}):buildHomeV2RoundLeader(sampleModel,29,'me');
  context.sampleCard=sampleCard;
  const sampleMarkup=vm.runInContext('homeV2LeagueMetric(sampleCard)',context);
  node('homeV2Content').innerHTML=node('homeV2Content').innerHTML.replace('<div id="homeV2RoundLeaderSlot" class="v2-round-leader-slot"></div>','<div id="homeV2RoundLeaderSlot" class="v2-round-leader-slot">'+sampleMarkup+'</div>');
  const {writeFileSync}=await import('node:fs');
  const previewHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const modal=previewHtml.slice(previewHtml.indexOf('  <div id="friendlyRankingsModal"'),previewHtml.indexOf('  <div id="roundHighlightsModal"'));
  const modalFunctions=source.slice(source.indexOf('function friendlyRankingRows('),source.indexOf('function rankingParticipantPick('));
  const integration=`<script type="module">
import {buildFriendlyRankingsModel} from '/js/friendly-rankings-engine.js';
const state=${JSON.stringify(context.state)};
const $=id=>document.getElementById(id),points=p=>p?.earned||0,isScorableGame=g=>g.status==='finished',isAdminUser=()=>true,currentRoundNumber=()=>29;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let friendlyRankingsModel=null,friendlyRankingsView='efficiency',friendlyRankingsReturnFocus=null;
${extract('homeV2FriendlyRankings')}
${modalFunctions}
${source.slice(listenerStart,source.indexOf('\nfunction participantTeam(',listenerStart))}
$('friendlyRankingsModalClose').onclick=closeFriendlyRankings;
$('friendlyRankingsModal').onclick=event=>{const tab=event.target.closest('[data-friendly-ranking-view]');if(tab){friendlyRankingsView=tab.dataset.friendlyRankingView;renderFriendlyRankingsModal();}else if(event.target===$('friendlyRankingsModal'))closeFriendlyRankings();};
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeFriendlyRankings();});
</script>`;

  writeFileSync(process.argv[2], '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="http://localhost:8892/css/design-system.css"><link rel="stylesheet" href="http://localhost:8892/css/styles.css"><link rel="stylesheet" href="http://localhost:8892/css/components.css"><link rel="stylesheet" href="http://localhost:8892/css/identity-premium.css"><link rel="stylesheet" href="http://localhost:8892/css/home-v2.css"><body><main style="max-width:1100px;margin:auto;padding:16px"><section class="home-v2"><header class="v2-heading"><div><span class="eyebrow">DADOS SINTÉTICOS · VALIDAÇÃO LOCAL</span><h2>Home 2.0</h2></div><button class="secondary">Voltar à ADM</button></header><div id="homeV2Content" class="v2-grid">'+node('homeV2Content').innerHTML+'</div></section></main>'+modal+integration+'</body></html>');
  if(['home','home-record'].includes(process.argv[3])){
    const overview={innerHTML:''};
    const overviewStart=source.indexOf('$("homeOverview").innerHTML=');
    const overviewEnd=source.indexOf(';',overviewStart)+1;
    vm.runInNewContext(source.slice(overviewStart,overviewEnd),{$:()=>overview,round:29,roundGames:Array(10),finished:Array(2),completedPicks:10,pending:[],roundPointModel:{confirmed:5,provisional:0,total:5,projected:false},homeCurrentRoundPointsCard:vm.runInNewContext("("+extract("homeCurrentRoundPointsCard")+")")});
    const cards=buildHomeV2LeagueHighlights(vm.runInContext('homeV2FriendlyRankings()',context));
    context.fixtureCards=cards;
    context.roundHighlightsAvailable=()=>true;
    const section=vm.runInContext('homeV2LeagueHighlights(fixtureCards,"home",homeRoundHighlightsAccess({round:29}))',context).replace('<div id="homeRoundLeaderSlot" class="v2-round-leader-slot"></div>','<div id="homeRoundLeaderSlot" class="v2-round-leader-slot">'+sampleMarkup+'</div>');
    const styles=previewHtml.match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('').replaceAll('href="./','href="/');
    writeFileSync(process.argv[2], '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+styles+'<body><main style="max-width:1100px;margin:auto;padding:16px"><section id="homeTab" class="home-tab"><p class="eyebrow">DADOS SINTÉTICOS · VALIDAÇÃO LOCAL</p><section class="home-section-heading"><div><span class="eyebrow">VISÃO GERAL</span><h2>Seu bolão agora</h2></div><button class="home-secondary-action home-refresh-action">↻ Recarregar dados</button></section><section id="homeOverview" class="home-overview-grid">'+overview.innerHTML+'</section><div id="homeLeagueHighlights" class="home-league-highlights">'+section+'</div><section class="premium-feature-card"><h2>Partidas em andamento</h2><p>Conteúdo seguinte da Home preservado</p></section></section></main></body></html>');
  }

}

assert.equal(buildHomeV2RoundRecord(null),null);
assert.equal(buildHomeV2RoundRecord({records:{ranking:[]}}),null);
const recordModel={records:{ranking:[{position:1,name:'Pedro',points:53,round:31,isCurrent:true},{position:2,name:'Paulo',points:50,round:30}]}};
const recordCard=buildHomeV2RoundRecord(recordModel);
assert.equal(recordCard.value,'53');assert.equal(recordCard.view,'records');assert.equal(recordCard.leaders.length,1);
assert.equal(recordCard.leaders[0].detail,'Rodada 31');assert.equal(recordCard.leaders[0].isCurrent,true);
leaderSlot.button=null;leaderContext.homeV2FriendlyRankings=()=>recordModel;leaderContext.entry=null;
vm.runInContext('renderHomeV2RoundLeader(entry,29,"home")',leaderContext);
assert.match(leaderSlot.innerHTML,/Recorde por rodada/);assert.match(leaderSlot.innerHTML,/data-view="records"/);assert.doesNotMatch(leaderSlot.innerHTML,/data-round=/);
leaderContext.entry={data:leaderPayload};vm.runInContext('renderHomeV2RoundLeader(entry,29,"home")',leaderContext);assert.match(leaderSlot.innerHTML,/Líder da rodada/);
leaderContext.entry=null;leaderContext.isScorableGame=()=>true;leaderContext.state.games=[{rodada:29}];
vm.runInContext('renderHomeV2RoundLeader(entry,29,"home")',leaderContext);assert.equal(leaderSlot.innerHTML,'');
context.clickLeague({target:{closest:()=>({dataset:{v2Action:'parallel',view:'records'}})}});assert.equal(context.friendlyRankingsView,'records');

leaderContext.state.games=[];leaderContext.publicPicksRefreshPending=true;
vm.runInContext('renderHomeV2RoundLeader(entry,29,"home")',leaderContext);assert.equal(leaderSlot.innerHTML,'');
leaderContext.publicPicksRefreshPending=false;leaderContext.isAdminUser=()=>true;
leaderContext.$=id=>({homeV2RoundLeaderSlot:leaderSlot,homeV2LeagueHighlightsSection:leaderSection,homeV2Tab:leaderTab}[id]);
vm.runInContext('renderHomeV2RoundLeader(entry,29)',leaderContext);assert.match(leaderSlot.innerHTML,/Recorde por rodada/);
const sharedRecord=buildHomeV2RoundRecord({records:{ranking:[recordModel.records.ranking[0],{...recordModel.records.ranking[0],name:'Outro'}]}});
assert.equal(sharedRecord.shared,true);assert.equal(sharedRecord.leaders.length,2);
