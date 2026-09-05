import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {base64UrlToUint8Array, subscriptionRow, supportsWebPush} from "../js/web-push.js";

const root=new URL("../",import.meta.url);
const [html,app,worker,migration,rollback,sender,config]=await Promise.all([
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("js/app.js",root),"utf8"),
  readFile(new URL("service-worker.js",root),"utf8"),
  readFile(new URL("supabase/migrations/20260905034102_add_manual_web_push_subscriptions.sql",root),"utf8"),
  readFile(new URL("supabase/rollback/rollback_add_manual_web_push_subscriptions.sql",root),"utf8"),
  readFile(new URL("netlify/functions/enviar-lembrete-palpites.mjs",root),"utf8"),
  readFile(new URL("netlify/functions/configuracao-web-push.mjs",root),"utf8"),
]);

assert.equal(supportsWebPush({isSecureContext:true,navigator:{serviceWorker:{}},PushManager:{},Notification:{}}),true);
assert.equal(supportsWebPush({isSecureContext:false,navigator:{serviceWorker:{}},PushManager:{},Notification:{}}),false);
assert.deepEqual([...base64UrlToUint8Array("AQID")],[1,2,3]);
const row=subscriptionRow({toJSON:()=>({endpoint:"https://push.example/one",keys:{p256dh:"public-key-value-long-enough",auth:"auth-value"}})},"user-1");
assert.equal(row.user_id,"user-1");
assert.equal(row.ativo,true);
assert.throws(()=>subscriptionRow({toJSON:()=>({})},"user-1"));

assert.match(html,/id="enablePushBtn"/);
assert.match(html,/id="adminPushReminderAction"/);
assert.match(app,/Notification\.requestPermission\(\)/);
assert.match(app,/requestAdminPush\("preview"\)/);
assert.match(worker,/notificationclick/);
assert.match(worker,/clients\.openWindow/);
assert.match(migration,/alter table public\.push_subscriptions enable row level security/i);
for(const operation of ["select","insert","update","delete"]) assert.match(migration,new RegExp(`for ${operation}[\\s\\S]*auth\\.uid\\(\\).*user_id`,"i"));
assert.doesNotMatch(migration,/(?:alter|update|delete|insert into)\s+public\.(?:palpites|jogos|participantes|liga_membros)/i);
assert.match(rollback,/drop table if exists public\.push_subscriptions/i);
assert.match(sender,/requireAdmin\(request\)/);
assert.match(sender,/mode==="preview"/);
assert.match(sender,/statusCode===404 \|\| error\?\.statusCode===410/);
assert.match(sender,/\.from\("palpites"\)/);
assert.match(sender,/\.eq\("status","ativo"\)/);
assert.match(sender,/\.from\("participantes_autorizados"\)[\s\S]*\.eq\("status","approved"\)/);
assert.match(config,/Participante não autorizado/);
assert.doesNotMatch(sender,/celular|whatsapp/i);

console.log("Web Push manual verificado: opt-in por aparelho, RLS, seleção no servidor, expiração e preservação competitiva.");
