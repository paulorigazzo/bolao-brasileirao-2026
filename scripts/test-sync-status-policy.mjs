import assert from "node:assert/strict";
import { sanitizeGameForStatus } from "../netlify/functions/_sync-policy.mjs";

const previous={id_jogo:554775,status:"encerrado",gols_casa:2,gols_fora:1};
for(const status of ["agendado","adiado","cancelado"]){
  const repairs=[];
  const game={id_jogo:554775,status,gols_casa:2,gols_fora:1};
  const result=sanitizeGameForStatus(game,previous,repairs);
  assert.equal(result.gols_casa,null);
  assert.equal(result.gols_fora,null);
  assert.equal(repairs.length,1);
  assert.match(repairs[0].reason,/placar incompatível removido/);
}

const live=sanitizeGameForStatus({id_jogo:1,status:"em_andamento",gols_casa:null,gols_fora:null},{status:"em_andamento",gols_casa:1,gols_fora:0},[]);
assert.equal(live.gols_casa,1);
assert.equal(live.gols_fora,0);
console.log("Política de status e placar verificada com sucesso.");
