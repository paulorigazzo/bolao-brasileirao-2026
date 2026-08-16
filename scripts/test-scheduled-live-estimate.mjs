import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isScheduledLiveEstimate, scheduledLiveLabel, scheduledLiveMinute } from "../js/scheduled-live-estimate.js";

const kickoff="2026-08-16T19:00:00Z";
const game=(status="agendado",inicio=kickoff)=>({status,inicio});

assert.equal(isScheduledLiveEstimate(game(),"2026-08-16T18:59:59Z"),false);
assert.equal(isScheduledLiveEstimate(game(),"2026-08-16T19:00:00Z"),true);
assert.equal(scheduledLiveMinute(game(),"2026-08-16T19:00:00Z"),"1");
assert.equal(scheduledLiveMinute(game(),"2026-08-16T19:44:10Z"),"45");
assert.equal(scheduledLiveMinute(game(),"2026-08-16T19:49:10Z"),"45+5");
assert.equal(scheduledLiveMinute(game(),"2026-08-16T20:00:10Z"),"");
assert.equal(scheduledLiveLabel(game(),"2026-08-16T19:49:10Z"),"AO VIVO • ~45+5'");
assert.equal(scheduledLiveLabel(game(),"2026-08-16T20:00:10Z"),"AO VIVO • ESTIMADO");
assert.equal(isScheduledLiveEstimate(game("em_andamento"),"2026-08-16T19:05:00Z"),false);
assert.equal(isScheduledLiveEstimate(game("intervalo"),"2026-08-16T19:50:00Z"),false);
assert.equal(isScheduledLiveEstimate(game("adiado"),"2026-08-16T19:05:00Z"),false);
assert.equal(isScheduledLiveEstimate(game("cancelado"),"2026-08-16T19:05:00Z"),false);
assert.equal(isScheduledLiveEstimate(game("agendado","inválido"),"2026-08-16T19:05:00Z"),false);
assert.equal(isScheduledLiveEstimate(game(),"2026-08-16T23:00:01Z"),false);

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
assert.match(app,/estimatedLive\?"– × –":pick\?/);

console.log("Início estimado pelo horário programado verificado com sucesso.");
