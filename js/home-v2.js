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
