import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildApiFootballGameDetailsProjection, gameDetailsFixtureIds, mergeGameDetailsProjection } from "../src/sports-data/api-football-game-details.mjs";
import { buildGameDetailsModel } from "../js/game-details.js";

const canonical={id_jogo:1,api_football_id:9001,api_football_time_casa_id:10,api_football_time_fora_id:20};
const starters=(prefix)=>Array.from({length:11},(_,index)=>({player:{id:index+1,name:`${prefix} ${index+1}`,number:index+1,pos:index?"M":"G",grid:`${index+1}:1`}}));
const substitutes=(prefix,offset)=>Array.from({length:7},(_,index)=>({player:{id:offset+index,name:`${prefix} reserva ${index+1}`,number:20+index,pos:"M",grid:null}}));
const raw={fixture:{id:9001},teams:{home:{id:10},away:{id:20}},statistics:[
  {team:{id:10},statistics:[{type:"Ball Possession",value:"48%"},{type:"Total Shots",value:12},{type:"Shots on Goal",value:5},{type:"Corner Kicks",value:7},{type:"Offsides",value:2},{type:"Fouls",value:14},{type:"Yellow Cards",value:3},{type:"Red Cards",value:null}]},
  {team:{id:20},statistics:[{type:"Ball Possession",value:"52%"},{type:"Total Shots",value:15},{type:"Shots on Goal",value:7},{type:"Corner Kicks",value:4},{type:"Offsides",value:1},{type:"Fouls",value:10},{type:"Yellow Cards",value:2},{type:"Red Cards",value:1}]},
],lineups:[{team:{id:10},formation:"4-3-3",coach:{name:"Técnico Casa"},startXI:starters("Casa"),substitutes:substitutes("Casa",101)},{team:{id:20},formation:"4-2-3-1",coach:{name:"Técnico Fora"},startXI:starters("Fora"),substitutes:substitutes("Fora",201)} ]};
const result=buildApiFootballGameDetailsProjection(raw,canonical,"2026-09-09T21:00:00Z");
assert.equal(result.eligible,true);assert.equal(result.row.estatisticas.home.possession,48);assert.equal(result.row.estatisticas.away.redCards,1);assert.equal(result.row.escalacoes.home.starters.length,11);assert.equal(result.row.escalacoes.away.substitutes.length,7);assert.match(result.row.hash_estatisticas,/^[0-9a-f]{64}$/);
assert.equal(buildApiFootballGameDetailsProjection({...raw,teams:{home:{id:20},away:{id:10}}},canonical).reason,"team_identity_mismatch");
assert.equal(buildApiFootballGameDetailsProjection({...raw,statistics:null,lineups:null},canonical).reason,"details_unavailable");
const merged=mergeGameDetailsProjection({escalacoes:{home:{formation:"old"}},hash_escalacoes:"old",escalacoes_observadas_em:"old"},{...result.row,escalacoes:null,hash_escalacoes:null,escalacoes_observadas_em:null});
assert.equal(merged.escalacoes.home.formation,"old");
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"em_andamento",inicio:"2026-09-09T20:00:00Z"}],new Date("2026-09-09T21:00:00Z")),[9001]);
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"agendado",inicio:"2026-09-09T22:00:00Z"}],new Date("2026-09-09T21:00:00Z")),[9001]);
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"agendado",inicio:"2026-09-09T20:30:00Z"}],new Date("2026-09-09T21:00:00Z")),[9001]);
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"agendado",inicio:"2026-09-09T17:00:00Z"}],new Date("2026-09-09T21:00:00Z")),[9001]);
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"agendado",inicio:"2026-09-09T16:59:59Z"}],new Date("2026-09-09T21:00:00Z")),[]);
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"agendado",inicio:"2026-09-09T22:30:01Z"}],new Date("2026-09-09T21:00:00Z")),[]);
assert.deepEqual(gameDetailsFixtureIds([{...canonical,status:"encerrado",inicio:"2026-09-09T20:00:00Z"}],new Date("2026-09-09T21:00:00Z")),[]);
const model=buildGameDetailsModel({...canonical,status:"em_andamento"},result.row);assert.equal(model.statistics.live,true);assert.equal(model.statistics.rows.length,8);assert.equal(model.lineups.away.formation,"4-2-3-1");
const corrupted=structuredClone(result.row);corrupted.escalacoes.home.coach="JoÃ£o Seabra";corrupted.escalacoes.home.starters[0].name="Tiago CÃ³ser";corrupted.escalacoes.away.substitutes[0].name="GonÃ§alves";
const repaired=buildGameDetailsModel({...canonical,status:"encerrado"},corrupted);assert.equal(repaired.lineups.home.coach,"João Seabra");assert.equal(repaired.lineups.home.starters[0].name,"Tiago Cóser");assert.equal(repaired.lineups.away.substitutes[0].name,"Gonçalves");assert.equal(result.row.escalacoes.home.starters[0].name,"Casa 1","a projeção original deve permanecer imutável");
const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");assert.match(app,/premiumGoalEvents\(g\)[\s\S]*premiumGameDetails\(g\)[\s\S]*resultComparison/);assert.match(app,/aria-expanded/);
assert.match(app,/function captureGameDetailsUiState\(\)/);
assert.match(app,/function restoreGameDetailsUiState\(cards,uiState\)/);
assert.match(app,/activeSection,lineupView,benchOpen,playerDetailsId/);
assert.match(app,/data\.filter\(game=>shouldRefreshGameDetails\(game\)\)/);
const migration=readFileSync(new URL("../supabase/migrations/20260909220000_add_game_details_projection.sql",import.meta.url),"utf8");assert.match(migration,/enable row level security/);assert.match(migration,/grant select on table public\.detalhes_partida_cache to authenticated/);assert.doesNotMatch(migration,/grant [^;]* to anon/);
console.log("Detalhes de estatísticas e escalações verificados com sucesso.");
