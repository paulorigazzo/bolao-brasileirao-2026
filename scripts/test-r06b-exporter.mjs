import assert from "node:assert/strict";
import { buildPseudonymousSnapshot } from "../src/snapshot-export/map-pseudonymous-origin.mjs";
import { opaqueRef } from "../src/snapshot-export/pseudonymize.mjs";
import { readPseudonymousOrigin } from "../src/snapshot-export/postgres-source.mjs";
import { validateSnapshot } from "../src/snapshot-export/contract.mjs";

const secret = "r06b-controlled-test-key-32-bytes-minimum";
const context = {
  dataClassification: "pseudonymous-test", sourceRevision: "controlled-r06b",
  competition: { ref: "competition-brasileirao", name: "Campeonato Brasileiro" },
  season: { ref: "season-2026", label: "2026", status: "open" },
  league: { ref: "league-2026", name: "Bolão 2026", status: "open" },
};
const gameRow = { id_jogo: 1, rodada: 1, time_casa_id: 10, time_casa: "Azul FC", time_fora_id: 20, time_fora: "Verde EC", inicio: "2026-04-10T21:00:00Z", gols_casa: 2, gols_fora: 1, status: "encerrado" };
const predictionRow = { id: 100, id_jogo: 1, user_id: "11111111-1111-4111-8111-111111111111", gols_casa: 2, gols_fora: 1, criado_em: "2026-04-09T18:00:00Z", atualizado_em: "2026-04-09T18:00:00Z" };

class FakeClient {
  constructor({ write = false, readOnly = true } = {}) { this.write = write; this.readOnly = readOnly; this.calls = []; }
  async query(sql, params = []) {
    this.calls.push({ sql, params });
    if (sql === "show transaction_read_only") return { rows: [{ transaction_read_only: this.readOnly ? "on" : "off" }] };
    if (sql.includes("has_table_privilege") && params[1] === undefined) return { rows: [{ allowed: true }] };
    if (sql.includes("has_table_privilege")) return { rows: [{ allowed: this.write }] };
    if (sql.includes("from public.jogos") && !sql.includes("join")) return { rows: [gameRow] };
    if (sql.includes("from public.palpites")) return { rows: [predictionRow] };
    return { rows: [] };
  }
}

assert.equal(opaqueRef("participant", "abc", secret), opaqueRef("participant", "abc", secret));
assert.notEqual(opaqueRef("participant", "abc", secret), opaqueRef("membership", "abc", secret));
assert.throws(() => opaqueRef("participant", "abc", "short"), /32 bytes/);

const client = new FakeClient();
const origin = await readPseudonymousOrigin(client, context);
const snapshot = buildPseudonymousSnapshot(origin, { secret, packageId: "22222222-3333-4444-8555-666666666666", exportedAt: "2026-08-06T15:00:00Z" });
assert.equal(snapshot.contractVersion, "snapshot-2026/v1.1");
assert.equal(snapshot.dataClassification, "pseudonymous-test");
assert.deepEqual(Object.keys(snapshot.payload.participants[0]), ["ref"]);
assert.match(snapshot.payload.participants[0].ref, /^participant-[0-9a-f]{32}$/);
assert.ok(!JSON.stringify(snapshot).includes(predictionRow.user_id));
assert.ok(!JSON.stringify(snapshot).match(/email|telefone|celular|user_id|usuario/i));
const wrongVersion = structuredClone(snapshot); wrongVersion.contractVersion = "snapshot-2026/v1";
assert.equal(validateSnapshot(wrongVersion).ok, false);
assert.equal(client.calls[0].sql, "begin transaction isolation level repeatable read read only");
assert.equal(client.calls.at(-1).sql, "commit");

const privileged = new FakeClient({ write: true });
await assert.rejects(() => readPseudonymousOrigin(privileged, context), /possui INSERT/);
assert.equal(privileged.calls.at(-1).sql, "rollback");
const writableTransaction = new FakeClient({ readOnly: false });
await assert.rejects(() => readPseudonymousOrigin(writableTransaction, context), /não está em modo somente leitura/);

assert.throws(() => buildPseudonymousSnapshot({ ...origin, games: [{ ...origin.games[0], status: "agendado" }] }, { secret }), /somente partidas encerradas/);
assert.throws(() => buildPseudonymousSnapshot(origin, { secret: "short" }), /32 bytes/);

console.log("Adaptador pseudonimizado R06B.1 verificado com sucesso.");
