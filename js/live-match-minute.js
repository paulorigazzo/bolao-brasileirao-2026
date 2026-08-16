function clockInteger(value, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const number=Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : null;
}

export function officialLiveMatchMinute(game) {
  const minute=clockInteger(game?.minuto,130);
  if (minute == null || minute === 0) return "";
  const injuryTime=clockInteger(game?.acrescimos,30);
  const acceptsInjuryTime=[45,90,105,120].includes(minute);
  return injuryTime && acceptsInjuryTime ? `${minute}+${injuryTime}` : String(minute);
}

const FIRST_HALF_LIMIT=60;
const SECOND_HALF_LIMIT=105;

function timestamp(value) {
  if(value===null||value===undefined||value==="") return null;
  const parsed=new Date(value).getTime();
  return Number.isFinite(parsed)?parsed:null;
}

function elapsedMinutes(reference,now) {
  const referenceTime=timestamp(reference);
  const nowTime=timestamp(now);
  if(referenceTime==null||nowTime==null||nowTime<=referenceTime) return 0;
  return Math.floor((nowTime-referenceTime)/60000);
}

function estimatedMinuteText(minute,period) {
  if(!Number.isInteger(minute)||minute<=0) return "";
  const limit=period==="segundo_tempo"?SECOND_HALF_LIMIT:FIRST_HALF_LIMIT;
  if(minute>limit) return "";
  if(period==="primeiro_tempo"&&minute>45) return `45+${minute-45}`;
  if(period==="segundo_tempo"&&minute>90) return `90+${minute-90}`;
  return String(minute);
}

export function estimatedLiveMatchMinute(game,now=new Date()) {
  const period=game?.periodo_estimado;
  if(!["primeiro_tempo","segundo_tempo"].includes(period)) return "";
  const base=clockInteger(game?.minuto_estimado,106);
  if(base==null) return "";
  const minute=base+elapsedMinutes(game?.relogio_referencia_em,now);
  return estimatedMinuteText(minute,period);
}

export function liveMatchMinute(game,now=new Date()) {
  const official=officialLiveMatchMinute(game);
  if(official) return official;
  const estimated=estimatedLiveMatchMinute(game,now);
  return estimated?`~${estimated}`:"";
}

function latestGoalMinute(rawMatch) {
  return (Array.isArray(rawMatch?.goals)?rawMatch.goals:[]).reduce((latest,goal)=>{
    const minute=clockInteger(goal?.minute,105);
    if(minute==null) return latest;
    const injury=clockInteger(goal?.injuryTime,15)||0;
    return Math.max(latest,minute+injury);
  },0);
}

export function goalMinuteDiagnostics(rawMatch) {
  const goals=Array.isArray(rawMatch?.goals)?rawMatch.goals:[];
  return {
    reported:goals.length,
    withMinute:goals.filter((goal)=>clockInteger(goal?.minute,105)!=null).length,
  };
}

export function evolveEstimatedLiveClock(game,previous={},rawMatch={},now=new Date()) {
  const empty={minuto_estimado:null,periodo_estimado:null,relogio_referencia_em:null};
  if(!["em_andamento","intervalo"].includes(game?.status)) return {...game,...empty};

  const nowIso=new Date(now).toISOString();
  const previousPeriod=previous?.periodo_estimado;
  const period=game.status==="intervalo"
    ? (previousPeriod||"primeiro_tempo")
    : previous?.status==="intervalo"||previousPeriod==="segundo_tempo"
      ? "segundo_tempo"
      : "primeiro_tempo";
  let minute=period==="segundo_tempo"?45:0;
  let reference=nowIso;
  const previousMinute=clockInteger(previous?.minuto_estimado,106);
  if(previousMinute!=null&&previousPeriod===period){
    minute=previousMinute+elapsedMinutes(previous?.relogio_referencia_em,now);
    reference=previous?.relogio_referencia_em||nowIso;
  }

  const official=clockInteger(game?.minuto,130);
  const officialInjury=clockInteger(game?.acrescimos,30)||0;
  const calibration=Math.max(
    official!=null&&official>0?official+officialInjury:0,
    latestGoalMinute(rawMatch),
  );
  if(calibration>minute){
    minute=calibration;
    reference=nowIso;
  }else if(previousMinute!=null&&previousPeriod===period){
    // Preserva o instante-base original. Atualizá-lo a cada sincronização
    // descartaria os segundos ainda não convertidos em minutos e criaria deriva.
    minute=previousMinute;
  }

  const limit=period==="segundo_tempo"?SECOND_HALF_LIMIT:FIRST_HALF_LIMIT;
  const displayedMinute=minute+elapsedMinutes(reference,now);
  if(displayedMinute>limit){
    minute=limit+1;
    reference=null;
  }
  return {...game,minuto_estimado:minute,periodo_estimado:period,relogio_referencia_em:game.status==="intervalo"?null:reference};
}
