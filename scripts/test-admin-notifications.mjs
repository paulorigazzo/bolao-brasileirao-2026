import assert from 'node:assert/strict';
import {notificationFilters,nextReminderWindow,buildAdminNotifications,readNotificationPages} from '../netlify/functions/_admin-notifications.mjs';
import {createAdminNotificationsHandler,loadAdminNotifications} from '../netlify/functions/acompanhamento-notificacoes.mjs';
import {adminNotificationsContent,createAdminNotificationsController} from '../js/admin-notifications.js';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const attention=html.slice(html.indexOf('<article id="adminAttentionCard"'),html.indexOf('<article id="adminRoundCard"'));
const actionGroup=attention.slice(attention.indexOf('class="admin-reminder-actions'),attention.indexOf('class="admin-pending-toolbar'));
for(const id of ['adminAttentionAction','adminPushReminderAction','adminNotificationsOpen']){
  assert.match(actionGroup,new RegExp(`id="${id}"`),'ações reunidas no topo, antes dos filtros');
  assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,'mantém um único botão por ação');
}
assert.match(actionGroup,/id="adminAttentionAction" class="primary hidden"/);
assert.match(actionGroup,/Acompanhar notificações/);
assert.match(html,/<label>Destinatário<select id="adminNotificationsAudience"><option value="participants">Participantes<\/option><option value="admins">Administradores<\/option>/);
assert.doesNotMatch(attention.slice(attention.indexOf('class="admin-card-footer"')),/id="admin(?:AttentionAction|PushReminderAction|NotificationsOpen)"/);
const now=Date.parse('2026-10-27T18:24:00Z');
const filters=notificationFilters(new URLSearchParams());
assert.deepEqual(filters,{audience:'participants',round:'all',type:'all',status:'all',page:1});
assert.equal(notificationFilters(new URLSearchParams('audience=admins')).audience,'admins');
for(const query of ['round=0','round=39','round=1 OR 1=1','type=activation','status=control','page=0','page=1.5','page=NaN','audience=all','audience=push_subscriptions','audience=admins OR 1=1'])assert.equal(notificationFilters(new URLSearchParams(query)),null,query);
const games=[{rodada:33,inicio:'2026-10-28T22:30:00Z',status:'agendado'},{rodada:33,inicio:'2026-10-29T01:00:00Z',status:'agendado'},{rodada:21,inicio:'2026-07-29T00:00:00Z',status:'adiado'}];
assert.deepEqual(nextReminderWindow(games,now),{round:33,type:'12h',scheduledAt:'2026-10-28T10:30:00.000Z',inWindow:false});
assert.equal(nextReminderWindow(games,Date.parse('2026-10-28T10:40:00Z')).inWindow,true);
assert.equal(nextReminderWindow(games,Date.parse('2026-10-28T10:46:00Z')).type,'2h');
assert.equal(nextReminderWindow(games,Date.parse('2026-10-28T20:46:00Z')),null);
const row=(extra={})=>({id:'private-job-id',rodada:33,tipo:'12h',estado:'sent',tentativas:1,subscription_id:'private-subscription-id',subscription:{user_id:'private-user-id'},criado_em:'2026-10-28T10:30:00Z',atualizado_em:'2026-10-28T10:30:00Z',endpoint:'PRIVATE-ENDPOINT',auth:'PRIVATE-AUTH',p256dh:'PRIVATE-KEY',...extra});
const records=[row(),row({id:'second',subscription_id:'second-device',estado:'failed',tentativas:3}),{tipo:'activation',rodada:0,criado_em:'2026-10-27T18:20:07Z',atualizado_em:'2026-10-27T18:20:07Z'},{tipo:'baseline',rodada:32}];
const profiles=[{user_id:'private-user-id',nome:'Ana <img src=x onerror=alert(1)>'}];
let model=buildAdminNotifications({records,profiles,games,filters,now,season:2026});
assert.equal(model.rows.length,1);assert.equal(model.rows[0].deviceCount,2);assert.equal(model.rows[0].attempts,4);assert.equal(model.rows[0].status,'mixed');
assert.deepEqual(model.summary,{accepted:1,waiting:0,failed:1});assert.equal(model.baselineRounds,1);
assert.equal(buildAdminNotifications({records,profiles,games,filters:{...filters,status:'failed'},now}).total,1,'filtro por aparelho inclui grupo parcial');
for(const secret of ['private-job-id','private-subscription-id','private-user-id','PRIVATE-ENDPOINT','PRIVATE-AUTH','PRIVATE-KEY'])assert.equal(JSON.stringify(model).includes(secret),false,secret);
const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const markup=adminNotificationsContent(model,escape);assert.match(markup,/&lt;img/);assert.doesNotMatch(markup,/<img/);assert.match(markup,/Ativação e baseline/);
assert.match(markup,/Aceitos pelo serviço/);assert.doesNotMatch(markup,/entregue|lido/i);
const many=Array.from({length:1207},(_,index)=>row({id:String(index),subscription_id:String(index),subscription:{user_id:`u-${index}`}}));
let pageCalls=0;
const all=await readNotificationPages(()=>({async range(start,end){pageCalls++;return {data:many.slice(start,end+1)};}}));
assert.equal(all.length,1207);assert.equal(pageCalls,3,'paginação ultrapassa 1000 registros');
model=buildAdminNotifications({records:all,games,profiles:[],filters:{...filters,page:2},now});
assert.equal(model.total,1207);assert.equal(model.rows.length,25);assert.equal(model.pages,49);assert.equal(model.page,2);
model=buildAdminNotifications({filters,games:[],season:2026});assert.equal(model.total,0);assert.equal(model.nextReminder,null);assert.equal(model.pages,1);
// Fonte administrativa: somente trabalhos por aparelho contam, nunca o snapshot do evento.
const adminFilters={...filters,audience:'admins'};
const adminRecords=[row({subscription:{user_id:'same-admin'},atualizado_em:'2026-10-28T10:31:00Z'}),
  row({subscription:{user_id:'same-admin'},subscription_id:'device-2',estado:'failed',tentativas:3}),
  row({id:'pending',subscription:{user_id:'other-admin'},estado:'pending',proxima_tentativa:'2026-10-28T10:40:00Z'}),
  {tipo:'activation',rodada:0,criado_em:'2026-10-27T19:00:00Z',atualizado_em:'2026-10-30T00:00:00Z'},
  {tipo:'12h',rodada:33,estado:'control',subscription_id:null,aceitos:99999,participantes:99999,atualizado_em:'2026-10-30T00:00:00Z'},
  {tipo:'baseline',rodada:32,estado:'control'}];
const adminModel=buildAdminNotifications({records:adminRecords,profiles:[],games,filters:adminFilters,now,season:2026});
assert.equal(adminModel.audience,'admins');assert.equal(adminModel.total,2);
assert.deepEqual(adminModel.summary,{accepted:1,waiting:1,failed:1});
assert.equal(adminModel.rows[0].status,'mixed');assert.equal(adminModel.rows[0].deviceCount,2);
assert.equal(adminModel.rows[0].participant,'Administrador indisponível');
assert.equal(adminModel.lastMovement,'2026-10-28T10:31:00.000Z','controle não simula movimentação de envio');
assert.equal(adminModel.baselineRounds,0);assert.equal(adminModel.nextReminder,null);
assert.equal(adminModel.activationAt,'2026-10-27T19:00:00.000Z');
const adminMarkup=adminNotificationsContent(adminModel,escape);
const adminNamed=buildAdminNotifications({records:adminRecords,profiles:[{user_id:'same-admin',nome:'ADM <img src=x onerror=alert(1)>'}],games,filters:adminFilters,now,season:2026});
assert.match(adminNotificationsContent(adminNamed,escape),/&lt;img/);assert.doesNotMatch(adminNotificationsContent(adminNamed,escape),/<img/);
assert.match(adminMarkup,/Contagens da temporada para administradores/);
assert.match(adminMarkup,/Ativação dos consolidados ao ADM/);
assert.doesNotMatch(adminMarkup,/Próximo lembrete previsto|Janela atual de lembrete|rodadas antigas protegidas|99999/);
assert.match(markup,/Contagens da temporada para participantes/);
const adminEmpty=buildAdminNotifications({records:adminRecords.filter(row=>row.estado==='control'||row.tipo==='activation'),filters:adminFilters,now,season:2026});
assert.equal(adminEmpty.total,0);assert.equal(adminEmpty.lastMovement,null);
assert.deepEqual(adminEmpty.summary,{accepted:0,waiting:0,failed:0});
const adminMany=many.map(row=>({...row,estado:'pending'}));
const adminPage=buildAdminNotifications({records:adminMany,games,profiles:[],filters:{...adminFilters,page:2},now});
assert.equal(adminPage.total,1207);assert.equal(adminPage.rows.length,25);assert.equal(adminPage.page,2);
await assert.rejects(readNotificationPages(()=>({range:async()=>({error:{message:'PRIVATE-ERROR'}})})),/indisponível/);
let loads=0;
let handler=createAdminNotificationsHandler({authorize:async()=>({ok:false,status:403}),load:async()=>{loads++;}});
let response=await handler(new Request('https://test.example/?round=33'));assert.equal(response.status,403);assert.equal(loads,0);
assert.equal((await handler(new Request('https://test.example/?audience=admins'))).status,403);assert.equal(loads,0);
response=await handler(new Request('https://test.example/',{method:'POST'}));assert.equal(response.status,405);assert.equal(loads,0);
handler=createAdminNotificationsHandler({authorize:async()=>({ok:false,status:401}),load:async()=>{loads++;}});
assert.equal((await handler(new Request('https://test.example/'))).status,401);
assert.equal((await handler(new Request('https://test.example/?audience=admins'))).status,401);
handler=createAdminNotificationsHandler({authorize:async()=>({ok:true,supabase:{}}),load:async()=>{loads++;return {rows:[]};}});
response=await handler(new Request('https://test.example/?round=33'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(loads,1);
assert.equal((await handler(new Request('https://test.example/?status=control'))).status,400);assert.equal(loads,1);
assert.equal((await handler(new Request('https://test.example/?audience=invalid'))).status,400);assert.equal(loads,1);
handler=createAdminNotificationsHandler({authorize:async()=>({ok:true}),load:async()=>{throw new Error('PRIVATE-ERROR');}});
response=await handler(new Request('https://test.example/'));assert.equal(response.status,503);assert.equal((await response.text()).includes('PRIVATE-ERROR'),false);
// Exercita a consulta real com um cliente que oferece somente leitura e registra as colunas solicitadas.
const selected=[];
const client={from(table){const q={select(fields){selected.push([table,fields]);return q;},eq(){return q;},order(){return q;},abortSignal(){return q;},in(){return q;},then(resolve,reject){return Promise.resolve({data:profiles}).then(resolve,reject);},range(start,end){return Promise.resolve({data:(table==='push_automaticos'?many:games).slice(start,end+1)});}};return q;}};
model=await loadAdminNotifications(client,filters,now);assert.equal(model.total,1207);
assert.equal(selected.some(([,fields])=>/endpoint|p256dh|\bauth\b|email/.test(fields)),false,'não consulta chaves ou contatos');
// As duas fontes usam só leitura e ficam isoladas mesmo quando o usuário é o mesmo.
for(const audience of ['participants','admins']){
  const reads=[],selections=[],constraints=[];
  const audienceClient={from(table){reads.push(table);const q={
    select(fields){selections.push(fields);return q;},eq(field,value){constraints.push([table,field,value]);return q;},
    order(){return q;},abortSignal(){return q;},in(){return q;},
    then(resolve,reject){return Promise.resolve({data:profiles}).then(resolve,reject);},
    range(start,end){return Promise.resolve({data:({push_automaticos:many,push_consolidados_adm:adminMany,jogos:games}[table]||[]).slice(start,end+1)});}
  };return q;}};
  const data=await loadAdminNotifications(audienceClient,{...filters,audience,page:2},now);
  const expected=audience==='admins'?'push_consolidados_adm':'push_automaticos';
  assert.equal(data.audience,audience);assert.equal(data.total,1207);assert.equal(data.rows.length,25);
  assert.equal(data.summary.accepted,audience==='admins'?0:1207);
  assert.equal(data.summary.waiting,audience==='admins'?1207:0);
  assert.equal(reads.filter(table=>table===expected).length,3,'fonte selecionada passa de 1000 registros');
  assert(!reads.includes(audience==='admins'?'push_automaticos':'push_consolidados_adm'),'não lê a outra fonte');
  assert(constraints.some(([table,field,value])=>table===expected&&field==='temporada'&&value===2026));
  assert(!selections.some(fields=>/endpoint|p256dh|\bauth\b|email|evento_id|aceitos|participantes/.test(fields)),'não consulta chaves, contatos ou snapshot interno');
  for(const secret of ['private-job-id','private-subscription-id','PRIVATE-ENDPOINT','PRIVATE-AUTH','PRIVATE-KEY'])assert(!JSON.stringify(data).includes(secret));
}
// Modal: resposta após fechamento ou logout não deve reaparecer; abrir sem ADM não consulta.
const elements=new Map();let admin=true,user='one',fetches=0,resolveFetch,activeRound=33,lastUrl;
const doc={activeElement:null,body:{classList:{add(){},remove(){}}},querySelector:()=>null,addEventListener(){},getElementById(id){
 if(!elements.has(id)){const hidden=new Set(id==='adminNotificationsModal'?['hidden']:[]);elements.set(id,{value:'all',innerHTML:'',textContent:'',disabled:false,isConnected:true,classList:{add:x=>hidden.add(x),remove:x=>hidden.delete(x),contains:x=>hidden.has(x)},focus(){doc.activeElement=this;},handlers:{},addEventListener(type,callback){this.handlers[type]=callback;},querySelectorAll:()=>[]});}return elements.get(id);
}};
const ctrl=createAdminNotificationsController({document:doc,isAdmin:()=>admin,userId:()=>user,getToken:async()=>'synthetic',escapeHtml:escape,getCurrentRound:()=>activeRound,fetchImpl:async(url)=>{lastUrl=url;fetches++;return new Promise(resolve=>{resolveFetch=resolve;});}});
ctrl.open();await new Promise(resolve=>setImmediate(resolve));assert.equal(fetches,1);assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('round'),'33');assert.equal(elements.get('adminNotificationsType').value,'all');assert.equal(elements.get('adminNotificationsState').value,'all');ctrl.close();resolveFetch({ok:true,json:async()=>({ok:true,...model})});await new Promise(resolve=>setImmediate(resolve));assert.equal(elements.get('adminNotificationsContent').innerHTML,'');
admin=false;ctrl.open();await new Promise(resolve=>setImmediate(resolve));assert.equal(fetches,1);
admin=true;activeRound=34;ctrl.open();await new Promise(resolve=>setImmediate(resolve));assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('round'),'34');user='other';resolveFetch({ok:true,json:async()=>({ok:true,...model})});await new Promise(resolve=>setImmediate(resolve));assert.equal(elements.get('adminNotificationsContent').innerHTML,'');assert.equal(elements.get('adminNotificationsModal').classList.contains('hidden'),true);
ctrl.open(null,{round:33,type:'2h'});await new Promise(resolve=>setImmediate(resolve));
assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('round'),'33');
assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('type'),'2h');
assert.equal(elements.get('adminNotificationsState').value,'all');
resolveFetch({ok:true,json:async()=>({ok:true,...model})});await new Promise(resolve=>setImmediate(resolve));
assert.equal(elements.get('adminNotificationsRound').value,'33');
assert.equal(elements.get('adminNotificationsType').value,'2h');ctrl.close();
ctrl.open();await new Promise(resolve=>setImmediate(resolve));
assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('round'),'34');
assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('type'),'all','abertura manual não herda filtro do aviso');
ctrl.close();resolveFetch({ok:true,json:async()=>({ok:true,...model})});
// Troca de público volta à página 1, mantém demais filtros e ignora a resposta antiga.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
ctrl.open(null,{round:33,type:'2h'});await tick();const oldFirst=resolveFetch;
elements.get('adminNotificationsState').value='failed';
elements.get('adminNotificationsContent').handlers.click({target:{closest:()=>({disabled:false,dataset:{adminNotificationsPage:'2'}})}});
await tick();const oldPage=resolveFetch;
assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('page'),'2');
elements.get('adminNotificationsAudience').value='admins';elements.get('adminNotificationsAudience').handlers.change();await tick();
const selectedFilters=new URL(lastUrl,'https://example.test').searchParams;
assert.equal(selectedFilters.get('audience'),'admins');assert.equal(selectedFilters.get('page'),'1');
assert.equal(selectedFilters.get('round'),'33');assert.equal(selectedFilters.get('type'),'2h');
assert.equal(selectedFilters.get('status'),'failed');
resolveFetch({ok:true,json:async()=>({ok:true,...adminModel})});await tick();
const currentAdminMarkup=elements.get('adminNotificationsContent').innerHTML;assert.match(currentAdminMarkup,/para administradores/);
oldPage({ok:true,json:async()=>({ok:true,...model,page:2})});oldFirst({ok:true,json:async()=>({ok:true,...model})});await tick();
assert.equal(elements.get('adminNotificationsContent').innerHTML,currentAdminMarkup,'resposta de participantes não sobrescreve administradores');
ctrl.close();ctrl.open();await tick();assert.equal(new URL(lastUrl,'https://example.test').searchParams.get('audience'),'participants');
ctrl.close();resolveFetch({ok:true,json:async()=>({ok:true,...model})});await tick();
console.log('Acompanhamento ADM: somente leitura, autorização, privacidade, paginação >1000, filtros, agrupamento, agenda, XSS e respostas atrasadas aprovados.');
