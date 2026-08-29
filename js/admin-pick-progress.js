export function adminRoundGameIds(games=[],round){
  const target=Number(round);
  if(!Number.isInteger(target)) return [];
  return [...new Set(games
    .filter(game=>Number(game?.rodada)===target)
    .map(game=>Number(game?.id_jogo))
    .filter(Number.isSafeInteger))];
}

export async function loadAdminPickProgress({supabase,isAdmin=false,gameIds=[]}={}){
  const ids=[...new Set(gameIds.map(Number).filter(Number.isSafeInteger))];
  if(!isAdmin || !ids.length) return {data:[],error:null};
  return supabase.from("progresso_palpites_adm")
    .select("user_id,usuario,id_jogo,atualizado_em")
    .in("id_jogo",ids);
}
