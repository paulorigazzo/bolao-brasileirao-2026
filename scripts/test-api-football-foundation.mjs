import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../supabase/migrations/20260825021432_fundacao_sombra_api_football.sql",
  import.meta.url,
);
const sql = await readFile(migrationUrl, "utf8");
const normalized = sql.toLowerCase().replace(/\s+/g, " ");
const metadataMigration = await readFile(new URL(
  "../supabase/migrations/20260825141629_add_shadow_match_metadata_5b3b2a.sql",
  import.meta.url,
), "utf8");
const normalizedMetadata = metadataMigration.toLowerCase().replace(/\s+/g, " ");

const requiredGameColumns = [
  "api_football_id bigint",
  "api_football_time_casa_id bigint",
  "api_football_time_fora_id bigint",
  "api_football_mapeado_em timestamptz",
];
for (const column of requiredGameColumns) {
  assert.ok(normalized.includes(`add column ${column}`), `coluna ausente: ${column}`);
}
assert.match(normalized, /create unique index jogos_api_football_id_uidx[^;]+where api_football_id is not null;/);

const shadowTables = [
  "transicao_api_execucoes",
  "transicao_api_jogos",
  "transicao_api_classificacoes",
];
for (const table of shadowTables) {
  assert.ok(normalized.includes(`create table public.${table}`), `tabela ausente: ${table}`);
  assert.ok(
    normalized.includes(`alter table public.${table} enable row level security`),
    `rls ausente: ${table}`,
  );
  assert.ok(
    normalized.includes(
      `revoke all on table public.${table} from public, anon, authenticated, service_role`,
    ),
    `revogação incompleta: ${table}`,
  );
  assert.ok(
    normalized.includes(
      `grant select, insert, update on table public.${table} to service_role`,
    ),
    `privilégio mínimo ausente: ${table}`,
  );
}

assert.match(normalized, /references public\.jogos \(id_jogo\) on delete restrict/);
assert.match(normalized, /references public\.transicao_api_execucoes \(id\) on delete cascade/g);
assert.ok(normalized.includes("unique (execucao_id, fornecedor, id_jogo)"));
assert.ok(normalized.includes("unique (execucao_id, fornecedor)"));
assert.ok(normalized.includes("create index transicao_api_jogos_id_jogo_idx"));
assert.ok(normalized.includes("status_normalizado in ("));
assert.ok(normalized.includes("'unknown'"));
assert.ok(normalized.includes("hash_relevante ~ '^[0-9a-f]{64}$'"));
assert.ok(normalized.includes("jsonb_typeof(conteudo_normalizado) = 'object'"));
assert.ok(normalized.includes("fonte_oficial <> fonte_sombra"));

assert.doesNotMatch(normalized, /\bcreate\s+policy\b/);
assert.doesNotMatch(normalized, /\bgrant\s+[^;]+\s+to\s+(?:anon|authenticated)\b/);
assert.doesNotMatch(normalized, /\b(?:insert\s+into|update\s+public\.|delete\s+from)\b/);
assert.doesNotMatch(normalized, /(?:api[_-]?key|token|secret|payload_bruto)/);

for (const rollbackTarget of [
  "drop table public.transicao_api_classificacoes",
  "drop table public.transicao_api_jogos",
  "drop table public.transicao_api_execucoes",
  "drop column api_football_id",
]) {
  assert.ok(normalized.includes(rollbackTarget), `rollback não documentado: ${rollbackTarget}`);
}

for (const column of [
  "local_nome text", "local_cidade text", "time_casa_logo text", "time_fora_logo text",
  "time_casa_codigo text", "time_fora_codigo text",
]) {
  assert.ok(normalizedMetadata.includes(`add column ${column}`), `metadado sombra ausente: ${column}`);
}
assert.ok(normalizedMetadata.includes("pg_advisory_xact_lock"));
assert.doesNotMatch(normalizedMetadata, /\b(?:insert\s+into|update|delete\s+from|create\s+policy|grant|revoke)\b/);
assert.doesNotMatch(normalizedMetadata, /alter\s+table\s+public\.jogos\b/);

console.log(
  "Fundação de sombra verificada: 4 colunas, 3 tabelas, isolamento, constraints, índices e rollback.",
);
