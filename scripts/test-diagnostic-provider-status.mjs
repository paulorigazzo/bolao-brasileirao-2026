import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { competitionRound } from "../js/round-context.js";
import { diagnosticCrestCheck, diagnosticLogsForProvider, diagnosticProviderStatus } from "../netlify/functions/diagnostico-sistema.mjs";
import { SPORTS_DATA_PROVIDER, providerClassificationSnapshotId } from "../netlify/functions/_sports-data-provider.mjs";

const now = new Date("2026-09-15T02:00:00.000Z");
const logs = [
  { criado_em: "2026-09-15T01:55:00.000Z", sucesso: true, detalhes: { provider: SPORTS_DATA_PROVIDER } },
  { criado_em: "2026-09-14T22:00:00.000Z", sucesso: true, detalhes: { provider: "fonte-arquivada" } },
];

assert.equal(diagnosticLogsForProvider(logs, SPORTS_DATA_PROVIDER).length, 1);
assert.equal(diagnosticProviderStatus(logs, SPORTS_DATA_PROVIDER, now).status, "online");
assert.equal(diagnosticProviderStatus([], SPORTS_DATA_PROVIDER, now).status, "unknown");
assert.equal(diagnosticProviderStatus([{ criado_em: "2026-09-15T01:59:00.000Z", sucesso: false, detalhes: { provider: SPORTS_DATA_PROVIDER } }], SPORTS_DATA_PROVIDER, now).status, "degraded");
assert.equal(diagnosticCrestCheck({ ok: false, failures: [{}] }).ok, false);
assert.equal(diagnosticCrestCheck({ ok: true, clubs: 20, failures: [] }).ok, true);
assert.equal(providerClassificationSnapshotId("BSA-2026"), "BSA-2026:api-football");

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(app, /A API-Football é a fonte esportiva oficial exclusiva/);
assert.doesNotMatch(app, /Football Data API|permanece .* para rollback/);
assert.match(app, /Cota diária restante/);
assert.match(app, /Cota por minuto restante/);
assert.match(app, /Rodada atual do Bolão<\/span><strong>\$\{state\.games\.length\?currentRoundNumber\(\):"—"\}/);
assert.doesNotMatch(app, /d\.cache\.currentMatchday\?\?"—"/);

const currentRoundSource = app.match(/function currentRoundNumber\(games=state\.games\)\{[\s\S]*?\n\}/)?.[0];
const diagnosticRoundExpression = app.match(/Rodada atual do Bolão<\/span><strong>\$\{([^}]+)\}/)?.[1];
assert.ok(currentRoundSource && diagnosticRoundExpression);
const currentRoundNumber = runInNewContext(`${currentRoundSource}; currentRoundNumber`, {
  state: { games: [] },
  gameStatusDisplay: (game) => ({ key: game.status === "em_andamento" ? "live" : "future" }),
  isFinished: (game) => game.status === "encerrado",
  competitionRound,
  Date,
});
const renderDiagnosticRound = new Function("state", "currentRoundNumber", `return ${diagnosticRoundExpression};`);
const nextGame = { rodada: 28, status: "agendado", inicio: new Date(Date.now() + 86_400_000).toISOString() };
assert.equal(renderDiagnosticRound({ games: [] }, currentRoundNumber), "—");
assert.equal(renderDiagnosticRound({ games: [nextGame] }, () => currentRoundNumber([nextGame])), 28);
const liveGame = { rodada: 27, status: "em_andamento", inicio: new Date(Date.now() - 600_000).toISOString() };
assert.equal(renderDiagnosticRound({ games: [liveGame, nextGame] }, () => currentRoundNumber([liveGame, nextGame])), 28);

console.log("Diagnóstico da fonte oficial exclusiva verificado: status, cache, cotas e escudos.");
