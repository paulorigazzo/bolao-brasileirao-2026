// Seleção de conteúdo; regras de fechamento e pontuação são fornecidas pelo app.
export function buildHomeV2Model({round,games,ownPick,isOpen,isUpcoming=isOpen,isScorable,isLive,points,livePoints}) {
  const current=games.filter(g=>Number(g.rodada)===Number(round));
  const pending=current.filter(g=>isOpen(g)&&!ownPick(g.id_jogo));
  const live=current.filter(isLive);
  const displayedLive=games.filter(g=>Number(g.rodada)<=Number(round)&&isLive(g)).sort((a,b)=>Number(b.rodada)-Number(a.rodada)||new Date(a.inicio)-new Date(b.inicio));
  const finished=current.filter(isScorable);
  const upcoming=current.filter(isUpcoming);
  const phase=pending.length?'pending':displayedLive.length?'live':upcoming.length?'ready':finished.length?'results':'interval';
  return {round,current,pending,live,displayedLive,finished,phase,
    displayedProvisionalPoints:displayedLive.reduce((sum,g)=>sum+livePoints(ownPick(g.id_jogo),g),0),
    officialPoints:finished.reduce((sum,g)=>sum+points(ownPick(g.id_jogo),g),0),
    provisionalPoints:live.reduce((sum,g)=>sum+livePoints(ownPick(g.id_jogo),g),0),
    exact:finished.filter(g=>points(ownPick(g.id_jogo),g)===10).length,
    filled:current.filter(g=>ownPick(g.id_jogo)).length};
}

// Apenas apresentação de resultados dos modelos canônicos; não recalcula pontos ou rankings.
export function buildHomeV2PersonalContext({highlights=null,friendlyRankings=null}={}) {
  const finished=highlights?.status==='finished' && highlights.isProvisional===false
    && highlights.lifecycle.finished===10 && new Set(highlights.provenance.scorableGameIds).size===10;
  const facts=finished?highlights.facts.personal:[];
  const performance=facts.find(fact=>fact.key==='personal-round-performance');
  const evidence=performance?.evidence;
  const comparison=evidence && typeof evidence.historicalAverage==='number' && Number.isFinite(evidence.historicalAverage)
    && ['above','below','near'].includes(evidence.comparison)
    ? {detail:performance.detail,average:evidence.historicalAverage}:null;
  const record=facts.find(fact=>['new-personal-best','matched-personal-best'].includes(fact.key))||null;
  const hot=friendlyRankings?.hot.ranking.find(item=>item.isCurrent);
  const efficiency=friendlyRankings?.efficiency.ranking.find(item=>item.isCurrent);
  const parallel=hot?{view:'hot',position:hot.position,label:'Tá vindo quente'}
    :efficiency?{view:'efficiency',position:efficiency.position,label:'Quem joga, resolve'}
    :{view:'efficiency',position:null,label:null};
  return {comparison,record,parallel};
}

// Somente apresenta líderes/posições fornecidos pelas Disputas Paralelas.
export function buildHomeV2LeagueHighlights(friendlyRankings=null) {
  return [
    {view:'efficiency',icon:'🎯',title:'Quem joga, resolve',unit:'pontos por palpite'},
    {view:'hot',icon:'🔥',title:'Tá vindo quente',unit:'pontos por palpite'}
  ].flatMap(card=>{
    const leaders=friendlyRankings?.[card.view]?.ranking.filter(item=>item.position===1)||[];
    if(!leaders.length)return [];
    return [{...card,value:Number(leaders[0].average).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
      shared:leaders.length>1,
      leaders:leaders.map(item=>({name:item.name,isCurrent:item.isCurrent,
        detail:card.view==='hot'?`Rodadas ${item.rounds.join(', ')}`:`${item.evaluated} palpites avaliados`
      }))}];
  });
}

// Fonte agregada dos Destaques ao vivo; não reconstrói palpites ou pontuação.
export function buildHomeV2RoundLeader(model,round,selectedUserId) {
  if(!model||model.round!==round||!model.hasResults||!model.ranking.length)return null;
  const total=model.ranking[0].total;
  if(total<=0)return null;
  // O destaque de liderança da rodada compartilha a marca entre totais iguais.
  const leaders=model.ranking.filter(row=>row.total===total);
  return {view:'round-leader',action:'highlights',round,icon:'🏆',title:'Líder da rodada',
    value:total.toLocaleString('pt-BR'),unit:'pontos na rodada',shared:leaders.length>1,
    status:!model.isProvisional?'Resultado final':model.projected?'Ao vivo · Provisório':'Provisório',
    leaders:leaders.map(row=>({name:row.nome,isCurrent:row.user_id===selectedUserId,detail:`Rodada ${round}`}))};
}
