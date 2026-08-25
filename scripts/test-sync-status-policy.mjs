import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeGameForStatus, sanitizeGameSchedule } from "../netlify/functions/_sync-policy.mjs";
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

const scheduleRepairs=[];
const protectedSchedule=sanitizeGameSchedule(
  {id_jogo:554887,status:"encerrado",inicio:"2026-05-10T20:40:00Z"},
  {id_jogo:554887,status:"encerrado",inicio:"2026-05-10T19:00:00Z",situacao_agendamento:"confirmado",fonte_agendamento:"cbf",agendamento_confirmado_em:"2026-08-25T00:00:00Z",data_base:null},
  scheduleRepairs
);
assert.equal(protectedSchedule.inicio,"2026-05-10T19:00:00Z");
assert.equal(scheduleRepairs[0].action,"agendamento_oficial_preservado");

const postponed=sanitizeGameSchedule(
  {id_jogo:554940,status:"adiado",inicio:"2026-07-29T00:00:00Z"},
  {id_jogo:554940,status:"adiado",inicio:"2026-07-29T00:00:00Z",situacao_agendamento:"adiado_sem_data",fonte_agendamento:"cbf",agendamento_confirmado_em:null,data_base:null},
  []
);
assert.equal(postponed.situacao_agendamento,"adiado_sem_data");
assert.equal(postponed.inicio,"2026-07-29T00:00:00Z");

const rescheduledRepairs=[];
const rescheduled=sanitizeGameSchedule(
  {id_jogo:554940,status:"agendado",inicio:"2026-10-01T22:00:00Z"},
  postponed,
  rescheduledRepairs
);
assert.equal(rescheduled.situacao_agendamento,"provisorio");
assert.equal(rescheduled.data_base,"2026-10-01");
assert.equal(rescheduledRepairs[0].action,"nova_agenda_provisoria_observada");
console.log("Política de status e placar verificada com sucesso.");
