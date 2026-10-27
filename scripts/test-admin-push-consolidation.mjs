import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {adminConsolidationPayload,runAdminConsolidations} from '../netlify/functions/_admin-push-consolidation.mjs';
import {runAutomaticRoundPush,pushFailureResult} from '../netlify/functions/_automatic-round-push.mjs';
const content={participants:8,accepted:10,failed:1,attempted:11,ttl:3600,endpoint:'https://push.example.test/adm',p256dh:'test',auth:'test'};
const job={id:'admin-job',tipo:'2h',rodada:33};
const payload=adminConsolidationPayload(job,content,2026);
assert.match(payload.title,/Lembrete de 2h · Rodada 33/);
assert.match(payload.body,/8 participantes.*10 aparelhos.*Falhas em 1 aparelho/);
assert.equal(payload.url,'/?notificacao=adm-disparo&rodada=33&tipo=2h');
assert.equal(payload.tag,'adm-disparo-2026-33-2h');
assert.notEqual(payload.tag,adminConsolidationPayload({...job,tipo:'12h'},content,2026).tag);
assert.match(adminConsolidationPayload({...job,tipo:'summary'},{...content,participants:1,accepted:1,failed:0},2026).body,/1 participante.*1 aparelho\. Confira/);
assert.throws(()=>adminConsolidationPayload({...job,tipo:'unknown'},content,2026));
assert.throws(()=>adminConsolidationPayload(job,{...content,accepted:NaN},2026));
const makeRpc=({jobs=[job],data=content,ack=true,fail}={})=>{
  const calls=[];
  const rpc=async(name,args)=>{
    calls.push([name,args]);if(name===fail)throw new Error('PRIVATE-ERROR');
    return name==='reservar_consolidados_push_adm'?jobs:name==='obter_conteudo_consolidado_adm'?data:ack;
  };
  return {rpc,calls};
};
let fixture=makeRpc(),sent=[];
let result=await runAdminConsolidations({...fixture,send:async(...args)=>sent.push(args),worker:'worker',season:2026,classifyFailure:pushFailureResult});
assert.equal(result.accepted,1);assert.equal(sent.length,1);assert.equal(sent[0][2].timeout,2000);
assert.equal(fixture.calls.at(-1)[1].p_resultado,'sent');assert.equal(fixture.calls[0][1].p_limite,100);
for(const [code,expected] of [[410,'expired'],[404,'expired'],[503,'retry'],[429,'retry'],[400,'failed']]){
  fixture=makeRpc();await runAdminConsolidations({...fixture,send:async()=>{throw {statusCode:code};},worker:'worker',season:2026,classifyFailure:pushFailureResult});
  assert.equal(fixture.calls.at(-1)[1].p_resultado,expected);
}
for(const data of [null,{...content,ttl:0}]){
  fixture=makeRpc({data});sent=[];
  await runAdminConsolidations({...fixture,send:async()=>sent.push(1),worker:'worker',season:2026,classifyFailure:pushFailureResult});
  assert.equal(sent.length,0);assert.equal(fixture.calls.at(-1)[1].p_resultado,'skipped');
}
fixture=makeRpc({ack:false});
result=await runAdminConsolidations({...fixture,send:async()=>{},worker:'worker',season:2026,classifyFailure:pushFailureResult});
assert.equal(result.deferred,1,'não confirma reserva perdida');
fixture=makeRpc({fail:'reservar_consolidados_push_adm'});
assert.deepEqual(await runAdminConsolidations({...fixture}),{unavailable:true});
// Falha do controle administrativo não interrompe os envios aos participantes.
const calls=[];sent=[];
const client={async rpc(name,args){calls.push([name,args]);
  if(name==='reservar_consolidados_push_adm')return {error:{message:'PRIVATE-ERROR'}};
  return {data:name==='reservar_push_automaticos'?[{id:'participant',tipo:'summary',rodada:33}]:name==='obter_conteudo_push_automatico'?{...content,points:43,exact:2}:true};
}};
result=await runAutomaticRoundPush({client,send:async(...args)=>sent.push(args),worker:'worker',season:2026,
  now:Date.parse('2026-10-27T20:00:00Z'),deploymentContext:'production',env:()=> 'true'});
assert.equal(result.accepted,1);assert.equal(sent.length,1);assert.deepEqual(result.admin,{unavailable:true});
assert.equal(calls.find(([name])=>name==='concluir_push_automatico_com_adm')[1].p_tentado,true);
assert.doesNotMatch(JSON.stringify(result),/PRIVATE|endpoint|test/);
// Destino real do app: valida ADM antes de navegar e novamente antes de abrir o modal.
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function openPushNotificationTarget('),app.indexOf('function navigateTo('));
let allowed=true,onReady;const navigations=[],opens=[];
const context={URLSearchParams,Number,isAdminUser:()=>allowed,$:()=>({}),navigateTo:(tab,options)=>{navigations.push(tab);onReady=options.onReady;},
  adminNotificationsController:{open:(trigger,filters)=>opens.push(filters)}};
vm.createContext(context);vm.runInContext(source,context);
context.openPushNotificationTarget(payload.url.slice(1));assert.deepEqual(navigations,['admin']);assert.equal(opens.length,0);
onReady();assert.equal(opens[0].round,33);assert.equal(opens[0].type,'2h');
allowed=false;context.openPushNotificationTarget(payload.url.slice(1));assert.equal(navigations.length,1);
allowed=true;context.openPushNotificationTarget(payload.url.slice(1));allowed=false;onReady();assert.equal(opens.length,1,'perda de permissão durante transição bloqueia modal');
allowed=true;
for(const query of ['?notificacao=adm-disparo&rodada=39&tipo=2h','?notificacao=adm-disparo&rodada=33&tipo=unknown']){
  context.openPushNotificationTarget(query);
}
assert.equal(navigations.length,2,'parâmetros inválidos não abrem ADM');
assert(app.indexOf('openPushNotificationTarget();')>app.indexOf('await loadData();'),'destino é resolvido após login e carga de autorização');
console.log('Consolidados ADM: transporte simulado, falhas, independência, contagens, tags e destino autorizado após login aprovados.');
