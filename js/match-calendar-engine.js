const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

function normalize(value){
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function statusKey(game){
  const status=normalize(game?.status);
  if(status.includes("cancel") || status.includes("anulad")) return "cancelled";
  if(status.includes("adiad") || status.includes("postpon") || status.includes("suspens")) return "postponed";
  if(status.includes("encerr") || status.includes("finaliz") || status.includes("awarded")) return "finished";
  if(["vivo","andamento","intervalo","1-tempo","2-tempo","in-play","paused"].some(value=>status.includes(value))) return "live";
  return "future";
}

function dateParts(value,timeZone=DEFAULT_TIME_ZONE){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())) return null;
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const read=type=>parts.find(part=>part.type===type)?.value;
  const year=Number(read("year")),month=Number(read("month")),day=Number(read("day"));
  if(!year||!month||!day) return null;
  return {year,month,day,dateKey:`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,monthKey:`${year}-${String(month).padStart(2,"0")}`};
}

function favoriteMatch(game,favoriteTeam){
  const favorite=normalize(favoriteTeam);
  return Boolean(favorite) && [game?.time_casa,game?.time_fora].some(team=>normalize(team)===favorite);
}

function kickoff(game){
  const value=new Date(game?.inicio).getTime();
  return Number.isFinite(value)?value:Number.POSITIVE_INFINITY;
}

function chooseCalendarTarget(games,{favoriteTeam,now=Date.now()}={}){
  const ordered=[...(games||[])].sort((a,b)=>kickoff(a)-kickoff(b)||Number(a?.id_jogo)-Number(b?.id_jogo));
  return ordered.find(game=>favoriteMatch(game,favoriteTeam))
    || ordered.find(game=>statusKey(game)==="live")
    || ordered.find(game=>statusKey(game)==="future" && kickoff(game)>=now)
    || [...ordered].reverse().find(game=>statusKey(game)==="finished")
    || ordered[0]
    || null;
}

function buildMatchCalendarModel({games=[],favoriteTeam=null,now=Date.now(),timeZone=DEFAULT_TIME_ZONE}={}){
  const dated=new Map();
  const postponed=[];
  games.forEach(game=>{
    const status=statusKey(game);
    if(status==="cancelled") return;
    if(status==="postponed"){
      postponed.push({...game,calendarStatus:status});
      return;
    }
    const parts=dateParts(game?.inicio,timeZone);
    if(!parts) return;
    if(!dated.has(parts.dateKey)) dated.set(parts.dateKey,{...parts,games:[]});
    dated.get(parts.dateKey).games.push({...game,calendarStatus:status});
  });

  const days=[...dated.values()].sort((a,b)=>a.dateKey.localeCompare(b.dateKey)).map(day=>{
    const gamesForDay=day.games.sort((a,b)=>kickoff(a)-kickoff(b)||Number(a?.id_jogo)-Number(b?.id_jogo));
    const target=chooseCalendarTarget(gamesForDay,{favoriteTeam,now});
    return {...day,games:gamesForDay,count:gamesForDay.length,hasFavorite:gamesForDay.some(game=>favoriteMatch(game,favoriteTeam)),hasLive:gamesForDay.some(game=>game.calendarStatus==="live"),targetGameId:target?.id_jogo??null};
  });

  const months=[...new Set(days.map(day=>day.monthKey))].map(key=>{
    const [year,month]=key.split("-").map(Number);
    return {key,year,month,days:days.filter(day=>day.monthKey===key)};
  });
  const today=dateParts(now,timeZone);
  const currentOrNext=months.find(month=>month.key>=(today?.monthKey||""));
  return {
    months,
    initialMonthKey:(months.find(month=>month.key===today?.monthKey)||currentOrNext||months.at(-1))?.key||null,
    postponed:postponed.sort((a,b)=>Number(a?.rodada)-Number(b?.rodada)||Number(a?.id_jogo)-Number(b?.id_jogo)),
    nextGame:days.flatMap(day=>day.games).find(game=>game.calendarStatus==="live" || (game.calendarStatus==="future" && kickoff(game)>=now))||null,
    todayKey:today?.dateKey||null,
    timeZone,
  };
}

export { buildMatchCalendarModel, chooseCalendarTarget, dateParts };
