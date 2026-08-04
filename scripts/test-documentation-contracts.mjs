import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compareVersions, markdownTargets, missingMarkdownTargets } from "./check-documentation-contracts.mjs";

const versionFailures = compareVersions("6.14.1", [
  { file: "correto.md", value: "6.14.1" },
  { file: "divergente.json", value: "6.14.0" },
]);
assert.deepEqual(versionFailures, [
  'divergente.json: versao "6.14.0" diverge de VERSION.md (6.14.1)',
]);

const historicalContent = [
  "Versão histórica v5.0.0.",
  "[Local](./existente.md)",
  "[Âncora](#secao)",
  "[Web](https://example.com/indisponivel)",
  "[E-mail](mailto:teste@example.com)",
  "```md",
  "[Exemplo quebrado](./nao-deve-ser-validado.md)",
  "```",
].join("\n");
assert.deepEqual(markdownTargets(historicalContent), ["./existente.md"]);

const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "d04-documentation-contracts-"));
const docsDirectory = path.join(fixtureRoot, "docs");
await mkdir(docsDirectory);
await writeFile(path.join(docsDirectory, "existente.md"), "# Existe\n", "utf8");
const markdownFile = path.join(docsDirectory, "origem.md");

assert.deepEqual(
  await missingMarkdownTargets(markdownFile, historicalContent, fixtureRoot),
  [],
);
assert.deepEqual(
  await missingMarkdownTargets(markdownFile, "[Ausente](./ausente.md)", fixtureRoot),
  ["docs\\origem.md: destino Markdown local inexistente: ./ausente.md"].map((message) => message.replaceAll("\\", path.sep)),
);

console.log("Contratos documentais verificados com fixtures controladas.");
