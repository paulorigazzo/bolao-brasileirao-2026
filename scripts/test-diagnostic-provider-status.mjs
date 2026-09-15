import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

console.log("Diagnóstico da fonte oficial exclusiva verificado: status, cache, cotas e escudos.");
