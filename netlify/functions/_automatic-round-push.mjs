import webpush from "web-push";
import {randomUUID} from "node:crypto";
import {serviceClient} from "./_api-helpers.mjs";
import {SEASON_YEAR} from "./_constants.mjs";
import {reminderMessage} from "./_web-push-reminder.mjs";
import {runAdminConsolidations} from "./_admin-push-consolidation.mjs";

export function automaticPushDue(now=Date.now(),env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name],deploymentContext){
  return deploymentContext==="production" && env("AUTOMATIC_ROUND_PUSH_ENABLED")==="true"
    && new Date(now).getUTCMinutes()%5===0;
}

export function automaticPushPayload(job,content,season=SEASON_YEAR){
  const round=Number(job.rodada);
  if(job.tipo==="summary"){
    const points=Number(content.points),exact=Number(content.exact);
    if(!Number.isInteger(points)||points<0||!Number.isInteger(exact)||exact<0) throw new Error("Resumo inválido.");
    return {title:`Rodada ${round} encerrada!`,
      body:`Você fez ${points} ${points===1?'ponto':'pontos'} e acertou ${exact} ${exact===1?'placar exato':'placares exatos'}. Confira seu resultado e sua evolução no app do Bolão.`,
      tag:`resumo-${season}-${round}`,url:`/?rodada=${round}&notificacao=resumo`};
  }
  return {title:`Palpites pendentes • Rodada ${round}`,
    body:reminderMessage({...content,round}),
    tag:`palpites-${season}-${round}`,url:`/?rodada=${round}`};
}

export function pushFailureResult(error){
  const code=Number(error?.statusCode);
  if(code===404||code===410) return "expired";
  return !code||code===408||code===429||code>=500?"retry":"failed";
}

export async function runAutomaticRoundPush({now=Date.now(),env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
  client,send,worker=randomUUID(),season=SEASON_YEAR,deploymentContext}={}){
  if(!automaticPushDue(now,env,deploymentContext)) return {enabled:false};
  const supabase=client||serviceClient();
  const rpc=async(name,args)=>{
    const request=supabase.rpc(name,args);
    const {data,error}=await (request.abortSignal?request.abortSignal(AbortSignal.timeout(1500)):request);
    // Não propagar mensagens do provedor, chaves ou destinatários aos logs da rotina.
    if(error) throw new Error(`Falha no processamento Web Push (${name}).`);
    return data;
  };
  if(!send){
    const value=name=>{const found=env(name);if(!found)throw new Error("Configuração Web Push incompleta.");return found;};
    webpush.setVapidDetails(value("VAPID_SUBJECT"),value("VAPID_PUBLIC_KEY"),value("VAPID_PRIVATE_KEY"));
    send=(subscription,payload,options)=>webpush.sendNotification(subscription,payload,options);
  }
  await rpc("preparar_push_automaticos_com_adm",{p_temporada:season});
  const jobs=await rpc("reservar_push_automaticos",{p_temporada:season,p_worker:worker,p_limite:100})||[];
  // Limite menor nas RPCs administrativas preserva o orçamento da função agendada.
  const adminRpc=async(name,args)=>{
    const request=supabase.rpc(name,args);
    const {data,error}=await (request.abortSignal?request.abortSignal(AbortSignal.timeout(1000)):request);
    if(error)throw new Error('Consolidado administrativo indisponível.');
    return data;
  };
  const adminTask=runAdminConsolidations({rpc:adminRpc,send,worker,season,classifyFailure:pushFailureResult});
  const results=await Promise.allSettled(jobs.map(async job=>{
    const content=await rpc("obter_conteudo_push_automatico",{p_id:job.id,p_worker:worker});
    let result="skipped",attempted=false;
    if(content?.deferUntil) result="defer";
    else if(content && Number(content.ttl)>0){
      try{
        const payload=automaticPushPayload(job,content,season);
        attempted=true;
        await send({endpoint:content.endpoint,keys:{p256dh:content.p256dh,auth:content.auth}},JSON.stringify(payload),
          {TTL:Math.min(Number(content.ttl),job.tipo==="summary"?3600:900),urgency:job.tipo==="summary"?"normal":"high",timeout:4000});
        result="sent";
      }catch(error){result=pushFailureResult(error);}
    }
    const completed=await rpc("concluir_push_automatico_com_adm",{p_id:job.id,p_worker:worker,p_resultado:result,p_tentado:attempted});
    if(!completed) throw new Error("Reserva de envio indisponível.");
    return result;
  }));
  const admin=await adminTask;
  return {enabled:true,processed:jobs.length,admin,
    accepted:results.filter(item=>item.status==="fulfilled"&&item.value==="sent").length,
    deferred:results.filter(item=>item.status==="rejected"||item.value==="retry"||item.value==="defer").length};
}
