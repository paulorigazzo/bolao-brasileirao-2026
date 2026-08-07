export function buildRecoveryProtectionModel(data){
  if(!data) return {tone:"error",label:"Indisponível",title:"Não foi possível verificar a proteção",detail:"Tente atualizar o painel novamente."};
  const missing=Number(data.jogos_sem_snapshot)||0;
  const divergences=Number(data.divergencias)||0;
  const tone=missing||divergences?"warning":"ok";
  return {
    tone,
    label:tone==="ok"?"Atualizada":"Atenção",
    title:tone==="ok"?"Dados de recuperação protegidos":"Há itens que exigem conferência",
    detail:tone==="ok"?"Todos os jogos encerrados válidos possuem uma cópia de recuperação.":`${missing} jogo(s) sem cópia e ${divergences} divergência(s).`,
    missing,
    divergences
  };
}

export function recoveryOriginLabel(origin){
  return origin==="finalizacao"?"Finalização de jogo":origin==="baseline_v6_15_0"?"Baseline inicial":origin||"—";
}
