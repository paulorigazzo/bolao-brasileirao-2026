import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = (await readFile(new URL("../supabase/migrations/20260825054458_add_idempotency_round_shadow_5b3b.sql", import.meta.url), "utf8"))
  .toLowerCase().replace(/\s+/g, " ");
const rollback = (await readFile(new URL("../supabase/rollback/rollback_add_idempotency_round_shadow_5b3b.sql", import.meta.url), "utf8"))
  .toLowerCase().replace(/\s+/g, " ");

assert.match(migration, /alter table public\.transicao_api_execucoes add column chave_idempotencia text/);
assert.match(migration, /create unique index transicao_api_execucoes_chave_idempotencia_uidx/);
assert.match(migration, /where chave_idempotencia is not null/);
assert.doesNotMatch(migration, /grant .* to (?:anon|authenticated)/);
assert.doesNotMatch(migration, /(?:insert into|update public\.|delete from)/);
assert.match(rollback, /rollback_5b3b_blocked:idempotency_keys_in_use/);
assert.match(rollback, /drop column chave_idempotencia/);

console.log("Idempotência 5B.3B verificada: coluna opcional, unicidade, isolamento e rollback protegido.");
