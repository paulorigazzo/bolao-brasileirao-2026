import assert from "node:assert/strict";
import {
  hasNewlyRevealablePublicPicks,
  hasOfficialLiveStatus,
  shouldRefreshGamesFromSupabase,
} from "../js/live-game-refresh-policy.js";

const minute = 60 * 1000;
const hour = 60 * minute;
const now = Date.parse("2026-08-10T20:00:00Z");
const game = (status, offsetMs) => ({ status, inicio: new Date(now + offsetMs).toISOString() });

assert.equal(shouldRefreshGamesFromSupabase([game("agendado", 90 * minute)], now), true);
assert.equal(shouldRefreshGamesFromSupabase([game("agendado", 91 * minute)], now), false);
assert.equal(shouldRefreshGamesFromSupabase([game("agendado", -4 * hour)], now), true);
assert.equal(shouldRefreshGamesFromSupabase([game("agendado", -4 * hour - minute)], now), false);
assert.equal(shouldRefreshGamesFromSupabase([game("em_andamento", -8 * hour)], now), true);
assert.equal(shouldRefreshGamesFromSupabase([game("intervalo", -2 * hour)], now), true);
assert.equal(shouldRefreshGamesFromSupabase([game("encerrado", 0)], now), false);
assert.equal(shouldRefreshGamesFromSupabase([game("adiado", 0)], now), false);
assert.equal(shouldRefreshGamesFromSupabase([game("cancelado", 0)], now), false);
assert.equal(shouldRefreshGamesFromSupabase([{ status: "agendado", inicio: "inválido" }], now), false);
assert.equal(shouldRefreshGamesFromSupabase([], now), false);

assert.equal(hasOfficialLiveStatus(game("em_andamento", 0)), true);
assert.equal(hasOfficialLiveStatus(game("IN_PLAY", 0)), true);
assert.equal(hasOfficialLiveStatus(game("paused", 0)), true);
assert.equal(hasOfficialLiveStatus(game("suspenso", 0)), false);
assert.equal(hasOfficialLiveStatus(game("encerrado", 0)), false);

const match=(id,status,home=null,away=null)=>({id_jogo:id,status,gols_casa:home,gols_fora:away});
assert.equal(hasNewlyRevealablePublicPicks(
  [match(1,"em_andamento",1,0)],
  [match(1,"encerrado",1,0)],
),true);
assert.equal(hasNewlyRevealablePublicPicks(
  [match(1,"encerrado",1,0)],
  [match(1,"encerrado",1,0)],
),false);
assert.equal(hasNewlyRevealablePublicPicks(
  [match(1,"em_andamento",1,0)],
  [match(1,"em_andamento",1,1)],
),false);
assert.equal(hasNewlyRevealablePublicPicks([], [match(2,"encerrado",3,3)]),true);
for(const status of ["agendado","em_andamento","intervalo","adiado","cancelado","suspenso"]){
  assert.equal(hasNewlyRevealablePublicPicks([], [match(3,status,2,1)]),false);
}
assert.equal(hasNewlyRevealablePublicPicks(
  [match(4,"em_andamento",null,null)],
  [match(4,"encerrado",null,null)],
),false);

console.log("Política de atualização de jogos no navegador verificada com sucesso.");
