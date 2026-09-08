import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");

assert.match(html, /data-home-action="refresh"[^>]*>[\s\S]*?Recarregar dados<\/span>/);
assert.match(html, /id="refreshBtn"[^>]*>↻ Recarregar ranking<\/button>/);
assert.match(html, /id="refreshStandingsBtn"[^>]*>Buscar classificação oficial<\/button>/);
assert.match(html, /admin-refresh-label">Recarregar painel<\/span>/);
assert.match(html, /Reconsulta os dados do bolão sem sincronizar a fonte esportiva/);
assert.match(html, /data-admin-quick-action="sync"[\s\S]*?<strong>Sincronizar jogos<\/strong>/);
assert.doesNotMatch(html, /data-admin-quick-action="ranking"/);
assert.doesNotMatch(html, />Atualizar(?: tudo| resultados| ranking)?</);

assert.match(app, /diagnosticRefreshBtn[^\n]*Refazer diagnóstico/);
assert.match(app, /diagnosticSyncBtn[^\n]*Sincronizar jogos/);
assert.match(app, /refresh:"🔄 Recarregar dados"/);
assert.doesNotMatch(app, /action==="ranking"\)\{ await refresh\(\)/);

const reloadStart = app.indexOf("async function refresh(){");
const reloadEnd = app.indexOf("async function refreshAllAdminData()", reloadStart);
assert.ok(reloadStart >= 0 && reloadEnd > reloadStart, "recarga de dados não encontrada");
const reloadData = app.slice(reloadStart, reloadEnd);
assert.match(reloadData, /await loadData\(\)/);
assert.doesNotMatch(reloadData, /sincronizar-jogos/);
assert.doesNotMatch(reloadData, /classificacao-brasileirao/);

const standingsStart = app.indexOf("async function loadStandings(force=false){");
const standingsEnd = app.indexOf("function isAdminUser()", standingsStart);
assert.ok(standingsStart >= 0 && standingsEnd > standingsStart, "consulta da classificação não encontrada");
assert.match(app.slice(standingsStart, standingsEnd), /fetch\("\/\.netlify\/functions\/classificacao-brasileirao"/);

const syncStart = app.indexOf("async function syncGames(");
const syncEnd = app.indexOf("// v4.6.0", syncStart);
assert.ok(syncStart >= 0 && syncEnd > syncStart, "sincronização esportiva não encontrada");
assert.match(app.slice(syncStart, syncEnd), /fetch\("\/\.netlify\/functions\/sincronizar-jogos"/);

console.log("Ações de recarga, consulta, diagnóstico e sincronização estão distintas e sem duplicidade no painel ADM.");
