import assert from "node:assert/strict";
import { estimatedLiveMatchMinute, evolveEstimatedLiveClock, goalMinuteDiagnostics, liveMatchMinute, officialLiveMatchMinute } from "../js/live-match-minute.js";
import { normalizeMatch } from "../netlify/functions/_sync-shared.mjs";

assert.equal(officialLiveMatchMinute({ minuto: 37, acrescimos: null }),"37");
assert.equal(officialLiveMatchMinute({ minuto: 45, acrescimos: 3 }),"45+3");
assert.equal(officialLiveMatchMinute({ minuto: 46, acrescimos: 3 }),"46");
assert.equal(officialLiveMatchMinute({ minuto: null, acrescimos: null }),"");
assert.equal(officialLiveMatchMinute({ minuto: 200, acrescimos: 2 }),"");
assert.equal(liveMatchMinute({ minuto: 45, acrescimos: 3, minuto_estimado: 20, periodo_estimado:"primeiro_tempo" }),"45+3");
assert.equal(estimatedLiveMatchMinute({minuto_estimado:45,periodo_estimado:"primeiro_tempo",relogio_referencia_em:"2026-08-15T19:00:00Z"},"2026-08-15T19:03:00Z"),"45+3");
assert.equal(liveMatchMinute({minuto_estimado:89,periodo_estimado:"segundo_tempo",relogio_referencia_em:null}),"~89");
assert.equal(estimatedLiveMatchMinute({minuto_estimado:61,periodo_estimado:"primeiro_tempo",relogio_referencia_em:null}),"");
assert.equal(estimatedLiveMatchMinute({minuto_estimado:106,periodo_estimado:"segundo_tempo",relogio_referencia_em:null}),"");

const firstObservation=evolveEstimatedLiveClock({id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},{id_jogo:1,status:"agendado"},{},"2026-08-15T19:00:00Z");
assert.equal(firstObservation.minuto_estimado,0);
assert.equal(firstObservation.periodo_estimado,"primeiro_tempo");

const observedFourMinutesLate=evolveEstimatedLiveClock({id_jogo:2,inicio:"2026-08-15T19:00:00Z",status:"em_andamento",minuto:null,acrescimos:null},{id_jogo:2,status:"agendado"},{},"2026-08-15T19:04:30Z");
assert.equal(observedFourMinutesLate.relogio_referencia_em,"2026-08-15T19:00:00.000Z");
assert.equal(estimatedLiveMatchMinute(observedFourMinutesLate,"2026-08-15T19:04:30Z"),"4");

const observedTwentyMinutesLate=evolveEstimatedLiveClock({id_jogo:3,inicio:"2026-08-15T19:00:00Z",status:"em_andamento",minuto:null,acrescimos:null},{id_jogo:3,status:"agendado"},{},"2026-08-15T19:20:30Z");
assert.equal(observedTwentyMinutesLate.relogio_referencia_em,"2026-08-15T19:05:30.000Z");
assert.equal(estimatedLiveMatchMinute(observedTwentyMinutesLate,"2026-08-15T19:20:30Z"),"15");

const observedBeforeSchedule=evolveEstimatedLiveClock({id_jogo:4,inicio:"2026-08-15T19:10:00Z",status:"em_andamento",minuto:null,acrescimos:null},{id_jogo:4,status:"agendado"},{},"2026-08-15T19:05:00Z");
assert.equal(estimatedLiveMatchMinute(observedBeforeSchedule,"2026-08-15T19:05:00Z"),"");

const observedWithInvalidSchedule=evolveEstimatedLiveClock({id_jogo:5,inicio:"inválido",status:"em_andamento",minuto:null,acrescimos:null},{id_jogo:5,status:"agendado"},{},"2026-08-15T19:05:00Z");
assert.equal(observedWithInvalidSchedule.relogio_referencia_em,"2026-08-15T19:05:00.000Z");

const advanced=evolveEstimatedLiveClock({id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},{...firstObservation,status:"em_andamento"},{},"2026-08-15T19:07:10Z");
assert.equal(advanced.minuto_estimado,0);
assert.equal(advanced.relogio_referencia_em,"2026-08-15T19:00:00.000Z");
assert.equal(estimatedLiveMatchMinute(advanced,"2026-08-15T19:07:10Z"),"7");

const irregularSyncs=["19:00:43","19:01:51","19:02:37","19:03:42"].reduce((clock,time)=>
  evolveEstimatedLiveClock(
    {id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},
    {...clock,status:"em_andamento"},
    {},
    `2026-08-15T${time}Z`,
  ),
  firstObservation,
);
assert.equal(irregularSyncs.minuto_estimado,0);
assert.equal(irregularSyncs.relogio_referencia_em,"2026-08-15T19:00:00.000Z");
assert.equal(estimatedLiveMatchMinute(irregularSyncs,"2026-08-15T19:05:00Z"),"5");

const calibrated=evolveEstimatedLiveClock({id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},{...advanced,status:"em_andamento"},{goals:[{minute:12,injuryTime:null}]},"2026-08-15T19:08:00Z");
assert.equal(calibrated.minuto_estimado,12);
assert.equal(calibrated.relogio_referencia_em,"2026-08-15T19:08:00.000Z");

const goalWithoutMinute=evolveEstimatedLiveClock({id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},{...advanced,status:"em_andamento"},{goals:[{minute:null}]},"2026-08-15T19:08:00Z");
assert.equal(goalWithoutMinute.minuto_estimado,0);
assert.equal(goalWithoutMinute.relogio_referencia_em,"2026-08-15T19:00:00.000Z");
assert.deepEqual(goalMinuteDiagnostics({goals:[{minute:12},{minute:null}]}),{reported:2,withMinute:1});

const interval=evolveEstimatedLiveClock({id_jogo:1,status:"intervalo",minuto:null,acrescimos:null},{...calibrated,status:"em_andamento"},{},"2026-08-15T19:45:00Z");
assert.equal(interval.periodo_estimado,"primeiro_tempo");
assert.equal(interval.relogio_referencia_em,null);

const secondHalf=evolveEstimatedLiveClock({id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},{...interval,status:"intervalo"},{},"2026-08-15T20:00:00Z");
assert.equal(secondHalf.minuto_estimado,45);
assert.equal(secondHalf.periodo_estimado,"segundo_tempo");
assert.equal(secondHalf.relogio_referencia_em,"2026-08-15T20:00:00.000Z");

const capped=evolveEstimatedLiveClock({id_jogo:1,status:"em_andamento",minuto:null,acrescimos:null},{...secondHalf,minuto_estimado:105,relogio_referencia_em:"2026-08-15T20:00:00Z",status:"em_andamento"},{},"2026-08-15T20:01:00Z");
assert.equal(capped.minuto_estimado,106);
assert.equal(liveMatchMinute(capped),"");

const finished=evolveEstimatedLiveClock({id_jogo:1,status:"encerrado"},capped,{},"2026-08-15T20:02:00Z");
assert.equal(finished.minuto_estimado,null);
assert.equal(finished.periodo_estimado,null);

const normalized=normalizeMatch({
  id: 1,
  matchday: 23,
  utcDate: "2026-08-15T19:30:00Z",
  status: "IN_PLAY",
  minute: 45,
  injuryTime: 2,
  homeTeam: { name: "Fluminense" },
  awayTeam: { name: "Palmeiras" },
  score: { fullTime: { home: 1, away: 1 } },
});

assert.equal(normalized.minuto,45);
assert.equal(normalized.acrescimos,2);
assert.equal(normalized.status,"em_andamento");

console.log("Relógio oficial das partidas ao vivo verificado com sucesso.");
