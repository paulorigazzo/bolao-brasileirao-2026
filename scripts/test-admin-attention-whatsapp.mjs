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
const styles=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");
assert.match(app,/function adminWhatsAppButton\(/);
assert.match(app,/resolveAttentionWhatsAppParticipant\(item,state\.authorizedParticipants\)/);
assert.match(app,/data-admin-participant-detail=/);
assert.match(app,/adminAttentionContent[\s\S]*data-participant-whatsapp/);
assert.match(styles,/#adminAttentionCard button\.admin-pending-detail\{[\s\S]*?min-height:0;[\s\S]*?overflow:visible;[\s\S]*?border-radius:0;[\s\S]*?transform:none;[\s\S]*?\}/);

console.log("WhatsApp individual e frame de detalhes na Situação da Rodada verificados com sucesso.");
