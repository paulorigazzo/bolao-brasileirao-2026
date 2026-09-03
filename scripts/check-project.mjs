import { readFile, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { APP_VERSION, CLASSIFICATION_SNAPSHOT_ID, MAX_API_CALLS_PER_SYNC } from "../netlify/functions/_constants.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html", "css/design-system.css", "css/components.css", "css/styles.css", "js/app.js", "js/config.js", "js/motion.js", "js/statistics-engine.js", "js/round-highlights-engine.js", "js/participant-duel-engine.js", "js/friendly-rankings-engine.js", "js/admin-round-share.js", "js/admin-pick-progress.js", "js/my-team-moments.js", "js/match-calendar-engine.js",
  "scripts/test-round-highlights-engine.mjs", "scripts/test-participant-duel-engine.mjs", "scripts/test-friendly-rankings-engine.mjs", "scripts/test-admin-round-share.mjs", "scripts/test-admin-pick-progress.mjs", "scripts/test-my-team-moments.mjs", "scripts/test-match-calendar-engine.mjs", "scripts/test-games-calendar-entry.mjs",
  "src/sports-data/contract.mjs", "src/sports-data/api-football-adapter.mjs", "src/sports-data/api-football-reconciliation.mjs", "src/sports-data/api-football-mapping-migration.mjs", "src/sports-data/crest-audit.mjs", "src/sports-data/api-football-local-crests.mjs", "src/sports-data/api-football-team-catalog.mjs",
  "scripts/test-api-football-adapter.mjs", "scripts/test-api-football-crest-audit.mjs", "scripts/test-api-football-local-crests.mjs", "scripts/sync-api-football-local-crests.mjs", "scripts/audit-api-football-crests.mjs", "scripts/test-api-football-reconciliation.mjs", "scripts/test-api-football-mapping-migration.mjs", "scripts/reconcile-api-football-season.mjs", "scripts/generate-api-football-mapping-migration.mjs", "fixtures/api-football/fixture-1492340.sanitized.json", "fixtures/api-football/standings-brasileirao.synthetic.json", "fixtures/api-football/teams-brasileirao-2026.json",
  "scripts/test-api-football-foundation.mjs", "supabase/migrations/20260825021432_fundacao_sombra_api_football.sql", "supabase/migrations/20260825050228_gravacao_mapeamentos_api_football_5b2.sql", "supabase/rollback/rollback_gravacao_mapeamentos_api_football_5b2.sql",
  "supabase/migrations/20260825060519_add_idempotency_round_shadow_5b3b.sql", "supabase/rollback/rollback_add_idempotency_round_shadow_5b3b.sql",
  "netlify/functions/_api-football-shadow.mjs", "netlify/functions/_api-football-round-shadow.mjs", "netlify/functions/coletar-sombra-api-football.mjs", "netlify/functions/coletar-sombra-rodada-api-football-agendado.mjs", "scripts/test-api-football-shadow.mjs", "scripts/test-api-football-round-shadow.mjs", "scripts/test-api-football-round-shadow-schedule.mjs", "scripts/test-api-football-round-shadow-idempotency.mjs", "scripts/test-api-football-shadow-admin.mjs",
  "netlify.toml", "netlify/functions/classificacao-brasileirao.mjs",
  "netlify/functions/sincronizar-jogos.mjs", "netlify/functions/sincronizar-jogos-agendado.mjs",
  "netlify/functions/diagnostico-sistema.mjs", "netlify/functions/_api-football-local-crests.mjs",
  "supabase/migrations/20260731_v6_8_0_cadastro_consolidado.sql"
];
for (const file of required) await access(path.join(projectRoot, file), constants.R_OK);

const [html, app, diagnostic, registrationMigration] = await Promise.all([
  readFile(path.join(projectRoot, "index.html"), "utf8"),
  readFile(path.join(projectRoot, "js/app.js"), "utf8"),
  readFile(path.join(projectRoot, "netlify/functions/diagnostico-sistema.mjs"), "utf8"),
  readFile(path.join(projectRoot, "supabase/migrations/20260731_v6_8_0_cadastro_consolidado.sql"), "utf8"),
]);
const failures = [];
if (!html.includes(`v${APP_VERSION}`)) failures.push("versão do index.html divergente");
if (!app.includes(`const APP_VERSION = "${APP_VERSION}"`)) failures.push("versão do app.js divergente");
if (!diagnostic.includes("APP_VERSION")) failures.push("diagnóstico não usa a versão compartilhada");
if (!html.includes('id="registrationForm"')) failures.push("formulário de cadastro consolidado ausente");
if (!app.includes('sb.rpc("solicitar_participacao_v2"')) failures.push("app não usa a RPC de cadastro consolidado");
if (!registrationMigration.includes("registrar_meu_perfil_consolidado")) failures.push("migração não materializa o perfil consolidado");
if (CLASSIFICATION_SNAPSHOT_ID !== "BSA-2026") failures.push("ID do cache inesperado");
if (MAX_API_CALLS_PER_SYNC > 8) failures.push("limite interno da API excede 8");

// Verifica imports nomeados entre módulos locais, reproduzindo a classe de erro detectada pelo bundler do Netlify.
const functionsDir = path.join(projectRoot, "netlify/functions");
const functionFiles = (await readdir(functionsDir)).filter((name) => name.endsWith(".mjs"));
const exportCache = new Map();
async function namedExports(filePath) {
  if (exportCache.has(filePath)) return exportCache.get(filePath);
  const source = await readFile(filePath, "utf8");
  const names = new Set();
  for (const match of source.matchAll(/export\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of source.matchAll(/export\s*\{([^}]+)\}/gs)) {
    for (const item of match[1].split(",")) {
      const original = item.trim().split(/\s+as\s+/i)[0]?.trim();
      if (original) names.add(original);
    }
  }
  if (/export\s+default\b/.test(source)) names.add("default");
  exportCache.set(filePath, names);
  return names;
}
for (const filename of functionFiles) {
  const importerPath = path.join(functionsDir, filename);
  const source = await readFile(importerPath, "utf8");
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.\.?\/[^"']+)["']/gs)) {
    const targetPath = path.resolve(path.dirname(importerPath), match[2]);
    const exports = await namedExports(targetPath);
    for (const item of match[1].split(",")) {
      const imported = item.trim().split(/\s+as\s+/i)[0]?.trim();
      if (imported && !exports.has(imported)) failures.push(`${filename}: import inexistente ${imported} em ${path.basename(targetPath)}`);
    }
  }
}

if (failures.length) {
  console.error("Falha na verificação:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Projeto v${APP_VERSION} verificado: arquivos, versões, cache, limite da API e imports/exports locais consistentes.`);
