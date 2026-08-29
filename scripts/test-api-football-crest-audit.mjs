import assert from "node:assert/strict";
import { auditClubCrests, collectClubCrestEvidence, crestAuditMarkdown, probeCrest } from "../src/sports-data/crest-audit.mjs";

const rows = [
  { fornecedor: "football-data.org", id_jogo: 1, time_casa_nome: "Clube A", time_casa_logo: "https://old.test/a.png", time_fora_nome: "Clube B", time_fora_logo: "https://old.test/b.png" },
  { fornecedor: "api-football", id_jogo: 1, time_casa_id_externo: 10, time_casa_nome: "Clube A", time_casa_codigo: "CLA", time_casa_logo: "https://new.test/a.png", time_fora_id_externo: 20, time_fora_nome: "Clube B", time_fora_codigo: "CLB", time_fora_logo: "http://new.test/b.png" },
];
assert.equal(collectClubCrestEvidence(rows).length, 2);
assert.deepEqual(collectClubCrestEvidence(rows)[0].canonicalUrls, ["https://old.test/a.png"]);

const png = Buffer.alloc(24);
png.write("PNG", 1, "ascii");
png.writeUInt32BE(128, 16);
png.writeUInt32BE(128, 20);
const response = () => new Response(png, { status: 200, headers: { "content-type": "image/png" } });
assert.deepEqual((await probeCrest("http://invalid.test/a.png", response)).errors, ["https_url_invalid"]);
assert.equal((await probeCrest("https://valid.test/a.png", response)).dimensions.width, 128);

const report = await auditClubCrests(rows, { fetchImpl: response });
assert.deepEqual(report.summary, { clubs: 2, approved: 1, pending: 0, rejected: 1 });
assert.equal(report.clubs[0].reason, "identical_to_canonical");
assert.equal(report.clubs[1].reason, "https_url_invalid");
assert.match(crestAuditMarkdown(report), /Auditoria de escudos/);
const pending = await auditClubCrests(rows, { probe: false });
assert.equal(pending.summary.pending, 1);
assert.equal(pending.summary.rejected, 1);
console.log("Auditoria de escudos verificada: consolidação, sondagem, classificação e relatório.");
