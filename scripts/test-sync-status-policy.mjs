import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeGameForStatus } from "../netlify/functions/_sync-policy.mjs";
import { mapStatus } from "../netlify/functions/_sync-shared.mjs";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");

assert.equal(mapStatus("IN_PLAY"),"em_andamento");
assert.equal(mapStatus("LIVE"),"em_andamento");
assert.equal(mapStatus("PAUSED"),"intervalo");
assert.equal(mapStatus("FINISHED"),"encerrado");
assert.match(app,/rawStatus\.includes\("intervalo"\)/);
assert.match(app,/interval\?"INTERVALO"/);
assert.match(app,/liveMatchMinute/);

const previous={id_jogo:554775,status:"encerrado",gols_casa:2,gols_fora:1};
for(const status of ["agendado","adiado","cancelado"]){
  const repairs=[];
  const game={id_jogo:554775,status,gols_casa:null,gols_fora:null};
  const result=sanitizeGameForStatus(game,previous,repairs);
  assert.equal(result.status,"encerrado");
  assert.equal(result.gols_casa,2);
  assert.equal(result.gols_fora,1);
  assert.equal(repairs.length,1);
  assert.equal(repairs[0].action,"resultado_encerrado_preservado");
  assert.match(repairs[0].reason,/regressão de resultado encerrado bloqueada/);
}

for(const status of ["agendado","adiado","cancelado"]){
  const repairs=[];
  const game={id_jogo:2,status,gols_casa:3,gols_fora:2};
  const result=sanitizeGameForStatus(game,{id_jogo:2,status:"agendado",gols_casa:null,gols_fora:null},repairs);
  assert.equal(result.status,status);
  assert.equal(result.gols_casa,null);
  assert.equal(result.gols_fora,null);
  assert.equal(repairs.length,1);
  assert.equal(repairs[0].action,"placar_incompativel_removido");
  assert.equal(repairs[0].apiScore,"3 × 2");
}

const apiCorrection=[];
const protectedResult=sanitizeGameForStatus(
  {id_jogo:3,status:"agendado",gols_casa:0,gols_fora:0},
  {id_jogo:3,status:"encerrado",gols_casa:1,gols_fora:0},
  apiCorrection
);
assert.equal(protectedResult.status,"encerrado");
assert.equal(protectedResult.gols_casa,1);
assert.equal(protectedResult.gols_fora,0);
assert.equal(apiCorrection[0].apiScore,"0 × 0");

const live=sanitizeGameForStatus({id_jogo:1,status:"em_andamento",gols_casa:null,gols_fora:null},{status:"em_andamento",gols_casa:1,gols_fora:0},[]);
assert.equal(live.gols_casa,1);
assert.equal(live.gols_fora,0);

const interval=sanitizeGameForStatus({id_jogo:1,status:"intervalo",gols_casa:null,gols_fora:null},{status:"em_andamento",gols_casa:1,gols_fora:1},[]);
assert.equal(interval.status,"intervalo");
assert.equal(interval.gols_casa,1);
assert.equal(interval.gols_fora,1);
console.log("Política de status e placar verificada com sucesso.");
