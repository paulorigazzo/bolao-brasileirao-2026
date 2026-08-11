const LOCAL_PREVIEW_HOSTS=new Set(["localhost","127.0.0.1"]);
const NETLIFY_PREVIEW_HOST=/^deploy-preview-\d+--bolaorigazzo2026\.netlify\.app$/i;

export function isTemporaryRankingSyntheticPreview(locationLike={}){
  const hostname=String(locationLike.hostname||"").trim().toLowerCase().replace(/\.$/,"");
  const params=new URLSearchParams(String(locationLike.search||""));
  if(params.get("preview")!=="ranking-provisorio") return false;
  return LOCAL_PREVIEW_HOSTS.has(hostname) || NETLIFY_PREVIEW_HOST.test(hostname);
}

export function buildTemporaryRankingSyntheticFixture(now=new Date()){
  const round=24;
  const updatedAt=now instanceof Date && Number.isFinite(now.getTime())?now.toISOString():new Date().toISOString();
  const games=[
    {id_jogo:2401,rodada:round,status:"FINISHED",gols_casa:2,gols_fora:1},
    {id_jogo:2402,rodada:round,status:"IN_PLAY",gols_casa:1,gols_fora:0},
    {id_jogo:2403,rodada:round,status:"SUSPENDED",gols_casa:1,gols_fora:1},
    {id_jogo:2404,rodada:round,status:"POSTPONED",gols_casa:null,gols_fora:null},
    {id_jogo:2405,rodada:round,status:"TIMED",gols_casa:null,gols_fora:null}
  ];
  const officialRanking=[
    {userId:"synthetic-ana",name:"Ana Demo",total:112,exact:5},
    {userId:"synthetic-bruno",name:"Bruno Teste",total:109,exact:4},
    {userId:"synthetic-carla",name:"Carla Exemplo",total:106,exact:4},
    {userId:"synthetic-diego",name:"Diego Amostra",total:104,exact:3},
    {userId:"synthetic-elisa",name:"Elisa Preview",total:101,exact:3},
    {userId:"synthetic-fabio",name:"Fábio Cenário",total:98,exact:2}
  ];
  const projections=[
    ["synthetic-ana","Ana Demo",112,0,112,5],
    ["synthetic-bruno","Bruno Teste",109,6,115,4],
    ["synthetic-carla","Carla Exemplo",106,3,109,4],
    ["synthetic-diego","Diego Amostra",104,10,114,4],
    ["synthetic-elisa","Elisa Preview",101,5,106,3],
    ["synthetic-fabio","Fábio Cenário",98,8,106,3]
  ];
  const rows=projections.map(([userId,name,official,provisional,projected,exacts])=>({
    user_id:userId,nome:name,
    pontos_oficiais:official,
    exatos_oficiais:exacts-(provisional===10?1:0),
    pontos_provisorios:provisional,
    exatos_provisorios:provisional===10?1:0,
    total_projetado:projected,
    exatos_projetados:exacts,
    rodada:round,
    atualizado_em:updatedAt
  }));
  return {round,games,officialRanking,rows,currentUserId:"synthetic-elisa"};
}
