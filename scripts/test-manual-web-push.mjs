import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {base64UrlToUint8Array, subscriptionRow, supportsWebPush} from "../js/web-push.js";
import {isPushActivationPromptPreview,nextPushActivationPromptDate,PUSH_ACTIVATION_PROMPT_SNOOZE_MS,shouldOfferPushActivation} from "../js/push-activation-prompt.js";
import {buildReminderParticipants,openReminderGames,reminderMessage} from "../netlify/functions/_web-push-reminder.mjs";

const root=new URL("../",import.meta.url);
const [html,app,worker,migration,rollback,sender,config]=await Promise.all([
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("js/app.js",root),"utf8"),
  readFile(new URL("service-worker.js",root),"utf8"),
  readFile(new URL("supabase/migrations/20260905040628_add_manual_web_push_subscriptions.sql",root),"utf8"),
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
assert.match(html,/id="pushActivationPrompt"[\s\S]*id="pushActivationEnable"[\s\S]*id="pushActivationLater"/);
assert.match(html,/id="adminPushReminderAction"/);
assert.match(html,/id="adminPushReminderModal"/);
assert.match(html,/id="adminPushSelectAll"/);
assert.match(app,/Notification\.requestPermission\(\)/);
assert.match(app,/pushSubscriptionStatusKnown/);
assert.match(app,/schedulePushActivationPrompt\(\)/);
assert.match(app,/pushActivationPrompt[\s\S]*dismissPushActivationPrompt/);
assert.match(app,/requestAdminPush\("preview"\)/);
assert.match(app,/selectedUserIds,audienceVersion/);
assert.match(worker,/notificationclick/);
assert.match(worker,/clients\.openWindow/);
assert.match(migration,/alter table public\.push_subscriptions enable row level security/i);
for(const operation of ["select","insert","update","delete"]) assert.match(migration,new RegExp(`for ${operation}[\\s\\S]*auth\\.uid\\(\\).*user_id`,"i"));
assert.doesNotMatch(migration,/(?:alter|update|delete|insert into)\s+public\.(?:palpites|jogos|participantes|liga_membros)/i);
assert.match(rollback,/drop table if exists public\.push_subscriptions/i);
assert.match(sender,/requireAdmin\(request\)/);
assert.match(sender,/mode==="preview"/);
assert.match(sender,/code:"audience_changed"/);
assert.match(sender,/selectedUserIds/);
assert.match(sender,/statusCode===404 \|\| error\?\.statusCode===410/);
assert.match(sender,/\.from\("palpites"\)/);
assert.match(sender,/\.eq\("status","ativo"\)/);
assert.match(sender,/\.from\("participantes_autorizados"\)[\s\S]*\.eq\("status","approved"\)/);
assert.match(config,/Participante não autorizado/);
assert.doesNotMatch(sender,/celular|whatsapp/i);

const promptBase={supported:true,permission:"default",activeDeviceCount:0,dismissedUntil:0,now:1000,homeVisible:true,shownThisSession:false};
assert.equal(shouldOfferPushActivation(promptBase),true);
assert.equal(shouldOfferPushActivation({...promptBase,permission:"granted"}),true,"permissão sem assinatura pode ser reparada pelo convite");
assert.equal(shouldOfferPushActivation({...promptBase,permission:"denied"}),false);
assert.equal(shouldOfferPushActivation({...promptBase,activeDeviceCount:1}),false);
assert.equal(shouldOfferPushActivation({...promptBase,dismissedUntil:1001}),false);
assert.equal(shouldOfferPushActivation({...promptBase,homeVisible:false}),false);
assert.equal(shouldOfferPushActivation({...promptBase,shownThisSession:true}),false);
assert.equal(nextPushActivationPromptDate(1000),1000+PUSH_ACTIVATION_PROMPT_SNOOZE_MS);
assert.equal(isPushActivationPromptPreview({hostname:"deploy-preview-214--bolaorigazzo2026.netlify.app",search:"?pushActivationPreview=1"}),true);
assert.equal(isPushActivationPromptPreview({hostname:"localhost",search:"?pushActivationPreview=1"}),true);
assert.equal(isPushActivationPromptPreview({hostname:"bolaorigazzo2026.netlify.app",search:"?pushActivationPreview=1"}),false);

const now=Date.parse("2026-09-08T18:00:00.000Z");
const games=[
  {id_jogo:1,inicio:"2026-09-08T17:00:00.000Z",status:"agendado"},
  {id_jogo:2,inicio:"2026-09-08T20:00:00.000Z",status:"agendado"},
  {id_jogo:3,inicio:"2026-09-09T00:00:00.000Z",status:"adiado"},
  {id_jogo:4,inicio:"2026-09-09T01:00:00.000Z",status:"agendado"},
];
const openGames=openReminderGames(games,now);
assert.deepEqual(openGames.map(game=>game.id_jogo),[2,4],"jogos posteriores continuam disponíveis após o primeiro fechamento");
const participants=buildReminderParticipants({
  profiles:[
    {user_id:"user-1",nome:"Gabriel Silva",email:"gabriel@example.com"},
    {user_id:"user-2",nome:"Ana",email:"ana@example.com"},
    {user_id:"user-3",nome:"Bia",email:"bia@example.com"},
  ],
  openGames,
  picks:[{user_id:"user-1",id_jogo:2},{user_id:"user-2",id_jogo:2},{user_id:"user-2",id_jogo:4}],
  subscriptions:[{id:"sub-1",user_id:"user-1"},{id:"sub-2",user_id:"user-1"}],
  round:27,
});
assert.deepEqual(participants.map(item=>item.userId),["user-3","user-1"]);
assert.equal(participants.find(item=>item.userId==="user-1").pendingOpenPicks,1);
assert.equal(participants.find(item=>item.userId==="user-1").eligibleDevices,2);
assert.match(participants.find(item=>item.userId==="user-1").message,/Olá, Gabriel! Você ainda tem 1 palpite disponível na Rodada 27\./);
assert.equal(participants.find(item=>item.userId==="user-3").eligibleDevices,0);
assert.match(reminderMessage({name:"Ana Souza",pendingOpenPicks:2,round:28,nextCloseAt:"2026-09-08T19:30:00.000Z"}),/2 palpites disponíveis/);

console.log("Web Push manual verificado: opt-in por aparelho, RLS, seleção no servidor, expiração e preservação competitiva.");
