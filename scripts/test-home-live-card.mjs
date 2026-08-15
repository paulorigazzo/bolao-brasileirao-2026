import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");

const liveStart=app.indexOf("if(live.length){");
const liveEnd=app.indexOf("const roundPercent",liveStart);
const liveMarkup=app.slice(liveStart,liveEnd);

assert.match(liveMarkup,/class="home-live-card"/);
assert.match(liveMarkup,/class="live-dot"/);
assert.doesNotMatch(liveMarkup,/class="row-chevron"/);
assert.match(styles,/\.home-live-card:after\{[^}]*content:/);

console.log("Indicador único do card Ao Vivo verificado com sucesso.");
