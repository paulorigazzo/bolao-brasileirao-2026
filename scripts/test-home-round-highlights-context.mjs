import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { legacyPendingRounds } from "../js/round-context.js";
import { temporaryRankingAvailability } from "../js/temporary-ranking-engine.js";
import { isPostponedRoundHighlightsEligible, selectLatestRoundHighlightsCandidate } from "../js/round-highlights-engine.js";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const source=name=>{
  const start=app.indexOf(`function ${name}(`);
  assert.ok(start>=0,name);
  return app.slice(start,app.indexOf("\n}",start)+2);
};
const now=Date.parse("2026-10-07T23:00:00Z");
class Clock extends Date { static now(){return now;} }
const state={games:[]};
const context={state,Date:Clock,currentRoundNumber:()=>29,legacyPendingRounds,temporaryRankingAvailability,isPostponedRoundHighlightsEligible,selectLatestRoundHighlightsCandidate,normalizeTeamKey:value=>String(value||"").toLowerCase().replaceAll("_","-")};
const names=["gameStatusDisplay","isFinished","isCancelled","hasScoreValue","hasValidScore","isScorableGame","roundLifecycleSummary","pendingEarlierRounds","roundHighlightsAvailable","latestRoundHighlightsCandidate","homeRoundHighlightsContext"];
const functions=runInNewContext(names.map(source).join("\n")+`;({${names.join(",")}})`,context);
const game=(round,status,inicio="2026-10-07T21:00:00Z",score=false)=>({rodada:round,status,inicio,gols_casa:score?1:null,gols_fora:score?0:null});
const oldPending=[game(21,"encerrado","2026-10-03T21:00:00Z",true),game(21,"adiado")];
const choose=(games,nextGame=null)=>{
  state.games=games;
  const lifecycle=functions.roundLifecycleSummary(games.filter(g=>g.rodada===29));
  const result=functions.homeRoundHighlightsContext({round:29,lifecycle,nextGame,now});
  return result?JSON.parse(JSON.stringify(result)):null;
};
assert.deepEqual(choose([...oldPending,game(29,"encerrado",undefined,true),game(29,"agendado","2026-10-08T00:30:00Z")]),{round:29,mode:"live"},"resultados atuais superam rodada antiga adiada");
assert.deepEqual(choose([...oldPending,game(21,"em_andamento",undefined,true),game(29,"em_andamento",undefined,true)]),{round:29,mode:"live"},"rodada atual supera jogo antigo ao vivo");
assert.deepEqual(choose([...oldPending,game(29,"encerrado",undefined,true)]),{round:29,mode:"finished"},"rodada atual concluída tem prioridade");
assert.deepEqual(choose([...oldPending,game(29,"encerrado",undefined,true),game(29,"adiado")]),{round:29,mode:"live"},"resultados parciais atuais têm prioridade");
assert.deepEqual(choose([...oldPending,game(29,"agendado","2026-10-08T00:30:00Z")]),{round:21,mode:"live"},"rodada antiga ainda é alternativa quando a atual não tem destaques");
assert.deepEqual(choose([game(21,"em_andamento",undefined,true),game(29,"em_andamento",undefined,false)]),{round:21,mode:"live"},"sem placar atual usa alternativa antiga disponível");
assert.equal(choose([game(29,"agendado","2026-10-08T00:30:00Z")]),null);
assert.equal(choose([game(29,"adiado")]),null);
const previous=game(28,"encerrado","2026-10-06T21:00:00Z",true);
assert.deepEqual(choose([previous,game(29,"agendado","2026-10-08T00:30:00Z")]),{round:28,mode:"recent"},"fallback recente preservado");
assert.deepEqual(choose([game(28,"encerrado","2026-09-20T21:00:00Z",true),game(29,"agendado","2026-10-20T00:30:00Z")],game(29,"agendado","2026-10-20T00:30:00Z")),{round:28,mode:"pause"},"fallback de pausa longa preservado");
state.games=[...oldPending,game(29,"em_andamento",undefined,true)];
assert.equal(functions.roundHighlightsAvailable(21),true,"destaques antigos continuam acessíveis separadamente");
assert.equal(functions.roundHighlightsAvailable(29),true);
console.log("Destaques da Home verificados: prioridade atual e alternativas antigas preservadas.");
