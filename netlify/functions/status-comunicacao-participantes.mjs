import {jsonResponse,methodNotAllowed,requireAdmin,safeErrorMessage} from "./_api-helpers.mjs";
import {buildParticipantCommunicationStatus} from "./_participant-communication-status.mjs";

export async function loadParticipantCommunicationStatus(supabase){
  const [{data:authorizations,error:authorizationError},{data:profiles,error:profilesError},{data:subscriptions,error:subscriptionsError}]=await Promise.all([
    supabase.from("participantes_autorizados").select("id,email,ativo,status"),
    supabase.from("participantes").select("user_id,email"),
    supabase.from("push_subscriptions").select("user_id,ativo").eq("ativo",true),
  ]);
  const error=authorizationError||profilesError||subscriptionsError;
  if(error) throw error;
  return buildParticipantCommunicationStatus({authorizations:authorizations||[],profiles:profiles||[],subscriptions:subscriptions||[]});
}

export function createParticipantCommunicationStatusHandler({authorize=requireAdmin,loadStatus=loadParticipantCommunicationStatus}={}){
  return async function handler(request){
    if(request.method!=="GET") return methodNotAllowed("GET");
    const admin=await authorize(request);
    if(!admin.ok) return jsonResponse({ok:false,error:admin.status===403?"Apenas administradores podem consultar este status.":admin.error},admin.status,{"cache-control":"no-store"});
    try{
      const status=await loadStatus(admin.supabase);
      return jsonResponse({ok:true,...status},200,{"cache-control":"no-store"});
    }catch(error){
      return jsonResponse({ok:false,error:safeErrorMessage(error,"Não foi possível consultar o status de comunicação.")},500,{"cache-control":"no-store"});
    }
  };
}

export default createParticipantCommunicationStatusHandler();
