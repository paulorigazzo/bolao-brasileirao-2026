import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { buildSnapshot } from "../src/snapshot-export/map-origin.mjs";
import { writePackage } from "../src/snapshot-export/write-package.mjs";

const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const input = option("--input"); const output = option("--output");
if (!input || !output) {
  console.error("Uso: npm run snapshot:export -- --input <fixture.json> --output <pacote.json>");
  process.exitCode = 2;
} else {
  try {
    const origin = JSON.parse(await readFile(resolve(input), "utf8"));
    const snapshot = buildSnapshot(origin, { packageId: option("--package-id") ?? randomUUID(), exportedAt: option("--exported-at") ?? new Date().toISOString() });
    const destination = await writePackage(snapshot, output);
    console.log(JSON.stringify({ ok: true, contractVersion: snapshot.contractVersion, packageId: snapshot.packageId, dataClassification: snapshot.dataClassification, payloadHash: snapshot.integrity.payloadHash, destination }, null, 2));
  } catch (error) {
    console.error(`Exportação sintética recusada: ${error.message}`);
    process.exitCode = 1;
  }
}
