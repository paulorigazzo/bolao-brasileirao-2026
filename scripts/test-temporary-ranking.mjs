import assert from "node:assert/strict";
import vm from "node:vm";
import {competitionRound} from "../js/round-context.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildTemporaryRankingModel, temporaryRankingAvailability, temporaryRankingGameState } from "../js/temporary-ranking-engine.js";
import { buildTemporaryRankingSyntheticFixture, isTemporaryRankingSyntheticPreview } from "../js/temporary-ranking-preview.js";

const game=(status,extra={})=>({rodada:24,status,...extra});
assert.equal(temporaryRankingGameState(game("IN_PLAY")),"live");
assert.equal(temporaryRankingGameState(game("SUSPENDED")),"suspended");
assert.equal(temporaryRankingGameState(game("POSTPONED")),"postponed");
assert.equal(temporaryRankingGameState(game("FINISHED")),"finished");
assert.equal(temporaryRankingGameState(game("CANCELLED")),"cancelled");

assert.equal(temporaryRankingAvailability([game("TIMED")],24).available,false);
assert.equal(temporaryRankingAvailability([game("FINISHED",{gols_casa:2,gols_fora:1}),game("TIMED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("FINISHED",{gols_casa:null,gols_fora:null}),game("TIMED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("IN_PLAY",{gols_casa:1,gols_fora:0}),game("TIMED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("IN_PLAY")],24).available,true);
assert.equal(temporaryRankingAvailability([game("SUSPENDED",{gols_casa:1,gols_fora:1}),game("POSTPONED")],24).available,true);
assert.equal(temporaryRankingAvailability([game("FINISHED",{gols_casa:2,gols_fora:1}),game("CANCELLED")],24).available,false);

assert.equal(temporaryRankingAvailability([game("TIMED",{inicio:"2020-01-01T00:00:00Z"})],24).available,false,"horário passado não confirma início");
assert.equal(temporaryRankingAvailability([game("POSTPONED")],24).available,false);
assert.equal(temporaryRankingAvailability([],24).available,false);
assert.equal(temporaryRankingAvailability([game("FINISHED")],24).available,false);
assert.equal(temporaryRankingAvailability([{...game("TIMED"),rodada:25}],24).available,false);
assert.equal(temporaryRankingAvailability([game("CANCELLED")],24).available,false);

const official=[
  {userId:"ana",name:"Ana",total:100},
  {userId:"bia",name:"Bia",total:98}
];
const model=buildTemporaryRankingModel({
  officialRanking:official,
  games:[game("IN_PLAY",{gols_casa:2,gols_fora:1}),game("POSTPONED")],
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

assert.equal(isTemporaryRankingSyntheticPreview({hostname:"localhost",search:"?preview=ranking-provisorio"}),true);
assert.equal(isTemporaryRankingSyntheticPreview({hostname:"127.0.0.1",search:"?preview=ranking-provisorio"}),true);
assert.equal(isTemporaryRankingSyntheticPreview({hostname:"deploy-preview-118--bolaorigazzo2026.netlify.app",search:"?preview=ranking-provisorio"}),true);
assert.equal(isTemporaryRankingSyntheticPreview({hostname:"bolaorigazzo2026.netlify.app",search:"?preview=ranking-provisorio"}),false);
assert.equal(isTemporaryRankingSyntheticPreview({hostname:"deploy-preview-118--outro-site.netlify.app",search:"?preview=ranking-provisorio"}),false);
assert.equal(isTemporaryRankingSyntheticPreview({hostname:"localhost",search:"?preview=outro"}),false);
const fixture=buildTemporaryRankingSyntheticFixture(new Date("2026-08-11T12:00:00Z"));
assert.equal(fixture.round,24);
assert.equal(fixture.rows.length,6);
assert.equal(temporaryRankingAvailability(fixture.games,fixture.round).available,true);
assert.equal(fixture.rows.every(row=>String(row.user_id).startsWith("synthetic-")),true);
assert.equal(fixture.rows.every(row=>row.total_projetado===row.pontos_oficiais+row.pontos_provisorios),true);

const root=fileURLToPath(new URL("../",import.meta.url));
const sql=readFileSync(`${root}supabase/migrations/20260811111102_corrige_ranking_provisorio_atualizado_em.sql`,"utf8");
const app=readFileSync(`${root}js/app.js`,"utf8");
const html=readFileSync(`${root}index.html`,"utf8");
const contextSource=app.slice(app.indexOf('function temporaryRankingContext(){'),app.indexOf('function renderTemporaryRankingAccess(){'));
const fixtureGames=[{rodada:23,status:'postponed'},{rodada:24,status:'finished',inicio:'2026-10-20T12:00Z'},{rodada:24,status:'future',inicio:'2026-10-25T12:00Z'}];
const contextState={games:fixtureGames};
const contextSandbox={TEMPORARY_RANKING_PREVIEW_FIXTURE:null,state:contextState,currentRoundNumber:()=>24,pendingEarlierRounds:()=>[23],gameStatusDisplay:g=>({key:temporaryRankingGameState(g)}),temporaryRankingAvailability};
const context=vm.runInNewContext('('+contextSource.trim()+')',contextSandbox);
assert.equal(context().round,24,'adiados antigos não substituem a rodada atual');
assert.equal(context().available,true,'intervalo entre jogos mantém o acesso');
contextState.games[0]={rodada:23,status:'IN_PLAY',gols_casa:0,gols_fora:0};
assert.equal(context().round,23,'reagendado ao vivo mantém prioridade');
contextState.games[0]={rodada:23,status:'finished'};
assert.equal(context().round,24,'fim do reagendado retorna à rodada atual');
assert.equal(competitionRound(fixtureGames,Date.parse('2026-10-23T12:00Z'),temporaryRankingGameState),24);
const officialOnly=buildTemporaryRankingModel({rows:[{user_id:'ana',nome:'Ana',pontos_oficiais:100,pontos_provisorios:0,total_projetado:100}],officialRanking:official,games:[game('TIMED')],round:24});
assert.equal(officialOnly.ranking[0].projectedTotal,100);
assert.equal(officialOnly.ranking[0].livePoints,0);
assert.match(sql,/security definer/i);
assert.match(sql,/set search_path = pg_catalog, public/i);
assert.match(sql,/public\.email_autorizado\(\)/i);
assert.match(sql,/public\.calcular_pontos\(/i);
assert.match(sql,/revoke all on function public\.obter_ranking_provisorio\(integer\) from public/i);
assert.match(sql,/revoke all on function public\.obter_ranking_provisorio\(integer\) from anon/i);
assert.match(sql,/grant execute on function public\.obter_ranking_provisorio\(integer\) to authenticated/i);
assert.doesNotMatch(sql,/returns table[\s\S]*gols_palpite/i);
assert.doesNotMatch(sql,/insert\s+into|update\s+public\.|delete\s+from/i);
assert.match(app,/if\(TEMPORARY_RANKING_PREVIEW_FIXTURE\)[\s\S]*return;[\s\S]*sb\.rpc\('obter_ranking_provisorio_liga',\{p_liga_id:state\.activeLeague\?\.liga_id,p_rodada:context\.round\}\)/i);
assert.match(app,/if\(TEMPORARY_RANKING_SYNTHETIC_PREVIEW\)[\s\S]*installTemporaryRankingSyntheticPreview\(\);[\s\S]*}else{[\s\S]*sb\.auth\.getSession\(\)/i);
assert.match(app,/temporary-ranking-result-main[\s\S]*temporaryMovementLabel\(item\.movement\)[\s\S]*temporary-ranking-points[\s\S]*temporary-ranking-comparison/i);
assert.match(app,/Atual <b>\$\{officialPosition\}<\/b>[\s\S]*Prov\. <b>\$\{item\.position\}º<\/b>/i);
assert.match(app,/aria-label="Posição mantida">—<\/span>/i);
assert.match(html,/data-admin-quick-action="temporary-ranking"/i);
assert.match(app,/allowUnavailable && isAdminUser\(\)/i);
assert.match(app,/temporaryRankingAllowUnavailable && isAdminUser\(\)/i);
assert.match(app,/openTemporaryRanking\(button,\{allowUnavailable:true\}\)/i);

console.log("Ranking provisório e contrato agregado do Supabase verificados com sucesso.");
