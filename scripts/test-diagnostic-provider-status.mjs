import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnosticCrestCheck, diagnosticLogsForProvider, diagnosticProviderStatus } from "../netlify/functions/diagnostico-sistema.mjs";
import { SPORTS_DATA_PROVIDERS, providerClassificationSnapshotId } from "../netlify/functions/_sports-data-provider.mjs";

const now = new Date("2026-09-04T00:00:00.000Z");
const logs = [
  { criado_em: "2026-09-03T23:55:00.000Z", sucesso: true, detalhes: { provider: SPORTS_DATA_PROVIDERS.API_FOOTBALL, quota: { dailyLimit: 7500, dailyRemaining: 7400, minuteLimit: 300, minuteRemaining: 298 } } },
  { criado_em: "2026-09-03T22:00:00.000Z", sucesso: true, detalhes: { provider: SPORTS_DATA_PROVIDERS.FOOTBALL_DATA } },
  { criado_em: "2026-09-03T21:00:00.000Z", sucesso: false, detalhes: null },
];

assert.equal(diagnosticLogsForProvider(logs, SPORTS_DATA_PROVIDERS.API_FOOTBALL).length, 1);
assert.equal(diagnosticLogsForProvider(logs, SPORTS_DATA_PROVIDERS.FOOTBALL_DATA).length, 1);
assert.equal(diagnosticProviderStatus(logs, SPORTS_DATA_PROVIDERS.API_FOOTBALL, now).status, "online");
assert.equal(diagnosticProviderStatus(logs, SPORTS_DATA_PROVIDERS.FOOTBALL_DATA, now).status, "online");
assert.equal(diagnosticProviderStatus([], SPORTS_DATA_PROVIDERS.API_FOOTBALL, now).status, "unknown");
assert.equal(diagnosticProviderStatus([
  { criado_em: "2026-09-03T23:59:00.000Z", sucesso: false, detalhes: { provider: SPORTS_DATA_PROVIDERS.API_FOOTBALL } },
], SPORTS_DATA_PROVIDERS.API_FOOTBALL, now).status, "degraded");

assert.equal(diagnosticCrestCheck(SPORTS_DATA_PROVIDERS.API_FOOTBALL, { ok: false, failures: [{}] }).ok, false);
assert.equal(diagnosticCrestCheck(SPORTS_DATA_PROVIDERS.FOOTBALL_DATA, { ok: false, failures: [{}] }).ok, true);
assert.equal(diagnosticCrestCheck(SPORTS_DATA_PROVIDERS.FOOTBALL_DATA, { ok: false, failures: [{}] }).required, false);
assert.equal(providerClassificationSnapshotId("BSA-2026", SPORTS_DATA_PROVIDERS.API_FOOTBALL), "BSA-2026:api-football");
assert.equal(providerClassificationSnapshotId("BSA-2026", SPORTS_DATA_PROVIDERS.FOOTBALL_DATA), "BSA-2026");

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(app, /function diagnosticProviderPresentation\(d\)/);
assert.match(app, /apiFootball\?d\?\.services\?\.apiFootball:d\?\.services\?\.footballData/);
assert.match(app, /fonte oficial/);
assert.match(app, /d\.cache\.expectedId/);
assert.match(app, /Cota diária restante/);
assert.match(app, /Cota por minuto restante/);
assert.match(app, /TRANSIÇÃO · AVANÇADO/);
assert.doesNotMatch(app, /"Football Data API":d\.services\.footballData/);

console.log("Diagnóstico por fonte oficial verificado: status, cache, cotas, escudos e rollback.");
