import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");

const silentStart = app.indexOf("async function refreshLiveScoresSilently()");
const silentEnd = app.indexOf("function startLiveScoreRefresh()", silentStart);
assert.ok(silentStart >= 0 && silentEnd > silentStart, "ciclo silencioso não encontrado");
const silentRefresh = app.slice(silentStart, silentEnd);

assert.match(silentRefresh, /sb\.from\("jogos"\)\.select\("\*"\)/);
assert.doesNotMatch(silentRefresh, /sincronizar-jogos/);
assert.doesNotMatch(silentRefresh, /isAdminUser\(/);
assert.doesNotMatch(silentRefresh, /\bfetch\(/);

const manualStart = app.indexOf("async function syncGames(");
const manualEnd = app.indexOf("// v4.6.0", manualStart);
assert.ok(manualStart >= 0 && manualEnd > manualStart, "sincronização manual não encontrada");
const manualSync = app.slice(manualStart, manualEnd);

assert.match(manualSync, /fetch\("\/\.netlify\/functions\/sincronizar-jogos"/);
assert.match(manualSync, /Authorization/);

console.log("Fronteira entre atualização do navegador e sincronização manual verificada com sucesso.");
