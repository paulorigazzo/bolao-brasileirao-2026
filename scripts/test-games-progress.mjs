import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGamesProgressModel } from "../js/games-progress.js";

const empty=buildGamesProgressModel();
assert.equal(empty.title,"Nenhum jogo nesta rodada");
assert.equal(empty.percentage,0);
assert.equal(empty.status,"Aguardando jogos");

const partial=buildGamesProgressModel({total:10,completed:7,pending:3});
assert.equal(partial.title,"7 de 10 palpites preenchidos");
assert.equal(partial.percentage,70);
assert.equal(partial.status,"3 pendentes");
assert.deepEqual(partial.notes,[]);

const complete=buildGamesProgressModel({total:10,completed:10});
assert.equal(complete.status,"Tudo preenchido");
assert.equal(complete.percentage,100);

const exceptional=buildGamesProgressModel({total:10,completed:7,closed:2,postponed:1,lifecycle:{isProvisional:true,concluded:7,total:10}});
assert.deepEqual(exceptional.notes.map(item=>item.text),["1 jogo adiado · palpites preservados","2 jogos fechados"]);
assert.equal(exceptional.provisional,"7 de 10 jogos concluídos · 1 adiado");

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");
const progressStart=app.indexOf("function renderRoundProgress(games){");
const progressEnd=app.indexOf("function teamLogo",progressStart);
const render=app.slice(progressStart,progressEnd);
assert.match(render,/class="games-progress-heading"/);
assert.match(render,/class="games-progress-track"[^>]*role="progressbar"/);
assert.match(render,/progress\.notes\.length/);
assert.doesNotMatch(render,/class="games-progress-stat(?:\s|")/);
assert.match(styles,/\.games-progress-track\{[^}]*height:9px/);
assert.match(styles,/@media\(prefers-reduced-motion:reduce\)\{\.games-progress-track i\{transition:none\}\}/);

console.log("Progresso compacto da Tela de Jogos verificado com sucesso.");
