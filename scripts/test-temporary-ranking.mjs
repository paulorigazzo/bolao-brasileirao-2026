import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildTemporaryRankingModel, temporaryRankingAvailability, temporaryRankingGameState } from "../js/temporary-ranking-engine.js";

const game=(status,extra={})=>({rodada:24,status,...extra});
assert.equal(temporaryRankingGameState(game("IN_PLAY")),"live");
assert.equal(temporaryRankingGameState(game("SUSPENDED")),"suspended");
assert.equal(temporaryRankingGameState(game("POSTPONED")),"postponed");
assert.equal(temporaryRankingGameState(game("FINISHED")),"finished");
assert.equal(temporaryRankingGameState(game("CANCELLED")),"cancelled");

assert.equal(temporaryRankingAvailability([game("TIMED")],24).available,false);
assert.equal(temporaryRankingAvailability([game("FINISHED",{gols_casa:2,gols_fora:1}),game("TIMED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("FINISHED",{gols_casa:null,gols_fora:null}),game("TIMED")],24).available,false);
assert.equal(temporaryRankingAvailability([game("IN_PLAY",{gols_casa:1,gols_fora:0}),game("TIMED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("IN_PLAY")],24).available,false);
assert.equal(temporaryRankingAvailability([game("SUSPENDED",{gols_casa:1,gols_fora:1}),game("POSTPONED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("FINISHED",{gols_casa:2,gols_fora:1}),game("CANCELLED")],24).available,false);

const official=[
  {userId:"ana",name:"Ana",total:100},
  {userId:"bia",name:"Bia",total:98}
];
const model=buildTemporaryRankingModel({
  officialRanking:official,
  games:[game("FINISHED",{gols_casa:2,gols_fora:1}),game("POSTPONED")],
  round:24,
  rows:[
    {user_id:"ana",nome:"Ana",pontos_oficiais:100,pontos_provisorios:0,total_projetado:100,exatos_projetados:2},
    {user_id:"bia",nome:"Bia",pontos_oficiais:98,pontos_provisorios:5,total_projetado:103,exatos_projetados:1}
  ]
});
assert.equal(model.availability.available,true);
assert.equal(model.ranking[0].name,"Bia");
assert.equal(model.ranking[0].movement,1);
assert.equal(model.ranking[1].movement,-1);

const root=fileURLToPath(new URL("../",import.meta.url));
const sql=readFileSync(`${root}supabase/migrations/20260811111102_corrige_ranking_provisorio_atualizado_em.sql`,"utf8");
assert.match(sql,/security definer/i);
assert.match(sql,/set search_path = pg_catalog, public/i);
assert.match(sql,/public\.email_autorizado\(\)/i);
assert.match(sql,/public\.calcular_pontos\(/i);
assert.match(sql,/revoke all on function public\.obter_ranking_provisorio\(integer\) from public/i);
assert.match(sql,/revoke all on function public\.obter_ranking_provisorio\(integer\) from anon/i);
assert.match(sql,/grant execute on function public\.obter_ranking_provisorio\(integer\) to authenticated/i);
assert.doesNotMatch(sql,/returns table[\s\S]*gols_palpite/i);
assert.doesNotMatch(sql,/insert\s+into|update\s+public\.|delete\s+from/i);

console.log("Ranking provisório e contrato agregado do Supabase verificados com sucesso.");
