const TERMINAL_STATUSES=new Set(["encerrado","adiado","cancelado"]);

export function openReminderGames(games=[],now=Date.now()){
  return games.filter(game=>{
    const closeAt=new Date(game.inicio).getTime()-30*60*1000;
    return Number.isFinite(closeAt) && now<closeAt && !TERMINAL_STATUSES.has(String(game.status||"").toLowerCase());
  }).map(game=>({...game,closeAt:new Date(new Date(game.inicio).getTime()-30*60*1000).toISOString()}));
}

export function firstName(name=""){
  return String(name).trim().split(/\s+/)[0]||"participante";
}

export function formatReminderClose(iso){
  const date=new Date(iso);
  const datePart=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit"}).format(date);
  const timePart=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
  return `${datePart} às ${timePart}`;
}

export function reminderMessage({name,pendingOpenPicks,round,nextCloseAt}){
  const picks=pendingOpenPicks===1?"1 palpite disponível":`${pendingOpenPicks} palpites disponíveis`;
  return `Olá, ${firstName(name)}! Você ainda tem ${picks} na Rodada ${round}. O próximo fecha em ${formatReminderClose(nextCloseAt)}.`;
}

export function buildReminderParticipants({profiles=[],openGames=[],picks=[],subscriptions=[],round}){
  const gameIds=new Set(openGames.map(game=>String(game.id_jogo)));
  const picksByUser=new Map();
  for(const pick of picks){
    if(!gameIds.has(String(pick.id_jogo))) continue;
    const userId=String(pick.user_id);
    if(!picksByUser.has(userId)) picksByUser.set(userId,new Set());
    picksByUser.get(userId).add(String(pick.id_jogo));
  }
  const subscriptionsByUser=new Map();
  for(const subscription of subscriptions){
    const userId=String(subscription.user_id);
    if(!subscriptionsByUser.has(userId)) subscriptionsByUser.set(userId,[]);
    subscriptionsByUser.get(userId).push(subscription);
  }
  return profiles.map(profile=>{
    const userId=String(profile.user_id);
    const completed=picksByUser.get(userId)||new Set();
    const missingGames=openGames.filter(game=>!completed.has(String(game.id_jogo)));
    if(!missingGames.length) return null;
    const nextCloseAt=missingGames.map(game=>game.closeAt).sort()[0];
    const participant={
      userId,
      name:String(profile.nome||profile.email||"Participante").trim(),
      pendingOpenPicks:missingGames.length,
      eligibleDevices:(subscriptionsByUser.get(userId)||[]).length,
      nextCloseAt,
    };
    participant.message=reminderMessage({...participant,round});
    participant.subscriptions=subscriptionsByUser.get(userId)||[];
    return participant;
  }).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
}

export function publicParticipant(participant){
  const {subscriptions,...safe}=participant;
  return safe;
}
