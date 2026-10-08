export function buildTeamCampaign({team,games=[],official=null,normalizeTeamKey,isScorableGame,gameStatusDisplay,hasValidScore}={}){
  const key=normalizeTeamKey(team?.name||"");
  const seen=new Set();
  const matches=games.filter(game=>{
    if(!key || ![game.time_casa,game.time_fora].some(name=>normalizeTeamKey(name)===key)) return false;
    if(seen.has(game.id_jogo)) return false;
    seen.add(game.id_jogo);
    return true;
  });
  let accumulated=0,played=0,won=0,draw=0,lost=0;
  const rounds=Array.from({length:38},(_,index)=>{
    const round=index+1;
    const fixtures=matches.filter(game=>Number(game.rodada)===round).map(game=>{
      const home=normalizeTeamKey(game.time_casa)===key;
      const valid=isScorableGame(game);
      const own=Number(home?game.gols_casa:game.gols_fora),other=Number(home?game.gols_fora:game.gols_casa);
      const result=valid?(own>other?"V":own<other?"D":"E"):null;
      const points=valid?({V:3,E:1,D:0}[result]):null;
      if(valid){played++;won+=result==="V"?1:0;draw+=result==="E"?1:0;lost+=result==="D"?1:0;accumulated+=points;}
      const phase=gameStatusDisplay(game);
      const dateDefined=game.situacao_agendamento!=="adiado_sem_data" && phase.key!=="postponed" && Number.isFinite(Date.parse(game.inicio));
      return {id:game.id_jogo,opponent:home?game.time_fora:game.time_casa,opponentLogo:(home?game.time_fora_logo:game.time_casa_logo)||"",venue:home?"Casa":"Fora",inicio:dateDefined?game.inicio:null,phase,result,points,score:(valid||(phase.key==="live"&&hasValidScore?.(game)))?own+" × "+other:null};
    });
    return {round,fixtures,accumulated};
  });
  const officialPoints=official?.points==null?null:Number(official.points);
  return {team,official,rounds,calculated:{points:accumulated,playedGames:played,won,draw,lost},difference:Number.isFinite(officialPoints)?officialPoints-accumulated:null};
}

export function campaignPositionTrend(position,previous,round){
  if(round<=1 || !Number.isInteger(position) || !Number.isInteger(previous) || position<1 || previous<1) return null;
  const movement=previous-position;
  return {arrow:movement>0?"↑":movement<0?"↓":"→",tone:movement>0?"up":movement<0?"down":"flat",label:movement===0?"Manteve a posição":(movement>0?"Subiu ":"Caiu ")+Math.abs(movement)+" "+(Math.abs(movement)===1?"posição":"posições")};
}
