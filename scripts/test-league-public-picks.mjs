import assert from 'node:assert/strict';
import {loadLeaguePublicPicks} from '../js/league-public-picks.js';
import {createLeagueRequestGate} from '../js/league-context.js';
import {buildFriendlyRankingsModel} from '../js/friendly-rankings-engine.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const participants=Array.from({length:23},(_,i)=>({user_id:`member-${String(i).padStart(2,'0')}`,nome:`Pessoa ${i}`}));
const games=Array.from({length:70},(_,i)=>({id_jogo:i+1,rodada:25+Math.floor(i/10),status:'encerrado'}));
const rows=games.flatMap(game=>participants.map(p=>({id_jogo:game.id_jogo,user_id:p.user_id,usuario:p.nome,gols_casa:game.rodada===31&&p===participants[0]?2:1,gols_fora:0})));
function database(data=rows,alter=page=>page){
  const calls=[];
  return {calls,rpc(name,params,options){
    assert.equal(name,'obter_palpites_encerrados_liga');assert.deepEqual(params,{p_liga_id:'league-a'});assert.deepEqual(options,{count:'exact'});
    const orders=[];
    return {order(column,options){orders.push([column,options]);return this;},async range(from,to){
      assert.deepEqual(orders,[['id_jogo',{ascending:true}],['user_id',{ascending:true}]]);
      calls.push([from,to]);
      return alter({data:data.slice(from,to+1),count:data.length,error:null},calls.length);
    }};
  }};
}
const load=(supabase,extra={})=>loadLeaguePublicPicks({supabase,leagueId:'league-a',...extra});
for(const size of [0,1,499,500,1000,1001,1610]){
  const db=database(rows.slice(0,size)),result=await load(db);
  assert.equal(result.error,null);assert.equal(result.cancelled,false);assert.deepEqual(result.data,rows.slice(0,size));
  assert.equal(db.calls.length,Math.max(1,Math.ceil(size/500)));
  for(let i=0;i<db.calls.length;i++)assert.deepEqual(db.calls[i],[i*500,i*500+499]);
}
const full=await load(database());
const model=picks=>buildFriendlyRankingsModel({games,picks,participants,currentParticipant:participants[0],isScorableGame:g=>g.status==='encerrado',pointsForPick:p=>p.gols_casa===2?10:3});
assert.equal(full.data.length,1610);
assert.equal(model(full.data).efficiency.ranking[0].evaluated,70);
assert.deepEqual(model(full.data).hot.ranking[0].rounds,[29,30,31]);
assert.equal(model(full.data).hot.ranking[0].id,participants[0].user_id);
assert.equal(model(full.data).records.ranking[0].round,31);
assert.equal(model(full.data).records.ranking[0].points,100);
assert.ok(model(rows.slice(0,1000)).hot.ranking.every(p=>!p.rounds.includes(31)),'reproduz a falha da amostra truncada');

// Nenhuma falha intermediária pode devolver a primeira página como sucesso.
for(const alter of [
  (p,n)=>n===2?{...p,error:new Error('falha de rede')}:p,
  (p,n)=>n===2?{...p,data:[]}:p,
  (p,n)=>n===2?{...p,count:p.count+1}:p,
  (p,n)=>n===2?{...p,data:[rows[0],...p.data.slice(1)]}:p,
  p=>({...p,count:null}),
  p=>({...p,data:p.data.slice(0,100)}),
]){
  const result=await load(database(rows,alter));assert.equal(result.data,null);assert.ok(result.error);assert.equal(result.cancelled,false);
}
const thrown=await load({rpc(){throw Error('sem sessão');}});assert.equal(thrown.data,null);assert.ok(thrown.error);
const gate=createLeagueRequestGate();gate.issue();const initial=gate.capture();gate.issue();assert.equal(initial(),false);
const skipped=database();assert.equal((await load(skipped,{isCurrent:()=>false})).cancelled,true);assert.equal(skipped.calls.length,0);
const current=gate.capture();const interrupted=database(rows,(p,n)=>{if(n===2)gate.issue();return p;});
const cancelled=await load(interrupted,{isCurrent:current});assert.equal(cancelled.data,null);assert.equal(cancelled.error,null);assert.equal(cancelled.cancelled,true);
assert.equal(interrupted.calls.length,2);
// Mesmo ao retornar à liga original, a geração antiga continua cancelada.
gate.issue();assert.equal(current(),false);
const invalid=await load(database(),{pageSize:1001});assert.equal(invalid.data,null);assert.ok(invalid.error);
console.log('Palpites da liga: paginação integral, 1.610 registros, rodada 31, indicadores, falhas e troca de contexto aprovados.');

// Exercita os dois consumidores reais: entrada na liga e releitura automática.
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function loadLeagueContext('),end=source.indexOf('async function loadLegacyCompetitiveContext(',start);
const liveStart=source.indexOf('async function refreshLiveScoresSilently()'),liveEnd=source.indexOf('function startLiveScoreRefresh()',liveStart);
function integration({fail=false,cancel=false}={}){
  let rendered=0;
  const gate=createLeagueRequestGate();
  const context={state:{user:{id:'viewer'},activeLeague:{liga_id:'league-a'},leagueContextStatus:'ready',games:[],publicPicks:[{old:true}],participants:[]},publicPicksRefreshPending:false,liveScoreRefreshInFlight:false,document:{hidden:false},leagueRequestGate:gate,resetRoundHighlightsContext(){},loadLeaguePublicPicks,filterProfilesByMembers:x=>x,persistActiveLeague(){},localStorage:{},applyCanonicalParticipantNames(){},renderLeagueContext(){},shouldRefreshGamesFromSupabase:()=>true,shouldRefreshGameDetails:()=>false,hasNewlyRevealablePublicPicks:()=>true,console:{warn(){}},$:()=>({classList:{contains:()=>true}})};
  const db=database(rows,(p,n)=>{
    if(n===2&&cancel){gate.issue();context.state.activeLeague={liga_id:'league-b'};context.state.publicPicks=[{otherLeague:true}];}
    return n===2&&fail?{...p,error:Error('falha intermediária')}:p;
  });
  context.sb={rpc(name,...args){return name==='obter_palpites_encerrados_liga'?db.rpc(name,...args):Promise.resolve({data:[],error:null});},from(table){return {select(){return {order(){return this;},then(resolve){return Promise.resolve({data:table==='jogos'?games:participants,error:null}).then(resolve);}};}};}};
  for(const name of ['renderSyncStatus','renderGames','renderRanking','renderMyTeam','renderStats','renderHome'])context[name]=()=>{rendered++;};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);vm.runInContext(source.slice(liveStart,liveEnd),context);
  return {context,rendered:()=>rendered};
}
let actual=integration();assert.equal(await vm.runInContext('loadLeagueContext({liga_id:"league-a"})',actual.context),true);assert.equal(actual.context.state.publicPicks.length,1610);
actual=integration({fail:true});await assert.rejects(vm.runInContext('loadLeagueContext({liga_id:"league-a"})',actual.context));assert.deepEqual(actual.context.state.publicPicks,[{old:true}]);
actual=integration({cancel:true});assert.equal(await vm.runInContext('loadLeagueContext({liga_id:"league-a"})',actual.context),false);assert.deepEqual(actual.context.state.publicPicks,[{otherLeague:true}]);
actual=integration();await vm.runInContext('refreshLiveScoresSilently()',actual.context);assert.equal(actual.context.state.publicPicks.length,1610);assert.equal(actual.context.publicPicksRefreshPending,false);assert.ok(actual.rendered()>0);
actual=integration({fail:true});await vm.runInContext('refreshLiveScoresSilently()',actual.context);assert.deepEqual(actual.context.state.publicPicks,[{old:true}]);assert.equal(actual.context.publicPicksRefreshPending,true);
actual=integration({cancel:true});await vm.runInContext('refreshLiveScoresSilently()',actual.context);assert.deepEqual(actual.context.state.publicPicks,[{otherLeague:true}]);assert.equal(actual.rendered(),0);assert.equal(actual.context.liveScoreRefreshInFlight,false);
console.log('Integrações reais: entrada e atualização automática preservam respostas completas e contexto da liga.');

// A reconstrução do ranking também atualiza um modal que já estava aberto.
let modalOpen=false;
const nodes=new Map();
const node=id=>{
  if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{contains:()=>!modalOpen,toggle(){}},setAttribute(){},toggleAttribute(){}});
  return nodes.get(id);
};
const ui={state:{games,publicPicks:full.data,participants,participant:participants[0],activeLeague:{liga_nome:'Liga de teste'}},$:node,buildFriendlyRankingsModel,isScorableGame:()=>true,points:p=>p.gols_casa===2?10:3,friendlyRankingsModel:null,friendlyRankingsView:'hot',escapeHtml:s=>String(s??'')};
vm.createContext(ui);
vm.runInContext(source.slice(source.indexOf('function friendlyRankingRows('),source.indexOf('function openFriendlyRankings(')),ui);
const modelStart=source.indexOf('  friendlyRankingsModel=buildFriendlyRankingsModel({');
const modelEnd=source.indexOf("  if($('friendlyRankingsTeaser'))",modelStart);
vm.runInContext('{'+source.slice(modelStart,modelEnd)+'}',ui);assert.equal(node('friendlyRankingsHotList').innerHTML,'');
modalOpen=true;vm.runInContext('{'+source.slice(modelStart,modelEnd)+'}',ui);
assert.match(node('friendlyRankingsHotList').innerHTML,/Rodadas 29, 30, 31/);
assert.match(node('friendlyRankingsEfficiencyList').innerHTML,/70 palpites avaliados/);
assert.match(node('friendlyRankingsRecordsList').innerHTML,/Rodada 31/);
assert.equal(ui.friendlyRankingsView,'hot','atualização preserva a aba selecionada');
console.log('Modal aberto: dados completos atualizam as três abas sem mudar a seleção.');
