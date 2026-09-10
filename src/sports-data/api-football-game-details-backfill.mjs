import { createHash } from "node:crypto";
import { buildApiFootballGameDetailsProjection } from "./api-football-game-details.mjs";

export const GAME_DETAILS_BACKFILL = Object.freeze({ round: 26, expectedGames: 10, confirmation: "APPLY_GAME_DETAILS_ROUND_26" });
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function selectedGames(games) {
  const selected=(games||[]).filter(game=>Number(game.rodada)===26).sort((a,b)=>Number(a.id_jogo)-Number(b.id_jogo));
  if(selected.length!==10) throw new Error(`round26_game_count_unexpected:${selected.length}`);
  if(selected.some(game=>String(game.status).toLowerCase()!=="encerrado")) throw new Error("round26_not_fully_finished");
  if(selected.some(game=>!game.api_football_id||!game.api_football_time_casa_id||!game.api_football_time_fora_id)) throw new Error("round26_mapping_incomplete");
  return selected;
}

const snapshot = game => ({ idJogo:Number(game.id_jogo), fixtureId:Number(game.api_football_id), homeId:Number(game.api_football_time_casa_id), awayId:Number(game.api_football_time_fora_id), status:game.status, homeScore:Number(game.gols_casa), awayScore:Number(game.gols_fora) });

export function buildGameDetailsBackfillArtifact({ canonicalGames, rawFixtures, observedAt }) {
  const canonical=selectedGames(canonicalGames), rawById=new Map((rawFixtures||[]).map(item=>[Number(item?.fixture?.id),item]));
  if(rawById.size!==10) throw new Error(`round26_fixture_count_unexpected:${rawById.size}`);
  const projections=canonical.map(game=>{
    const raw=rawById.get(Number(game.api_football_id));
    if(Number(raw?.league?.id)!==71||Number(raw?.league?.season)!==2026||String(raw?.league?.round)!=="Regular Season - 26") throw new Error(`round26_fixture_scope_invalid:${game.id_jogo}`);
    const candidate=buildApiFootballGameDetailsProjection(raw,game,observedAt);
    if(!candidate.eligible) throw new Error(`round26_details_invalid:${game.id_jogo}:${candidate.reason}`);
    return candidate.row;
  });
  const stable={ contract:"api-football-game-details-backfill-v1", round:26, gameCount:10,
    statisticsCount:projections.filter(row=>row.estatisticas).length, lineupsCount:projections.filter(row=>row.escalacoes).length,
    canonical:canonical.map(snapshot), projectionHashes:projections.map(row=>({idJogo:row.id_jogo,statistics:row.hash_estatisticas,lineups:row.hash_escalacoes})) };
  return { manifest:{...stable,generatedAt:observedAt,manifestHash:hash(stable)}, projections };
}

export function verifyGameDetailsBackfillArtifact({ artifact, canonicalGames, approvedHash, confirmation }) {
  if(confirmation!==GAME_DETAILS_BACKFILL.confirmation) throw new Error("round26_details_confirmation_invalid");
  if(approvedHash!==artifact?.manifest?.manifestHash) throw new Error("round26_details_hash_not_approved");
  const canonical=selectedGames(canonicalGames);
  const stable={contract:artifact.manifest.contract,round:artifact.manifest.round,gameCount:artifact.manifest.gameCount,statisticsCount:artifact.manifest.statisticsCount,lineupsCount:artifact.manifest.lineupsCount,canonical:artifact.manifest.canonical,projectionHashes:artifact.manifest.projectionHashes};
  if(stable.contract!=="api-football-game-details-backfill-v1"||stable.round!==26||stable.gameCount!==10||hash(stable)!==artifact.manifest.manifestHash) throw new Error("round26_details_manifest_invalid");
  if(hash(canonical.map(snapshot))!==hash(artifact.manifest.canonical)) throw new Error("round26_details_canonical_changed");
  if(!Array.isArray(artifact.projections)||artifact.projections.length!==10) throw new Error("round26_details_projection_count_invalid");
  return true;
}

export async function persistGameDetailsBackfill({ supabase, artifact, canonicalGames, approvedHash, confirmation }) {
  verifyGameDetailsBackfillArtifact({artifact,canonicalGames,approvedHash,confirmation});
  const ids=artifact.projections.map(row=>row.id_jogo);
  const existing=await supabase.from("detalhes_partida_cache").select("id_jogo,hash_estatisticas,hash_escalacoes").in("id_jogo",ids);
  if(existing.error) throw new Error(`round26_details_preflight_failed:${existing.error.message}`);
  const conflicts=(existing.data||[]).filter(row=>{const next=artifact.projections.find(item=>Number(item.id_jogo)===Number(row.id_jogo));return row.hash_estatisticas!==next.hash_estatisticas||row.hash_escalacoes!==next.hash_escalacoes;});
  if(conflicts.length) throw new Error(`round26_details_existing_conflict:${conflicts.map(row=>row.id_jogo).join(",")}`);
  const write=await supabase.from("detalhes_partida_cache").upsert(artifact.projections,{onConflict:"id_jogo"});
  if(write.error) throw new Error(`round26_details_write_failed:${write.error.message}`);
  return {ok:true,round:26,rows:artifact.projections.length,unchanged:(existing.data||[]).length};
}
