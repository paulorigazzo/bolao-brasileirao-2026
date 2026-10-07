// A rodada principal acompanha a sequência do campeonato. Partidas antigas
// reagendadas continuam acessíveis, mas não fazem a rodada principal retroceder.
export function competitionRound(games, now=Date.now(), phaseOf=game=>game.status){
  const rounds=[...new Set(games.map(game=>Number(game.rodada)).filter(Number.isFinite))].sort((a,b)=>a-b);
  if(!rounds.length) return 1;
  const started=games.filter(game=>{
    const phase=phaseOf(game);
    return phase==="finished" || phase==="live" || (phase!=="postponed" && phase!=="cancelled" && new Date(game.inicio).getTime()<=now);
  }).map(game=>Number(game.rodada)).filter(Number.isFinite);
  const highestStarted=started.length?Math.max(...started):0;
  // O início de uma partida não encerra a rodada. Mantém a maior rodada
  // iniciada enquanto houver jogos regulares pendentes, inclusive entre jogos.
  // Adiados e cancelados não impedem o avanço da sequência do campeonato.
  const currentStillPending=highestStarted>0 && games.some(game=>{
    if(Number(game.rodada)!==highestStarted) return false;
    const phase=phaseOf(game);
    return phase!=="finished" && phase!=="postponed" && phase!=="cancelled";
  });
  if(currentStillPending) return highestStarted;
  const next=rounds.find(round=>round>highestStarted && games.some(game=>Number(game.rodada)===round && phaseOf(game)!=="postponed" && phaseOf(game)!=="cancelled" && new Date(game.inicio).getTime()>now));
  return next||highestStarted||rounds[0];
}

export function legacyPendingRounds(games, currentRound, now=Date.now(), phaseOf=game=>game.status){
  const rounds=[...new Set(games.map(game=>Number(game.rodada)).filter(round=>Number.isFinite(round)&&round<currentRound))];
  return rounds.filter(round=>{
    const matches=games.filter(game=>Number(game.rodada)===round);
    return matches.some(game=>phaseOf(game)==="postponed" || phaseOf(game)==="live" || (phaseOf(game)!=="finished" && phaseOf(game)!=="cancelled" && new Date(game.inicio).getTime()>now));
  }).sort((a,b)=>a-b);
}
