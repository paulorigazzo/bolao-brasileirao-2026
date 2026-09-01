import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL(
  "../supabase/migrations/20260901120000_add_api_football_shadow_events.sql",
  import.meta.url,
), "utf8");
const executableSql = sql.replace(/^\s*--.*$/gm, "");

for (const table of ["transicao_api_eventos_lotes", "transicao_api_eventos"]) {
  assert.match(sql, new RegExp(`create table public\\.${table} \\(`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`));
}

assert.match(sql, /unique \(execucao_id, fornecedor, id_jogo\)/);
assert.match(sql, /unique \(lote_id, chave_fornecedor\)/);
assert.match(sql, /foreign key \(lote_id, execucao_id, fornecedor, id_jogo\)/);
assert.match(sql, /categoria_normalizada in \('gol', 'cartao', 'substituicao', 'var', 'desconhecido'\)/);
assert.match(sql, /security invoker/);
assert.match(sql, /set search_path = public, pg_temp/);
assert.match(sql, /revoke all on function public\.registrar_lote_eventos_sombra\(jsonb, jsonb\)/);
assert.match(sql, /grant execute on function public\.registrar_lote_eventos_sombra\(jsonb, jsonb\)[\s\S]*to service_role/);
assert.doesNotMatch(sql, /grant (?:select|insert|update|delete)[^;]*to (?:anon|authenticated)/i);
assert.doesNotMatch(sql, /payload_original|payload_bruto|raw_payload/i);
assert.doesNotMatch(executableSql, /alter table public\.jogos|update public\.jogos|insert into public\.jogos/i);
assert.doesNotMatch(executableSql, /palpites|pontuacao|ranking/i);

console.log("Fundação 5B.4A verificada: eventos append-only, RPC atômica, RLS e isolamento competitivo.");
