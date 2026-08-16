export const LIVE_REFRESH_BEFORE_KICKOFF_MS = 90 * 60 * 1000;
export const LIVE_REFRESH_AFTER_KICKOFF_MS = 4 * 60 * 60 * 1000;

function normalizedStatus(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

export function hasOfficialLiveStatus(game) {
  const status = normalizedStatus(game?.status);
  const terminal = ["encerr", "finaliz", "awarded", "cancel", "anulad", "adiad", "postpon", "suspens"]
    .some((term) => status.includes(term));
  if (terminal) return false;
  return ["vivo", "andamento", "intervalo", "1-tempo", "2-tempo", "in-play", "paused", "live"]
    .some((term) => status.includes(term));
}

export function shouldRefreshGamesFromSupabase(games, now = Date.now()) {
  return (Array.isArray(games) ? games : []).some((game) => {
    if (hasOfficialLiveStatus(game)) return true;

    const status = normalizedStatus(game?.status);
    const terminal = ["encerr", "finaliz", "awarded", "cancel", "anulad", "adiad", "postpon", "suspens"]
      .some((term) => status.includes(term));
    if (terminal) return false;

    const kickoff = new Date(game?.inicio).getTime();
    if (!Number.isFinite(kickoff)) return false;
    return kickoff >= now - LIVE_REFRESH_AFTER_KICKOFF_MS
      && kickoff <= now + LIVE_REFRESH_BEFORE_KICKOFF_MS;
  });
}

function hasScoreValue(value) {
  if(value===null||value===undefined) return false;
  if(typeof value==="string"&&!value.trim()) return false;
  return Number.isFinite(Number(value));
}

function revealsPublicPicks(game) {
  const status=normalizedStatus(game?.status);
  const finished=["encerr", "finaliz", "awarded"].some((term)=>status.includes(term));
  const excluded=["cancel", "anulad", "adiad", "postpon", "suspens"].some((term)=>status.includes(term));
  return finished&&!excluded&&hasScoreValue(game?.gols_casa)&&hasScoreValue(game?.gols_fora);
}

export function hasNewlyRevealablePublicPicks(previousGames,nextGames) {
  const previousById=new Map((Array.isArray(previousGames)?previousGames:[]).map((game)=>[String(game?.id_jogo),game]));
  return (Array.isArray(nextGames)?nextGames:[]).some((game)=>
    revealsPublicPicks(game)&&!revealsPublicPicks(previousById.get(String(game?.id_jogo)))
  );
}
