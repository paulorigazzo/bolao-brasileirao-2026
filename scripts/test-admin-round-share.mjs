import assert from "node:assert/strict";
import { buildAdminRoundSummary } from "../js/admin-round-share.js";

const ranking = [
  { name: "José", total: 32 },
  { name: "Paulo", total: 26 },
  { name: "Romis", total: 26 },
  { name: "Ana", total: 20 },
];
const facts = [
  { key: "round-winner", title: "José venceu a rodada", detail: "24 pontos." },
  { key: "biggest-climb", title: "Paulo teve a maior subida", detail: "2 posições." },
  { key: "exact-leader", title: "Ana liderou nos placares exatos", detail: "2 placares exatos." },
  { key: "ignored", title: "Não deve aparecer", detail: "Fato excedente." },
];

const complete = buildAdminRoundSummary({ round: 20, lifecycle: { total: 10, finished: 10 }, facts, ranking });
assert.equal(complete.available, true);
assert.equal(complete.isProvisional, false);
assert.match(complete.text, /José venceu a rodada — 24 pontos\./);
assert.match(complete.text, /3º Romis — 26 pontos/);
assert.doesNotMatch(complete.text, /4º Ana/);
assert.doesNotMatch(complete.text, /Não deve aparecer/);

const partial = buildAdminRoundSummary({ round: 21, lifecycle: { total: 10, finished: 6, postponed: 4, live: 0, future: 0 }, facts, ranking });
assert.equal(partial.available, true);
assert.equal(partial.isProvisional, true);
assert.match(partial.text, /José lidera a rodada até agora/);
assert.match(partial.text, /6 de 10 jogos foram concluídos/);
assert.match(partial.text, /4 jogos adiados/);

assert.equal(buildAdminRoundSummary({ round: 22, lifecycle: { total: 10, finished: 0, future: 10 }, facts, ranking }).available, false);
assert.equal(buildAdminRoundSummary({ round: 21, lifecycle: { total: 10, finished: 6, postponed: 3, live: 1 }, facts, ranking }).reason, "live");

console.log("Resumo administrativo da rodada verificado com sucesso.");
