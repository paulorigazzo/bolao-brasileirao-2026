import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migrationPath = fileURLToPath(new URL(
  "../supabase/migrations/20260806203225_v6_15_0_snapshots_competitivos.sql",
  import.meta.url
));
const sql = readFileSync(migrationPath, "utf8");

const requiredTables = [
  "jogos_encerrados_snapshot",
  "palpites_encerrados_snapshot",
  "historico_resultados",
  "checkpoints_competitivos",
  "ranking_checkpoints",
];

assert.match(sql, /create schema if not exists private;/i);
for (const table of requiredTables) {
  assert.match(sql, new RegExp(`create table private\\.${table} \\(`, "i"));
  assert.match(sql, new RegExp(`alter table private\\.${table} enable row level security;`, "i"));
}

assert.match(sql, /revoke all on schema private from anon;/i);
assert.match(sql, /revoke all on all tables in schema private from authenticated;/i);
assert.match(sql, /revoke all on all tables in schema private from service_role;/i);
assert.match(sql, /security definer\s+set search_path = pg_catalog, public, private/i);

assert.match(sql, /captura_origem in \('baseline_v6_15_0', 'finalizacao'\)/i);
assert.match(sql, /on conflict \(id_jogo\) do nothing/i);
assert.match(sql, /on conflict \(id_jogo, user_id\) do nothing/i);
assert.match(sql, /before update on public\.jogos/i);
assert.match(sql, /after insert or update on public\.jogos/i);
assert.match(sql, /old\.status is distinct from new\.status/i);
assert.match(sql, /old\.gols_casa is distinct from new\.gols_casa/i);
assert.match(sql, /old\.gols_fora is distinct from new\.gols_fora/i);

assert.match(sql, /count\(\*\) <> 10/i);
assert.match(sql, /public\.calcular_pontos\(/i);
assert.match(sql, /order by pontos desc, exatos desc, usuario asc/i);
assert.match(sql, /criar_checkpoint_competitivo\('baseline_v6_15_0', null\)/i);
assert.match(sql, /Snapshots competitivos são imutáveis/i);

assert.doesNotMatch(sql, /update\s+public\.(jogos|palpites|participantes)/i);
assert.doesNotMatch(sql, /delete\s+from\s+public\.(jogos|palpites|participantes)/i);

console.log("Contrato dos snapshots competitivos verificado com sucesso.");
