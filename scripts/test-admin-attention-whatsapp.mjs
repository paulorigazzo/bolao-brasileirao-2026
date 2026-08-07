import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveAttentionWhatsAppParticipant } from "../js/admin-whatsapp.js";

const authorized=[
  {id:"participant-1",email:"daniela@example.com",celular:"16999999999"},
  {id:"participant-2",email:"andre@example.com",celular:null},
];

assert.equal(resolveAttentionWhatsAppParticipant({email:" DANIELA@EXAMPLE.COM "},authorized)?.id,"participant-1");
assert.equal(resolveAttentionWhatsAppParticipant({email:"missing@example.com"},authorized),null);
assert.equal(resolveAttentionWhatsAppParticipant({},authorized),null);

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
assert.match(app,/function adminWhatsAppButton\(/);
assert.match(app,/resolveAttentionWhatsAppParticipant\(item,state\.authorizedParticipants\)/);
assert.match(app,/data-admin-participant-detail=/);
assert.match(app,/adminAttentionContent[\s\S]*data-participant-whatsapp/);

console.log("WhatsApp individual na Situação da Rodada verificado com sucesso.");
