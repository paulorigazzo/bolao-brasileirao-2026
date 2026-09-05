import { jsonResponse, methodNotAllowed, requireEnv, serviceClient } from "./_api-helpers.mjs";

function pushEnv(name){
  return globalThis.Netlify?.env?.get?.(name)||requireEnv(name);
}

export default async function handler(request){
  if(request.method!=="GET") return methodNotAllowed("GET");
  const token=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) return jsonResponse({ok:false,error:"Autenticação obrigatória."},401,{"cache-control":"no-store"});
  try{
    const supabase=serviceClient();
    const {data,error}=await supabase.auth.getUser(token);
    const user=data?.user;
    if(error || !user?.email) return jsonResponse({ok:false,error:"Sessão inválida ou expirada."},401,{"cache-control":"no-store"});
    const {data:participant,error:participantError}=await supabase.from("participantes_autorizados")
      .select("ativo,status")
      .eq("email",user.email.trim().toLowerCase())
      .maybeSingle();
    if(participantError) throw participantError;
    if(!participant || participant.ativo!==true || (participant.status??"approved")!=="approved"){
      return jsonResponse({ok:false,error:"Participante não autorizado."},403,{"cache-control":"no-store"});
    }
    return jsonResponse({ok:true,publicKey:pushEnv("VAPID_PUBLIC_KEY")},200,{"cache-control":"no-store"});
  }catch(error){
    return jsonResponse({ok:false,error:error?.message||"Configuração Web Push indisponível."},500,{"cache-control":"no-store"});
  }
}
