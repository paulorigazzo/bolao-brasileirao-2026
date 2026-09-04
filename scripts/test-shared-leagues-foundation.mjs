import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migrationPath = fileURLToPath(new URL(
  "../supabase/migrations/20260904150336_add_shared_leagues_foundation.sql",
  import.meta.url
));
const rollbackPath = fileURLToPath(new URL(
  "../supabase/rollback/rollback_add_shared_leagues_foundation.sql",
  import.meta.url
));

const sql = readFileSync(migrationPath, "utf8");
const rollback = readFileSync(rollbackPath, "utf8");

for (const table of ["temporadas", "ligas", "liga_membros"]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table} \\(`, "i"));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`, "i"));
  assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`, "i"));
  assert.match(sql, new RegExp(`grant all on table public\\.${table} to service_role;`, "i"));
  assert.doesNotMatch(sql, new RegExp(`create policy[\\s\\S]+?on public\\.${table}`, "i"));
}

assert.match(sql, /unique \(temporada_id, codigo\)/i);
assert.match(sql, /where tipo = 'standard'/i);
assert.match(sql, /primary key \(liga_id, user_id\)/i);
assert.match(sql, /references public\.participantes\(user_id\) on delete cascade/i);
assert.match(sql, /on public\.liga_membros \(user_id, status\)/i);

assert.match(sql, /'brasileirao-2026'/i);
assert.match(sql, /'brasileirao-2026-standard'/i);
assert.match(sql, /'Brasileirão 2026'/i);
assert.match(sql, /on conflict \(codigo\) do nothing/i);
assert.match(sql, /on conflict \(temporada_id, codigo\) do nothing/i);
assert.match(sql, /on conflict \(liga_id, user_id\) do nothing/i);

assert.match(sql, /join public\.participantes_autorizados pa/i);
assert.match(sql, /lower\(pa\.email\) = lower\(p\.email\)/i);
assert.match(sql, /p\.ativo is true/i);
assert.match(sql, /pa\.ativo is true/i);
assert.match(sql, /coalesce\(pa\.status, 'approved'\) = 'approved'/i);
assert.match(sql, /case when pa\.administrador is true then 'administrador' else 'membro' end/i);
assert.match(sql, /Liga Standard inconsistente/i);

for (const table of ["jogos", "palpites", "participantes", "participantes_autorizados"]) {
  assert.doesNotMatch(sql, new RegExp(`alter table public\\.${table}\\b`, "i"));
  assert.doesNotMatch(sql, new RegExp(`update public\\.${table}\\b`, "i"));
  assert.doesNotMatch(sql, new RegExp(`delete from public\\.${table}\\b`, "i"));
  assert.doesNotMatch(sql, new RegExp(`insert into public\\.${table}\\b`, "i"));
  assert.doesNotMatch(sql, new RegExp(`create trigger[\\s\\S]+?on public\\.${table}\\b`, "i"));
}

assert.doesNotMatch(sql, /create\s+(or\s+replace\s+)?(?:function|view|policy|trigger)\b/i);

assert.match(rollback, /drop table if exists public\.liga_membros;/i);
assert.match(rollback, /drop table if exists public\.ligas;/i);
assert.match(rollback, /drop table if exists public\.temporadas;/i);
assert.doesNotMatch(rollback, /drop table if exists public\.(jogos|palpites|participantes|participantes_autorizados)/i);

console.log("Fundação aditiva de temporadas e ligas verificada com sucesso.");
