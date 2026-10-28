import {jsonResponse,methodNotAllowed,requireAdmin} from './_api-helpers.mjs';
import {SEASON_YEAR} from './_constants.mjs';
import {buildAdminNotifications,notificationFilters,readNotificationPages} from './_admin-notifications.mjs';

export async function loadAdminNotifications(supabase,filters,now=Date.now()){
  const signal=AbortSignal.timeout(15000);
  const table=filters.audience==='admins'?'push_consolidados_adm':'push_automaticos';
  const [records,games]=await Promise.all([
    readNotificationPages(()=>supabase.from(table)
      .select('id,rodada,tipo,estado,tentativas,subscription_id,proxima_tentativa,criado_em,atualizado_em,subscription:push_subscriptions(user_id)')
      .eq('temporada',Number(SEASON_YEAR)).order('id').abortSignal(signal)),
    readNotificationPages(()=>supabase.from('jogos').select('rodada,inicio,status')
      .eq('temporada',Number(SEASON_YEAR)).order('id_jogo').abortSignal(signal)),
  ]);
  const ids=[...new Set(records.map(row=>(Array.isArray(row.subscription)?row.subscription[0]:row.subscription)?.user_id).filter(Boolean))];
  const profiles=[];
  for(let start=0;start<ids.length;start+=200){
    const {data,error}=await supabase.from('participantes').select('user_id,nome').in('user_id',ids.slice(start,start+200)).abortSignal(signal);
    if(error)throw new Error('Participantes indisponíveis.');
    profiles.push(...(data||[]));
  }
  return buildAdminNotifications({records,games,profiles,filters,now,season:Number(SEASON_YEAR)});
}

export function createAdminNotificationsHandler({authorize=requireAdmin,load=loadAdminNotifications,clock=Date.now}={}){
  return async request=>{
    if(request.method!=='GET')return methodNotAllowed('GET');
    const admin=await authorize(request);
    if(!admin.ok)return jsonResponse({ok:false,error:'Acesso administrativo obrigatório.'},admin.status,{'cache-control':'no-store'});
    const filters=notificationFilters(new URL(request.url).searchParams);
    if(!filters)return jsonResponse({ok:false,error:'Filtros inválidos.'},400,{'cache-control':'no-store'});
    try{return jsonResponse({ok:true,...await load(admin.supabase,filters,clock())},200,{'cache-control':'no-store'});}
    catch(_){return jsonResponse({ok:false,error:'Não foi possível consultar as notificações. Tente atualizar novamente.'},503,{'cache-control':'no-store'});}
  };
}

export default createAdminNotificationsHandler();
