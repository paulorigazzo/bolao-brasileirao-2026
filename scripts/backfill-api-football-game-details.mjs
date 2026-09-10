import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildGameDetailsBackfillArtifact, GAME_DETAILS_BACKFILL, persistGameDetailsBackfill } from "../src/sports-data/api-football-game-details-backfill.mjs";

const required=name=>{const value=process.env[name];if(!value) throw new Error(`missing_environment:${name}`);return value;};
const option=name=>process.argv.find(item=>item.startsWith(`--${name}=`))?.split("=").slice(1).join("=")||null;
const apply=process.argv.includes("--apply"), stdin=process.argv.includes("--stdin"), observedAt=new Date().toISOString();
const supabase=createClient(required("SUPABASE_URL"),required("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
const canonicalResult=await supabase.from("jogos").select("id_jogo,rodada,status,gols_casa,gols_fora,api_football_id,api_football_time_casa_id,api_football_time_fora_id").eq("temporada",2026).eq("rodada",26).order("id_jogo");
if(canonicalResult.error) throw new Error(`round26_details_canonical_read_failed:${canonicalResult.error.message}`);
if(apply){
  const artifactPath=option("artifact"); if(!artifactPath) throw new Error("round26_details_artifact_required");
  const artifact=JSON.parse(await readFile(path.resolve(artifactPath),"utf8"));
  console.log(JSON.stringify({mode:"controlled_apply",...(await persistGameDetailsBackfill({supabase,artifact,canonicalGames:canonicalResult.data,approvedHash:option("approved-hash"),confirmation:option("confirm")}))},null,2));
}else{
  const rawFixtures=stdin?JSON.parse(await readFile(0,"utf8")):[];
  if(!stdin) for(const game of canonicalResult.data||[]){
      const response=await fetch(`https://v3.football.api-sports.io/fixtures?id=${game.api_football_id}`,{headers:{"x-apisports-key":required("API_FOOTBALL_KEY"),Accept:"application/json"}});
      const payload=await response.json().catch(()=>null);
      const raw=payload?.response?.find(item=>Number(item?.fixture?.id)===Number(game.api_football_id));
      if(!response.ok||!raw) throw new Error(`round26_details_fixture_failed:${game.id_jogo}`);
      const dailyRemaining=Number(response.headers.get("x-ratelimit-requests-remaining"));
      if(Number.isFinite(dailyRemaining)&&dailyRemaining<=20) throw new Error("round26_details_daily_reserve_reached");
      rawFixtures.push(raw);
    }
  const artifact=buildGameDetailsBackfillArtifact({canonicalGames:canonicalResult.data,rawFixtures,observedAt});
  const directory=path.resolve(".artifacts","api-football");await mkdir(directory,{recursive:true});
  const artifactPath=path.join(directory,"game-details-round-26.json");await writeFile(artifactPath,`${JSON.stringify(artifact,null,2)}\n`);
  console.log(JSON.stringify({mode:"read_only_dry_run",source:stdin?"validated-browser-export":"api",artifactPath,calls:stdin?0:rawFixtures.length,...artifact.manifest},null,2));
}
