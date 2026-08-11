export function buildRecoveryProtectionModel(data){
  if(!data) return {tone:"error",label:"Indisponível",title:"Não foi possível verificar a proteção",detail:"Tente atualizar o painel novamente."};
  const occurrences=Array.isArray(data.ocorrencias)?data.ocorrencias:[];
  const pending=data.pendencias==null
    ?(Number(data.jogos_sem_snapshot)||0)+(Number(data.divergencias)||0)
    :Number(data.pendencias)||0;
  const informational=Number(data.informativas)||0;
  const checked=Number(data.conferidas)||0;
  const tone=pending?"warning":informational?"info":"ok";
  return {
    tone,
    label:tone==="warning"?"Atenção":tone==="info"?"Registrada":"Atualizada",
    title:tone==="warning"?"Há itens que exigem conferência":tone==="info"?"Alterações posteriores registradas":"Dados de recuperação protegidos",
    detail:tone==="warning"
      ?`${pending} ocorrência(s) aguardando conferência.`
      :tone==="info"
        ?`${informational} alteração(ões) registrada(s), sem pendência atual.`
        :"Todos os jogos encerrados válidos possuem uma cópia de recuperação.",
    pending,
    informational,
    checked,
    occurrences
  };
}

export function recoveryOccurrenceModel(occurrence={}){
  const checked=Boolean(occurrence.conferida);
  const type=String(occurrence.tipo||"");
  const tone=checked?"checked":occurrence.severidade==="critica"?"critical":occurrence.severidade==="atencao"?"warning":"info";
  const label=checked
    ?"Conferida"
    :type==="impacto_checkpoint"
      ?"Impacto competitivo"
      :type==="jogo_sem_snapshot"||type==="divergencia_sem_historico"
        ?"Conferência necessária"
        :"Alteração registrada";
  return {tone,label,canCheck:Boolean(occurrence.pode_conferir)&&!checked};
}

export function recoveryOriginLabel(origin){
  return origin==="finalizacao"?"Finalização de jogo":origin==="baseline_v6_15_0"?"Baseline inicial":origin||"—";
}
