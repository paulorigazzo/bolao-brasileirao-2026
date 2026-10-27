const LABELS={'12h':'Lembrete de 12h','2h':'Lembrete de 2h',summary:'Resumo da rodada'};

export function adminConsolidationPayload(job,content,season){
  const round=Number(job.rodada);
  if(!Number.isInteger(round)||round<1||round>38||!Object.hasOwn(LABELS,job.tipo))throw new Error('Consolidado inválido.');
  for(const field of ['participants','accepted','failed','attempted']){
    if(!Number.isInteger(content[field])||content[field]<0)throw new Error('Contagem inválida.');
  }
  const {participants,accepted,failed}=content;
  return {title:`${LABELS[job.tipo]} · Rodada ${round}`,
    body:`Processamento concluído: ${participants} ${participants===1?'participante com envios aceitos':'participantes com envios aceitos'} em ${accepted} ${accepted===1?'aparelho':'aparelhos'}.${failed?` Falhas em ${failed} ${failed===1?'aparelho':'aparelhos'}.`:''} Confira na ADM.`,
    tag:`adm-disparo-${season}-${round}-${job.tipo}`,url:`/?notificacao=adm-disparo&rodada=${round}&tipo=${job.tipo}`};
}

// Executado em paralelo ao lote dos participantes; erros não interrompem esse lote.
export async function runAdminConsolidations({rpc,send,worker,season,classifyFailure}){
  try{
    const jobs=await rpc('reservar_consolidados_push_adm',{p_temporada:season,p_worker:worker,p_limite:100})||[];
    const results=await Promise.allSettled(jobs.map(async job=>{
      const content=await rpc('obter_conteudo_consolidado_adm',{p_id:job.id,p_worker:worker});
      let result='skipped';
      if(content&&Number(content.ttl)>0){
        try{
          const payload=adminConsolidationPayload(job,content,season);
          await send({endpoint:content.endpoint,keys:{p256dh:content.p256dh,auth:content.auth}},JSON.stringify(payload),
            {TTL:Math.min(Number(content.ttl),3600),urgency:'normal',timeout:2000});
          result='sent';
        }catch(error){result=classifyFailure(error);}
      }
      const completed=await rpc('concluir_consolidado_push_adm',{p_id:job.id,p_worker:worker,p_resultado:result});
      if(!completed)throw new Error('Reserva indisponível.');
      return result;
    }));
    return {processed:jobs.length,accepted:results.filter(item=>item.status==='fulfilled'&&item.value==='sent').length,
      deferred:results.filter(item=>item.status==='rejected'||item.value==='retry').length};
  }catch(_){return {unavailable:true};}
}
