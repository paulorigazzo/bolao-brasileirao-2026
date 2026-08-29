import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditClubCrests, crestAuditMarkdown } from "../src/sports-data/crest-audit.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const input = option("--input");
if (!input) {
  console.error("Uso: node scripts/audit-api-football-crests.mjs --input <export.json> [--json <relatorio.json>] [--markdown <relatorio.md>] [--no-probe]");
  process.exit(1);
}
const rows = JSON.parse(await readFile(resolve(input), "utf8"));
if (!Array.isArray(rows)) throw new Error("crest_audit_input_must_be_array");
const report = await auditClubCrests(rows, { probe: !process.argv.includes("--no-probe") });
const jsonOutput = option("--json");
const markdownOutput = option("--markdown");
if (jsonOutput) await writeFile(resolve(jsonOutput), `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (markdownOutput) await writeFile(resolve(markdownOutput), crestAuditMarkdown(report), "utf8");
console.log(JSON.stringify(report.summary));
