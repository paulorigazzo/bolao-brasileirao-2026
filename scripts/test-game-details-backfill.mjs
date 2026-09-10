import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGameDetailsBackfillArtifact, GAME_DETAILS_BACKFILL, persistGameDetailsBackfill, verifyGameDetailsBackfillArtifact } from "../src/sports-data/api-football-game-details-backfill.mjs";

const starters=prefix=>Array.from({length:11},(_,i)=>({player:{id:i+1,name:`${prefix} ${i+1}`,number:i+1,pos:i?"M":"G"}}));
const games=Array.from({length:10},(_,i)=>({id_jogo:100+i,rodada:26,status:"encerrado",gols_casa:1,gols_fora:0,api_football_id:1000+i,api_football_time_casa_id:10+i,api_football_time_fora_id:30+i}));
const fixtures=games.map((game,i)=>({fixture:{id:game.api_football_id},league:{id:71,season:2026,round:"Regular Season - 26"},teams:{home:{id:game.api_football_time_casa_id},away:{id:game.api_football_time_fora_id}},statistics:[{team:{id:game.api_football_time_casa_id},statistics:[{type:"Fouls",value:10+i}]},{team:{id:game.api_football_time_fora_id},statistics:[{type:"Fouls",value:11+i}]}],lineups:[{team:{id:game.api_football_time_casa_id},formation:"4-3-3",coach:{name:"Casa"},startXI:starters("Casa")},{team:{id:game.api_football_time_fora_id},formation:"4-4-2",coach:{name:"Fora"},startXI:starters("Fora")}]}));
const artifact=buildGameDetailsBackfillArtifact({canonicalGames:games,rawFixtures:fixtures,observedAt:"2026-09-09T22:00:00Z"});
assert.equal(artifact.manifest.statisticsCount,10);assert.equal(artifact.manifest.lineupsCount,10);assert.match(artifact.manifest.manifestHash,/^[0-9a-f]{64}$/);
assert.equal(verifyGameDetailsBackfillArtifact({artifact,canonicalGames:games,approvedHash:artifact.manifest.manifestHash,confirmation:GAME_DETAILS_BACKFILL.confirmation}),true);
assert.throws(()=>verifyGameDetailsBackfillArtifact({artifact,canonicalGames:games,approvedHash:"x",confirmation:GAME_DETAILS_BACKFILL.confirmation}),/hash_not_approved/);
assert.throws(()=>buildGameDetailsBackfillArtifact({canonicalGames:games.slice(1),rawFixtures:fixtures,observedAt:"x"}),/game_count_unexpected/);
const writes=[];const supabase={from(table){assert.equal(table,"detalhes_partida_cache");return{select:()=>({in:async()=>({data:[],error:null})}),upsert:async(rows,options)=>{writes.push({rows,options});return{error:null};}};}};
assert.deepEqual(await persistGameDetailsBackfill({supabase,artifact,canonicalGames:games,approvedHash:artifact.manifest.manifestHash,confirmation:GAME_DETAILS_BACKFILL.confirmation}),{ok:true,round:26,rows:10,unchanged:0});assert.equal(writes[0].rows.length,10);
const script=readFileSync(new URL("./backfill-api-football-game-details.mjs",import.meta.url),"utf8");assert.match(script,/const apply=process\.argv\.includes\("--apply"\)/);assert.match(script,/daily_reserve_reached/);assert.doesNotMatch(script,/from\("jogos"\)\.upsert|from\("palpites"\).*upsert/);
console.log("Backfill protegido dos detalhes da Rodada 26 verificado com sucesso.");
