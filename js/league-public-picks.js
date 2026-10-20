// Pagina somente o RPC autorizado da liga. Nunca publica uma amostra parcial.
export async function loadLeaguePublicPicks({supabase,leagueId,isCurrent=()=>true,pageSize=500}) {
  const cancelled=()=>({data:null,error:null,cancelled:true});
  try {
    if(!leagueId||!Number.isInteger(pageSize)||pageSize<1||pageSize>500) throw new Error("Consulta de palpites inválida.");
    const rows=[],seen=new Set();
    let total=null;
    for(let from=0;;from+=pageSize){
      if(!isCurrent())return cancelled();
      const page=await supabase.rpc("obter_palpites_encerrados_liga",{p_liga_id:leagueId},{count:"exact"})
        .order("id_jogo",{ascending:true}).order("user_id",{ascending:true}).range(from,from+pageSize-1);
      if(!isCurrent())return cancelled();
      if(page.error)throw page.error;
      if(!Array.isArray(page.data)||!Number.isSafeInteger(page.count)||page.count<0) throw new Error("Não foi possível confirmar a quantidade de palpites.");
      if(total===null)total=page.count;
      if(page.count!==total)throw new Error("Os palpites mudaram durante a leitura. Atualize novamente.");
      if(page.data.length!==Math.min(pageSize,Math.max(0,total-from))) throw new Error("A consulta retornou uma página incompleta de palpites.");
      for(const row of page.data){
        if(!Number.isSafeInteger(Number(row.id_jogo))||!row.user_id) throw new Error("Registro de palpite inválido.");
        const key=JSON.stringify([Number(row.id_jogo),row.user_id]);
        if(seen.has(key))throw new Error("A consulta retornou palpites repetidos.");
        seen.add(key);rows.push(row);
      }
      if(rows.length===total)return {data:rows,error:null,cancelled:false};
    }
  }catch(error){
    return isCurrent()?{data:null,error,cancelled:false}:cancelled();
  }
}
