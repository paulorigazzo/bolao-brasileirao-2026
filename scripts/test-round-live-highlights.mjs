import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildRoundLiveHighlightsModel,createRoundHighlightsLoader} from "../js/round-live-highlights-engine.js";

const payload={round:27,leagueId:"league",updatedAt:"2026-09-14T01:00:00Z",lifecycle:{total:10,finished:2,live:1,liveWithScore:1,suspendedWithScore:0,complete:false},ranking:[
  {user_id:"ana",nome:"Ana",position:1,confirmed:18,provisional:10,total:28,exact:2,officialPosition:2,projectedPosition:1,gap:0},
  {user_id:"bia",nome:"Bia",position:2,confirmed:18,provisional:10,total:28,exact:2,officialPosition:1,projectedPosition:2,gap:0},
  {user_id:"zero",nome:"Zero",position:3,confirmed:0,provisional:0,total:0,exact:0,officialPosition:3,projectedPosition:3,gap:28}
]};
const model=buildRoundLiveHighlightsModel(payload,"ana");
assert.equal(model.ranking.length,3);
assert.match(model.facts.personal[0].title,/28 pontos/);
assert.match(model.facts.personal[2].detail,/Ranking oficial atual/);
assert.match(model.facts.group[0].title,/2 participantes dividem/);
assert.ok(model.facts.group.every(f=>!f.key.includes("unique")));
assert.equal(buildRoundLiveHighlightsModel(payload,"outsider").facts.personal.length,0);
assert.throws(()=>buildRoundLiveHighlightsModel(null,"ana"));
assert.equal(buildRoundLiveHighlightsModel({...payload,lifecycle:{...payload.lifecycle,finished:0,liveWithScore:0}},"ana").facts.personal.length,0);

let clock=0,calls=0,fail=false;
let release;
const loader=createRoundHighlightsLoader(async()=>{calls++;if(fail) throw Error("offline");return payload;},()=>clock);
await loader.load("viewer:league:27",{});
await loader.load("viewer:league:27",{});
assert.equal(calls,1,"cache avoids duplicate requests");
clock=60000;fail=true;
const stale=await loader.load("viewer:league:27",{});
assert.equal(stale.data,payload);assert.equal(stale.error,true);
fail=false;
assert.equal((await loader.load("viewer:league:27",{},{force:true})).error,false);
const delayed=createRoundHighlightsLoader(()=>new Promise(resolve=>{release=resolve;}));
const first=delayed.load("a",{});
const second=delayed.load("a",{});
delayed.clear();release(payload);
assert.equal(await first,null);assert.equal(await second,null);
assert.equal(delayed.peek("a"),undefined,"league change discards late responses");
let denied=false;
const permissions=createRoundHighlightsLoader(async()=>{if(denied) throw {code:"42501"};return payload;});
await permissions.load("viewer:league:27",{});denied=true;
assert.equal((await permissions.load("viewer:league:27",{},{force:true})).data,null,"access denied clears previously cached data");

const app=await readFile(new URL("../js/app.js",import.meta.url),"utf8");
const shareStart=app.indexOf("function currentAdminRoundSummary()");
assert.ok(shareStart>=0);
const share=app.slice(shareStart,app.indexOf("function closeAdminRoundShare",shareStart));
assert.match(share,/buildAdminRoundSummary/);
assert.doesNotMatch(share,/roundHighlightsLoader|buildRoundLiveHighlightsModel/);
assert.match(app,/obter_destaques_rodada_liga/);
assert.match(app,/session===roundHighlightsSession/);
console.log("Destaques ao vivo: fatos agregados, empates, privacidade e concorrência verificados.");
