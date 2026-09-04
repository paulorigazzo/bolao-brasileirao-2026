import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  activeLeagueName,
  chooseActiveLeague,
  createLeagueRequestGate,
  filterProfilesByMembers,
  leaguePreferenceKey,
  persistActiveLeague
} from "../js/league-context.js";

const memory = new Map();
const storage = { getItem:key=>memory.get(key), setItem:(key,value)=>memory.set(key,value) };
const leagues = [
  { liga_id:"private",liga_nome:"Amigos",liga_tipo:"privada" },
  { liga_id:"standard",liga_nome:"Brasileirão 2026",liga_tipo:"standard" }
];

assert.equal(chooseActiveLeague(leagues,{userId:"u1",storage}).liga_id,"standard");
assert.equal(persistActiveLeague(leagues[0],{userId:"u1",storage}),true);
assert.equal(memory.get(leaguePreferenceKey("u1")),"private");
assert.equal(chooseActiveLeague(leagues,{userId:"u1",storage}).liga_id,"private");
memory.set(leaguePreferenceKey("u1"),"removed");
assert.equal(chooseActiveLeague(leagues,{userId:"u1",storage}).liga_id,"standard");
assert.equal(chooseActiveLeague([],{userId:"u1",storage}),null);
assert.equal(activeLeagueName(leagues[1]),"Brasileirão 2026");

const gate=createLeagueRequestGate();
const first=gate.issue(),second=gate.issue();
assert.equal(gate.isCurrent(first),false);
assert.equal(gate.isCurrent(second),true);

assert.deepEqual(
  filterProfilesByMembers([{user_id:"1"},{user_id:"2"}], [{user_id:"2"}]),
  [{user_id:"2"}]
);

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(app,/sb\.rpc\("listar_minhas_ligas"\)/);
for(const rpc of ["listar_membros_liga","obter_palpites_encerrados_liga","obter_contagem_palpites_liga","obter_ranking_liga","obter_ranking_provisorio_liga"]){
  assert.match(app,new RegExp(`sb\\.rpc\\(["']${rpc}["']`));
}
assert.match(app,/const params=\{p_liga_id:league\.liga_id\}/);
assert.doesNotMatch(app,/const payloads?=\{[^}]*liga_id\s*:/i);
assert.doesNotMatch(app,/state\.leagueContextStatus="loading"/);
assert.doesNotMatch(app,/state\.leagueContextStatus="error"/);
assert.doesNotMatch(app,/palpites_encerrados_publicos|contagem_palpites_participantes/);
assert.match(html,/id="leagueShortcut"[^>]+role="menuitem"/);
assert.match(html,/id="leagueSelectorModal"[^>]+role="dialog"/);

console.log("Contexto de liga na interface verificado com sucesso.");
