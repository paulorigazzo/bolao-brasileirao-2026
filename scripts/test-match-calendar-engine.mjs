import assert from "node:assert/strict";
import { buildMatchCalendarModel, chooseCalendarTarget, dateParts } from "../js/match-calendar-engine.js";

const now=new Date("2026-08-03T15:00:00-03:00").getTime();
const games=[
  {id_jogo:1,rodada:20,inicio:"2026-08-02T22:00:00Z",status:"encerrado",time_casa:"Bahia",time_fora:"Ceará"},
  {id_jogo:2,rodada:21,inicio:"2026-08-12T22:00:00Z",status:"agendado",time_casa:"Palmeiras",time_fora:"Bahia"},
  {id_jogo:3,rodada:22,inicio:"2026-08-12T19:00:00Z",status:"agendado",time_casa:"Santos",time_fora:"Grêmio"},
  {id_jogo:4,rodada:18,inicio:"2026-08-12T23:30:00Z",status:"ao vivo",time_casa:"Flamengo",time_fora:"Botafogo"},
  {id_jogo:5,rodada:21,inicio:"2026-08-13T00:30:00Z",status:"adiado",time_casa:"Corinthians",time_fora:"Cruzeiro"},
  {id_jogo:6,rodada:21,inicio:null,status:"adiado",time_casa:"São Paulo",time_fora:"Internacional"},
  {id_jogo:7,rodada:22,inicio:"2026-09-01T22:00:00Z",status:"agendado",time_casa:"Fortaleza",time_fora:"Palmeiras"},
  {id_jogo:8,rodada:22,inicio:"2026-09-02T22:00:00Z",status:"cancelado",time_casa:"A",time_fora:"B"},
];

assert.deepEqual(dateParts("2026-08-13T00:30:00Z"),{year:2026,month:8,day:12,dateKey:"2026-08-12",monthKey:"2026-08"});

const model=buildMatchCalendarModel({games,favoriteTeam:"Palmeiras",now});
assert.equal(model.initialMonthKey,"2026-08");
assert.deepEqual(model.months.map(month=>month.key),["2026-08","2026-09"]);
const august12=model.months[0].days.find(day=>day.dateKey==="2026-08-12");
assert.equal(august12.count,3);
assert.equal(august12.hasFavorite,true);
assert.equal(august12.hasLive,true);
assert.equal(august12.targetGameId,2);
assert.deepEqual(model.postponed.map(game=>game.id_jogo),[5,6]);
assert.equal(model.nextGame.id_jogo,3);
assert.equal(model.months.some(month=>month.days.some(day=>day.games.some(game=>game.id_jogo===8))),false);

assert.equal(chooseCalendarTarget(august12.games,{favoriteTeam:null,now}).id_jogo,4);
assert.equal(chooseCalendarTarget(august12.games.filter(game=>game.id_jogo!==4),{favoriteTeam:null,now}).id_jogo,3);

const noCurrentMonth=buildMatchCalendarModel({games:[games[6]],favoriteTeam:"Palmeiras",now});
assert.equal(noCurrentMonth.initialMonthKey,"2026-09");

const empty=buildMatchCalendarModel({games:[],now});
assert.equal(empty.initialMonthKey,null);
assert.deepEqual(empty.months,[]);

console.log("Motor do calendário de partidas verificado com sucesso.");
