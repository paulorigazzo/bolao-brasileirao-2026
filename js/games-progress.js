function plural(value,singular,pluralForm=`${singular}s`){
  return `${value} ${value===1?singular:pluralForm}`;
}

export function buildGamesProgressModel({total=0,completed=0,pending=0,closed=0,postponed=0,lifecycle={}}={}){
  const safeTotal=Math.max(0,Number(total)||0);
  const safeCompleted=Math.max(0,Math.min(safeTotal,Number(completed)||0));
  const safePending=Math.max(0,Number(pending)||0);
  const safeClosed=Math.max(0,Number(closed)||0);
  const safePostponed=Math.max(0,Number(postponed)||0);
  const percentage=safeTotal?Math.round(safeCompleted/safeTotal*100):0;
  let status="Aguardando jogos", statusTone="is-empty", detail="A rodada ainda não possui partidas.";
  if(safeTotal && safeCompleted>=safeTotal){ status="Tudo preenchido"; statusTone="is-complete"; detail="Seus palpites desta rodada estão completos."; }
  else if(safePending){ status=plural(safePending,"pendente"); statusTone="is-pending"; detail="Complete os jogos ainda abertos."; }
  else if(safeTotal){ status="Sem jogos abertos"; statusTone="is-closed"; detail="Não há palpites disponíveis neste momento."; }
  const notes=[];
  if(safePostponed) notes.push({tone:"is-postponed",text:`${plural(safePostponed,"jogo adiado","jogos adiados")} · palpites preservados`});
  if(safeClosed) notes.push({tone:"is-closed",text:plural(safeClosed,"jogo fechado","jogos fechados")});
  const concluded=Math.max(0,Number(lifecycle?.concluded)||0);
  const lifecycleTotal=Math.max(0,Number(lifecycle?.total)||safeTotal);
  const provisional=lifecycle?.isProvisional?`${concluded} de ${lifecycleTotal} jogos concluídos · ${plural(safePostponed,"adiado")}`:"";
  return {
    title:safeTotal?`${safeCompleted} de ${safeTotal} palpites preenchidos`:"Nenhum jogo nesta rodada",
    detail,status,statusTone,percentage,notes,provisional,
    ariaLabel:safeTotal?`${safeCompleted} de ${safeTotal} palpites preenchidos, ${percentage}%`:"Nenhum jogo disponível nesta rodada",
  };
}
