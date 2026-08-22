import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");

const liveStart=app.indexOf("if(displayedLive.length){");
const liveEnd=app.indexOf("const roundPercent",liveStart);
const liveMarkup=app.slice(liveStart,liveEnd);

assert.match(liveMarkup,/class="home-live-card\$\{/);
assert.match(liveMarkup,/class="live-dot"/);
assert.match(liveMarkup,/button class="premium-inline-action"[^>]*data-home-action="games"/);
assert.match(liveMarkup,/button class="home-live-card\$\{[^>]*data-home-live-game="\$\{Number\(game\.id_jogo\)\}"/);
assert.doesNotMatch(liveMarkup,/premium-live-card home-navigable-card/);
assert.doesNotMatch(liveMarkup,/class="row-chevron"/);
assert.match(styles,/\.home-live-card:after\{[^}]*content:/);
assert.match(styles,/\.home-live-card:focus-visible\{[^}]*outline:/);
assert.match(app,/const liveGame=event\.target\.closest\("\[data-home-live-game\]"\)/);
assert.match(app,/openLiveGameFromHome\(liveGame\.dataset\.homeLiveGame\)/);
assert.match(app,/function openLiveGameFromHome\(gameId\)\{[\s\S]*?openSelectedGame\(gameId,"selecionado na Home"\)/);

console.log("Indicador único do card Ao Vivo verificado com sucesso.");
