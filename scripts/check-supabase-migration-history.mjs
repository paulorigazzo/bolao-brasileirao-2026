import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const history = JSON.parse(await readFile(new URL("supabase/migration-history.json", root), "utf8"));
const migrationFiles = (await readdir(new URL("supabase/migrations/", root)))
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .map((file) => {
    const match = file.match(/^(\d{14})_(.+)\.sql$/);
    return { file, version: match[1], name: match[2] };
  })
  .filter(({ version }) => version >= history.managedFrom)
  .sort((a, b) => a.version.localeCompare(b.version));

assert.match(history.projectRef, /^[a-z]{20}$/);
assert.match(history.managedFrom, /^\d{14}$/);
assert.equal(new Set(history.migrations.map(({ version }) => version)).size, history.migrations.length,
  "histórico contém versões duplicadas");
assert.equal(new Set(history.migrations.map(({ name }) => name)).size, history.migrations.length,
  "histórico contém nomes duplicados");
assert.ok(history.migrations.every(({ status }) => status === "applied"),
  "migration pendente: aplicação e reconciliação remota são obrigatórias antes do merge");

const registered = history.migrations
  .map(({ version, name }) => ({ file: `${version}_${name}.sql`, version, name }))
  .sort((a, b) => a.version.localeCompare(b.version));
assert.deepEqual(migrationFiles, registered,
  "supabase/migrations diverge de supabase/migration-history.json");

console.log(`Histórico Supabase verificado: ${registered.length} migrations aplicadas desde ${history.managedFrom}.`);
