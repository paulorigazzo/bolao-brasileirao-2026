import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { competitionRound } from "../js/round-context.js";
import { isScheduledLiveEstimate, scheduledLiveLabel } from "../js/scheduled-live-estimate.js";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const source=name=>{
  const start=app.indexOf(`function ${name}(`);
  assert.ok(start>=0,name);
  return app.slice(start,app.indexOf("\n}",start)+2);
};
let now=Date.parse("2026-10-07T22:53:00Z");
class Clock extends Date { static now(){return now;} }
const game=(id,round,status="agendado",inicio="2026-10-08T00:30:00Z")=>({id_jogo:id,rodada:round,status,inicio,time_casa:"Casa",time_fora:"Fora"});
const current=game(1,29),future=game(2,30),past=game(3,28,"encerrado");
const state={games:[past,current,future]};
let pick=null;
let cards=[];
const context={
  state,Date:Clock,CONFIG:{lockMinutesBefore:30},competitionRound,
  normalizeTeamKey:value=>String(value).toLowerCase().replaceAll("_","-"),
  isFinished:g=>g.status==="encerrado",
  isScheduledLiveEstimate:g=>isScheduledLiveEstimate(g,now),
  scheduledLiveLabel:g=>scheduledLiveLabel(g,now),
  liveMatchMinute:()=>"52",ownPick:()=>pick,pickDraft:()=>null,
  favoriteTeamMatchData:()=>({isFavoriteMatch:false}),
  compactTeam:(_,name)=>`<span class="game-summary-team">${name}</span>`,
  premiumTime:()=>"21:30",escapeHtml:value=>String(value??""),
  points:()=>10,calculatePredictionPoints:()=>10,predictionResultLabel:()=>"Placar exato",
  teamDisplayName:value=>value,teamLogo:()=>"",premiumGoalEvents:()=>"",premiumGameDetails:()=>"",validPickDraft:()=>false,
  document:{querySelectorAll:()=>cards}
};
const names=["gameStatusDisplay","isPostponed","isUndatedPostponement","locked","deadlineText","currentRoundNumber","gameHeaderDeadline","premiumMatchCard","refreshVisibleGameClocks"];
const functions=runInNewContext(names.map(source).join("\n")+`;({${names.join(",")}})`,context);
const header=html=>html.match(/data-game-header-status[^>]*>([^<]*)<\/span>/)?.[1];
const expanded=html=>html.match(/data-game-expanded-status[^>]*>([^<]*)<\/span>/)?.[1];
assert.equal(header(functions.premiumMatchCard(current)),"Fecha em 1h 7min");
assert.equal(expanded(functions.premiumMatchCard(current)),"ABERTO","status expandido preservado");
pick={gols_casa:1,gols_fora:0};
assert.equal(header(functions.premiumMatchCard(current)),"Fecha em 1h 7min","palpite salvo também mostra prazo");
assert.equal(expanded(functions.premiumMatchCard(current)),"SALVO");
assert.equal(header(functions.premiumMatchCard(future)),"","rodada futura preservada");
assert.equal(header(functions.premiumMatchCard({...current,rodada:28})),"","rodada passada preservada");
now=Date.parse("2026-10-08T00:00:00Z");
assert.equal(header(functions.premiumMatchCard(current)),"Palpites encerrados");
assert.equal(expanded(functions.premiumMatchCard(current)),"FECHADO");
assert.equal(header(functions.premiumMatchCard(future)),"");
for(const [status,label] of [["encerrado","ENCERRADO"],["cancelado","CANCELADO"],["adiado","ADIADO"],["suspenso","SUSPENSO"],["intervalo","INTERVALO"],["em_andamento","AO VIVO • 52'"]]){
  const match={...current,status,gols_casa:1,gols_fora:0};
  const markup=functions.premiumMatchCard(match);
  assert.equal(header(markup),label);
  assert.ok(!markup.includes("is-pick-deadline"));
  if(status==="encerrado"){
    assert.ok(markup.includes('class="premium-toggle-score">1 × 0'));
    assert.ok(markup.includes('aria-label="10 pontos no jogo"'));
  }
}
function cardFor(g){
  const nodes=Object.fromEntries(["data-game-header-status","data-game-expanded-status","data-game-deadline"].map(key=>[key,{textContent:"",classes:new Set(),classList:{toggle(name,on){on?nodes[key].classes.add(name):nodes[key].classes.delete(name);}}}]));
  return {dataset:{id:g.id_jogo},querySelector:selector=>nodes[selector.slice(1,-1)],nodes};
}
now=Date.parse("2026-10-07T22:53:00Z");
cards=[cardFor(current),cardFor(future),cardFor(past)];
functions.refreshVisibleGameClocks();
assert.equal(cards[0].nodes["data-game-header-status"].textContent,"Fecha em 1h 7min");
assert.equal(cards[0].nodes["data-game-expanded-status"].textContent,"SALVO");
assert.equal(cards[1].nodes["data-game-header-status"].textContent,"");
assert.equal(cards[2].nodes["data-game-header-status"].textContent,"ENCERRADO");
now+=60_000;
functions.refreshVisibleGameClocks();
assert.equal(cards[0].nodes["data-game-header-status"].textContent,"Fecha em 1h 6min");
now=Date.parse("2026-10-08T00:00:00Z");
functions.refreshVisibleGameClocks();
assert.equal(cards[0].nodes["data-game-header-status"].textContent,"Palpites encerrados");
state.games=[past,{...current,status:"encerrado"},future];
functions.refreshVisibleGameClocks();
assert.equal(cards[0].nodes["data-game-header-status"].textContent,"ENCERRADO");
assert.ok(!cards[0].nodes["data-game-header-status"].classes.has("is-pick-deadline"));
assert.equal(cards[1].nodes["data-game-header-status"].textContent,"Palpites encerrados","nova rodada atual recebe o indicador");
now=Date.parse("2026-10-08T00:31:00Z");
state.games=[past,current,{...future,inicio:"2026-10-14T00:30:00Z"}];
assert.equal(header(functions.premiumMatchCard(current)),scheduledLiveLabel(current,now),"ao vivo estimado preservado");
console.log("Prazo no cabeçalho verificado: rodada atual, atualização, fechamento e estados preservados.");
