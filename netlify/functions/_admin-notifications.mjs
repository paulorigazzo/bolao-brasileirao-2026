const TYPES=new Set(['12h','2h','summary']);
const STATES=['pending','processing','sent','skipped','failed'];
const timestamp=value=>{const time=Date.parse(value);return Number.isFinite(time)?time:0;};
const iso=value=>timestamp(value)?new Date(timestamp(value)).toISOString():null;

export function notificationFilters(searchParams){
  const audience=searchParams.get('audience')||'participants';
  const round=searchParams.get('round')||'all',type=searchParams.get('type')||'all';
  const status=searchParams.get('status')||'all',page=Number(searchParams.get('page')||1);
  if(!['participants','admins'].includes(audience)||(round!=='all'&&(!/^\d+$/.test(round)||Number(round)<1||Number(round)>38))
    ||(type!=='all'&&!TYPES.has(type))||(status!=='all'&&!STATES.includes(status))
    ||!Number.isInteger(page)||page<1||page>100000) return null;
  return {audience,round,type,status,page};
}

export function nextReminderWindow(games,now){
  const first=new Map();
  for(const game of games){
    if(/cancel|anulad|adiad|postpon/i.test(game.status||''))continue;
    const round=Number(game.rodada),start=timestamp(game.inicio);
    if(!Number.isInteger(round)||round<1||round>38||!start)continue;
    first.set(round,Math.min(first.get(round)||Infinity,start));
  }
  const windows=[];
  for(const [round,start] of first) for(const hours of [12,2]){
    const due=start-hours*3600000;
    if(now<=due+15*60000)windows.push({round,type:`${hours}h`,scheduledAt:new Date(due).toISOString(),inWindow:now>=due});
  }
  return windows.sort((a,b)=>timestamp(a.scheduledAt)-timestamp(b.scheduledAt))[0]||null;
}

export function buildAdminNotifications({records=[],profiles=[],games=[],filters,now=Date.now(),season}){
  const audience=filters.audience==='admins'?'admins':'participants',isAdmins=audience==='admins';
  const unavailable=isAdmins?'Administrador indisponível':'Participante indisponível';
  const names=new Map(profiles.map(profile=>[String(profile.user_id),String(profile.nome||unavailable)]));
  const summary={accepted:0,waiting:0,failed:0};
  const groups=new Map(),baseline=new Set();let activationAt=null,lastMovement=null;
  for(const row of records){
    if(!isAdmins&&timestamp(row.atualizado_em)>timestamp(lastMovement))lastMovement=iso(row.atualizado_em);
    if(row.tipo==='baseline'){if(!isAdmins)baseline.add(Number(row.rodada));continue;}
    if(row.tipo==='activation'){activationAt=iso(row.criado_em);continue;}
    if(!TYPES.has(row.tipo)||!STATES.includes(row.estado))continue;
    if(isAdmins&&!row.subscription_id)continue;
    if(timestamp(row.atualizado_em)>timestamp(lastMovement))lastMovement=iso(row.atualizado_em);
    if(row.estado==='sent')summary.accepted++;
    if(row.estado==='pending'||row.estado==='processing')summary.waiting++;
    if(row.estado==='failed')summary.failed++;
    const subscription=Array.isArray(row.subscription)?row.subscription[0]:row.subscription;
    const user=String(subscription?.user_id||row.subscription_id||row.id);
    const key=`${row.rodada}:${row.tipo}:${user}`;
    if(!groups.has(key))groups.set(key,{participant:names.get(user)||unavailable,round:Number(row.rodada),
      type:row.tipo,counts:Object.fromEntries(STATES.map(state=>[state,0])),deviceCount:0,attempts:0,lastUpdate:null,nextAttempt:null});
    const group=groups.get(key);
    group.counts[row.estado]++;group.deviceCount++;group.attempts+=Number(row.tentativas)||0;
    if(timestamp(row.atualizado_em)>timestamp(group.lastUpdate))group.lastUpdate=iso(row.atualizado_em);
    if(['pending','processing'].includes(row.estado)&&timestamp(row.proxima_tentativa)
      &&(!group.nextAttempt||timestamp(row.proxima_tentativa)<timestamp(group.nextAttempt)))group.nextAttempt=iso(row.proxima_tentativa);
  }
  const rows=[...groups.values()].filter(row=>(filters.round==='all'||row.round===Number(filters.round))
    &&(filters.type==='all'||row.type===filters.type)&&(filters.status==='all'||row.counts[filters.status]>0))
    .map(row=>({...row,status:STATES.filter(state=>row.counts[state]>0).length>1?'mixed':STATES.find(state=>row.counts[state]>0)}))
    .sort((a,b)=>timestamp(b.lastUpdate)-timestamp(a.lastUpdate)||a.participant.localeCompare(b.participant,'pt-BR')||b.round-a.round||a.type.localeCompare(b.type));
  const pageSize=25,total=rows.length,pages=Math.max(1,Math.ceil(total/pageSize)),page=Math.min(filters.page,pages);
  return {audience,season,queriedAt:new Date(now).toISOString(),summary,activationAt,baselineRounds:baseline.size,lastMovement,
    nextReminder:isAdmins?null:nextReminderWindow(games,now),rounds:[...new Set([...games.map(game=>Number(game.rodada)),...records.map(row=>Number(row.rodada))])].filter(round=>round>=1&&round<=38).sort((a,b)=>b-a),
    page,pages,total,rows:rows.slice((page-1)*pageSize,page*pageSize)};
}

export async function readNotificationPages(makeQuery){
  const rows=[];
  for(let start=0;start<100000;start+=500){
    const {data,error}=await makeQuery().range(start,start+499);
    if(error)throw new Error('Consulta administrativa indisponível.');
    rows.push(...(data||[]));
    if(!data||data.length<500)return rows;
  }
  throw new Error('Volume de consulta acima do limite seguro.');
}
