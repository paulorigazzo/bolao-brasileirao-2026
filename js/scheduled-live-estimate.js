export const SCHEDULED_LIVE_ESTIMATE_WINDOW_MS=4*60*60*1000;
export const SCHEDULED_FIRST_HALF_LIMIT=60;

function normalizedStatus(value){
  return String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toLowerCase()
    .replace(/_/g,"-");
}

export function isScheduledLiveEstimate(game,now=Date.now()){
  if(normalizedStatus(game?.status)!=="agendado") return false;
  const kickoff=new Date(game?.inicio).getTime();
  const current=new Date(now).getTime();
  if(!Number.isFinite(kickoff)||!Number.isFinite(current)) return false;
  const elapsed=current-kickoff;
  return elapsed>=0&&elapsed<=SCHEDULED_LIVE_ESTIMATE_WINDOW_MS;
}

export function scheduledLiveMinute(game,now=Date.now()){
  if(!isScheduledLiveEstimate(game,now)) return "";
  const kickoff=new Date(game.inicio).getTime();
  const current=new Date(now).getTime();
  const minute=Math.max(1,Math.floor((current-kickoff)/60000)+1);
  if(minute>SCHEDULED_FIRST_HALF_LIMIT) return "";
  return minute>45?`45+${minute-45}`:String(minute);
}

export function scheduledLiveLabel(game,now=Date.now()){
  if(!isScheduledLiveEstimate(game,now)) return "";
  const minute=scheduledLiveMinute(game,now);
  return `AO VIVO${minute?` • ~${minute}'`:" • ESTIMADO"}`;
}
