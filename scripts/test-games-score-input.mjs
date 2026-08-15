import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");

const cardStart=app.indexOf("function premiumMatchCard(g){");
const cardEnd=app.indexOf("function updateGamesBottomSpacing",cardStart);
const cardMarkup=app.slice(cardStart,cardEnd);
assert.match(cardMarkup,/class="home-score" inputmode="numeric" pattern="\[0-9\]\*" enterkeyhint="next" autocomplete="off" type="number" min="0" max="15" step="1"/);
assert.match(cardMarkup,/class="away-score" inputmode="numeric" pattern="\[0-9\]\*" enterkeyhint="done" autocomplete="off" type="number" min="0" max="15" step="1"/);

const toggleStart=app.indexOf("function toggleGameCard(card){");
const toggleEnd=app.indexOf("function nextEmptyGameCard",toggleStart);
const toggleFlow=app.slice(toggleStart,toggleEnd);
assert.match(toggleFlow,/if\(willExpand\) focusEditableScore\(card\)/);
assert.match(toggleFlow,/\.premium-pick-inputs input:not\(:disabled\)/);
assert.match(toggleFlow,/inputs\.find\(input=>input\.value===""\)\|\|inputs\[0\]/);
assert.match(toggleFlow,/target\.focus\(\{preventScroll:true\}\)/);

const renderStart=app.indexOf("function renderGames(){");
const renderEnd=app.indexOf("async function saveAllPicks",renderStart);
const renderFlow=app.slice(renderStart,renderEnd);
assert.doesNotMatch(renderFlow,/focusEditableScore/);

console.log("Foco e teclado numérico dos placares verificados com sucesso.");
