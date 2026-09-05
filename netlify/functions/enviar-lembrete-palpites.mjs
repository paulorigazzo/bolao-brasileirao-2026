import webpush from "web-push";
import { jsonResponse, methodNotAllowed, requireAdmin, requireEnv, safeErrorMessage } from "./_api-helpers.mjs";

const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pushEnv(name){
  return globalThis.Netlify?.env?.get?.(name)||requireEnv(name);
}

function unique(values=[]){
  return [...new Set(values.filter(Boolean).map(String))];
}

async function buildAudience(supabase,{leagueId,round}){
  const [{data:league,error:leagueError},{data:games,error:gamesError},{data:members,error:membersError}]=await Promise.all([
    supabase.from("ligas").select("id,nome,status").eq("id",leagueId).maybeSingle(),
    supabase.from("jogos").select("id_jogo,inicio,status").eq("rodada",round).order("inicio"),
    supabase.from("liga_membros").select("user_id").eq("liga_id",leagueId).eq("status","ativo"),
  ]);
  if(leagueError) throw leagueError;
  if(!league || league.status!=="ativa") throw new Error("A liga informada não está ativa.");
  if(gamesError) throw gamesError;
  if(membersError) throw membersError;
  if(!games?.length) throw new Error("A rodada informada não possui jogos.");

  const nextClose=Math.min(...games.map(game=>new Date(game.inicio).getTime()-30*60*1000));
  if(!Number.isFinite(nextClose) || Date.now()>=nextClose){
    throw new Error("O primeiro prazo de palpites desta rodada já foi encerrado.");
  }

  const initialMemberIds=unique(members?.map(item=>item.user_id));
  if(!initialMemberIds.length) return {league,games,pendingIds:[],subscriptions:[]};
  const {data:profiles,error:profilesError}=await supabase.from("participantes")
    .select("user_id,email")
    .in("user_id",initialMemberIds)
    .eq("ativo",true);
  if(profilesError) throw profilesError;
  const profileEmails=unique(profiles?.map(item=>String(item.email||"").trim().toLowerCase()));
  if(!profileEmails.length) return {league,games,pendingIds:[],subscriptions:[]};
  const {data:authorizations,error:authorizationsError}=await supabase.from("participantes_autorizados")
    .select("email")
    .eq("ativo",true)
    .eq("status","approved");
  if(authorizationsError) throw authorizationsError;
  const authorizedEmails=new Set((authorizations||[]).map(item=>String(item.email||"").trim().toLowerCase()));
  const memberIds=unique((profiles||[]).filter(item=>authorizedEmails.has(String(item.email||"").trim().toLowerCase())).map(item=>item.user_id));
  if(!memberIds.length) return {league,games,pendingIds:[],subscriptions:[]};
  const gameIds=games.map(game=>game.id_jogo);
  const {data:picks,error:picksError}=await supabase.from("palpites").select("user_id,id_jogo").in("user_id",memberIds).in("id_jogo",gameIds);
  if(picksError) throw picksError;
  const counts=new Map();
  for(const pick of picks||[]){
    const key=String(pick.user_id);
    if(!counts.has(key)) counts.set(key,new Set());
    counts.get(key).add(String(pick.id_jogo));
  }
  const pendingIds=memberIds.filter(userId=>(counts.get(userId)?.size||0)<gameIds.length);
  if(!pendingIds.length) return {league,games,pendingIds,subscriptions:[]};
  const {data:subscriptions,error:subscriptionsError}=await supabase.from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .in("user_id",pendingIds)
    .eq("ativo",true);
  if(subscriptionsError) throw subscriptionsError;
  if((subscriptions||[]).length>100) throw new Error("O limite seguro de 100 aparelhos por envio foi excedido.");
  return {league,games,pendingIds,subscriptions:subscriptions||[]};
}

function audienceSummary(audience){
  const subscribedUsers=new Set(audience.subscriptions.map(item=>String(item.user_id)));
  return {
    pendingParticipants:audience.pendingIds.length,
    eligibleParticipants:subscribedUsers.size,
    eligibleDevices:audience.subscriptions.length,
    participantsWithoutNotifications:audience.pendingIds.length-subscribedUsers.size,
  };
}

export default async function handler(request){
  if(request.method!=="POST") return methodNotAllowed("POST");
  const admin=await requireAdmin(request);
  if(!admin.ok) return jsonResponse({ok:false,error:admin.status===403?"Apenas administradores podem enviar lembretes.":admin.error},admin.status,{"cache-control":"no-store"});

  try{
    const body=await request.json();
    const leagueId=String(body?.leagueId||"");
    const round=Number(body?.round);
    const mode=body?.mode==="send"?"send":"preview";
    if(!UUID_PATTERN.test(leagueId) || !Number.isInteger(round) || round<1 || round>50){
      return jsonResponse({ok:false,error:"Liga ou rodada inválida."},400,{"cache-control":"no-store"});
    }

    const audience=await buildAudience(admin.supabase,{leagueId,round});
    const summary=audienceSummary(audience);
    if(mode==="preview") return jsonResponse({ok:true,mode,...summary},200,{"cache-control":"no-store"});
    if(!audience.subscriptions.length) return jsonResponse({ok:true,mode,sent:0,expired:0,failed:0,...summary},200,{"cache-control":"no-store"});

    webpush.setVapidDetails(pushEnv("VAPID_SUBJECT"),pushEnv("VAPID_PUBLIC_KEY"),pushEnv("VAPID_PRIVATE_KEY"));
    const payload=JSON.stringify({
      title:`Palpites pendentes • Rodada ${round}`,
      body:"Complete seus palpites antes do primeiro fechamento da rodada.",
      tag:`palpites-rodada-${round}`,
      url:`/?rodada=${round}`,
    });
    const results=await Promise.all(audience.subscriptions.map(async subscription=>{
      try{
        await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},payload,{TTL:3600,urgency:"high"});
        return {status:"sent",id:subscription.id};
      }catch(error){
        if(error?.statusCode===404 || error?.statusCode===410) return {status:"expired",id:subscription.id};
        return {status:"failed",id:subscription.id,error:safeErrorMessage(error)};
      }
    }));
    const expiredIds=results.filter(item=>item.status==="expired").map(item=>item.id);
    if(expiredIds.length){
      const {error}=await admin.supabase.from("push_subscriptions").update({ativo:false,atualizado_em:new Date().toISOString()}).in("id",expiredIds);
      if(error) console.warn("Não foi possível desativar assinaturas expiradas.",error.message);
    }
    return jsonResponse({
      ok:true,
      mode,
      sent:results.filter(item=>item.status==="sent").length,
      expired:expiredIds.length,
      failed:results.filter(item=>item.status==="failed").length,
      ...summary,
    },200,{"cache-control":"no-store"});
  }catch(error){
    return jsonResponse({ok:false,error:safeErrorMessage(error,"Não foi possível enviar os lembretes.")},500,{"cache-control":"no-store"});
  }
}
