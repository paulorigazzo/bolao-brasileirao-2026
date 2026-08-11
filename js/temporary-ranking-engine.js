function normalizeStatus(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_\s]+/g,"-");
}

function hasScore(game){
  const valid=value=>value!==null && value!==undefined && String(value).trim()!=="" && Number.isFinite(Number(value));
  return valid(game?.gols_casa) && valid(game?.gols_fora);
}

export function temporaryRankingGameState(game){
  const status=normalizeStatus(game?.status);
  if(/cancel|anulad/.test(status)) return "cancelled";
  if(/encerr|finaliz|awarded|finished/.test(status)) return "finished";
  if(/suspend|suspens/.test(status)) return "suspended";
  if(/adiad|postpon/.test(status)) return "postponed";
  if(/vivo|andamento|intervalo|1-tempo|2-tempo|in-play|half-time|paused/.test(status)) return "live";
  return "future";
}

export function temporaryRankingAvailability(games=[],round){
  const roundGames=games.filter(game=>Number(game?.rodada)===Number(round));
  const counts={total:roundGames.length,finished:0,live:0,suspended:0,postponed:0,future:0,cancelled:0,finishedWithScore:0,liveWithScore:0,suspendedWithScore:0};
  for(const game of roundGames){
    const state=temporaryRankingGameState(game);
    counts[state]+=1;
    if(state==="finished" && hasScore(game)) counts.finishedWithScore+=1;
    if(state==="live" && hasScore(game)) counts.liveWithScore+=1;
    if(state==="suspended" && hasScore(game)) counts.suspendedWithScore+=1;
  }
  const consolidated=counts.total>0 && counts.finished+counts.cancelled===counts.total;
  const hasRelevantResult=counts.finishedWithScore>0 || counts.liveWithScore>0 || counts.suspendedWithScore>0;
  return {...counts,round:Number(round),consolidated,available:hasRelevantResult && !consolidated};
}

export function buildTemporaryRankingModel({rows=[],officialRanking=[],games=[],round}){
  const availability=temporaryRankingAvailability(games,round);
  const officialPositions=new Map((officialRanking||[]).map((item,index)=>[
    item?.userId?`id:${String(item.userId)}`:`name:${String(item?.name||"").trim().toLowerCase()}`,
    index+1
  ]));
  const ranking=(rows||[]).map(row=>{
    const userId=row?.user_id||row?.userId||null;
    const name=String(row?.nome||row?.name||"Participante").trim();
    const key=userId?`id:${String(userId)}`:`name:${name.toLowerCase()}`;
    return {
      key,userId,name,
      officialTotal:Number(row?.pontos_oficiais)||0,
      livePoints:Number(row?.pontos_provisorios)||0,
      projectedTotal:Number(row?.total_projetado)||0,
      projectedExact:Number(row?.exatos_projetados)||0,
      officialPosition:officialPositions.get(key)||null
    };
  }).sort((a,b)=>b.projectedTotal-a.projectedTotal||b.projectedExact-a.projectedExact||a.name.localeCompare(b.name,"pt-BR"));
  ranking.forEach((item,index)=>{
    item.position=index+1;
    item.movement=item.officialPosition==null?0:item.officialPosition-item.position;
  });
  return {availability,ranking};
}
