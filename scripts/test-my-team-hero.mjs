import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");

const renderStart=app.indexOf("function renderMyTeam(){");
const renderEnd=app.indexOf("function renderHomeFavoriteTeam(){",renderStart);
assert.ok(renderStart>=0 && renderEnd>renderStart,"renderMyTeam deve permanecer disponível");
const render=app.slice(renderStart,renderEnd);

assert.match(render,/class="my-team-hero card"/);
assert.match(render,/class="my-team-standing-summary"[^>]*data-my-team-action="standings"/);
assert.match(render,/class="my-team-hero-next"/);
assert.match(render,/data-my-team-action="games"/);
assert.match(render,/my-team-grid-synergy/);
assert.doesNotMatch(render,/class="card my-team-next-card"/);

assert.match(styles,/\.my-team-hero-overview\{[^}]*grid-template-columns:/);
assert.match(styles,/\.my-team-hero-context\{[^}]*grid-template-columns:/);
assert.match(styles,/\.my-team-grid-synergy\{grid-template-columns:1fr\}/);
assert.match(styles,/@media\(max-width:760px\)\{[^}]*\.my-team-hero-overview\{grid-template-columns:1fr\}/);
assert.match(styles,/\.my-team-standing-summary:focus-visible/);

console.log("Hero híbrido de Meu Time verificado com sucesso.");
