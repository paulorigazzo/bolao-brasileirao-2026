import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMyTeamAchievements, buildMyTeamMoment } from "../js/my-team-moments.js";

const opening=buildMyTeamMoment({teamName:"São Paulo"});
assert.equal(opening.title,"Uma história para começar");
assert.deepEqual(opening.indicators,["0 jogos analisados","0% de confiança","0 pontos"]);

const optimisticFanInput={teamName:"São Paulo",games:4,points:0,hits:0,exact:0,accuracy:0,confidence:75,predictedWins:3,recentClubPoints:2,recentClubGames:5,nextPickLabel:"1 × 0"};
const optimisticFan=buildMyTeamMoment({...optimisticFanInput,referenceRound:24});
assert.equal(optimisticFan.title,"Sintonia em fase de ajuste");
assert.match(optimisticFan.text,/3 dos últimos 4 jogos analisados/);
assert.match(optimisticFan.text,/1 × 0/);
assert.deepEqual(optimisticFan.indicators,["4 jogos analisados","75% de confiança","0 pontos"]);
assert.notEqual(buildMyTeamMoment({...optimisticFanInput,referenceRound:25}).text,optimisticFan.text,"a rodada deve alternar a frase da mesma leitura");

assert.equal(buildMyTeamMoment({teamName:"Bahia",games:2,points:10,hits:1,exact:1,latestExact:true,referenceRound:2}).title,"Roteiro nas mãos");
assert.equal(buildMyTeamMoment({teamName:"Bahia",games:4,points:18,hits:3,currentSequence:3}).title,"Entrosamento em alta");
assert.equal(buildMyTeamMoment({teamName:"Bahia",games:1,points:3,hits:1,latestEarned:3}).title,"Finalmente saiu o entrosamento");
assert.equal(buildMyTeamMoment({teamName:"Bahia",games:2,points:0,confidence:40}).title,"O passe ainda não encaixou");
assert.equal(buildMyTeamMoment({teamName:"Bahia",games:4,points:6,hits:2,accuracy:50,confidence:50,recentClubGames:5,recentClubPoints:2}).title,"Firme na arquibancada");
assert.equal(buildMyTeamMoment({teamName:"Bahia",games:4,points:12,hits:2,accuracy:50,confidence:50,recentClubGames:5,recentClubPoints:8}).title,"Conexão em construção");

const progress=buildMyTeamAchievements({teamName:"São Paulo",games:4,exact:0,bestSequence:0,accuracy:0});
assert.equal(progress.length,5);
assert.deepEqual(progress.map(item=>item.id),["first","specialist","prophet","reader","fine"]);
assert.equal(progress[0].unlocked,true);
assert.equal(progress[1].progressLabel,"4/5 jogos");
assert.equal(progress[2].progressLabel,"0/2 placares exatos");
assert.equal(progress[3].progressLabel,"0/3 jogos consecutivos");
assert.equal(progress[4].progressLabel,"4/5 jogos • 0% de acerto");

const unlocked=buildMyTeamAchievements({teamName:"São Paulo",games:7,exact:2,bestSequence:3,accuracy:71});
assert.ok(unlocked.every(item=>item.unlocked && item.progress===100));

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
assert.match(app,/Momentos com o seu time/);
assert.match(app,/my-team-moment-card/);
assert.match(app,/my-team-achievement-progress/);
assert.doesNotMatch(app,/my-team-timeline-round/);

console.log("Momentos e marcos ativos de Meu Time verificados com sucesso.");
