import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migration = readFileSync(fileURLToPath(new URL(
  "../supabase/migrations/20260904155501_add_league_security_queries.sql",
  import.meta.url
)), "utf8");
const rollback = readFileSync(fileURLToPath(new URL(
  "../supabase/rollback/rollback_add_league_security_queries.sql",
  import.meta.url
)), "utf8");
const corrective = readFileSync(fileURLToPath(new URL(
  "../supabase/migrations/20260904160516_fix_league_provisional_ranking_ambiguity.sql",
  import.meta.url
)), "utf8");
const statusAlignment = readFileSync(fileURLToPath(new URL(
  "../supabase/migrations/20260904160910_align_official_league_ranking_status.sql",
  import.meta.url
)), "utf8");

for (const helper of ["usuario_membro_ativo", "usuarios_compartilham_liga"]) {
  assert.match(migration, new RegExp(`function private\\.${helper}`, "i"));
  assert.match(migration, new RegExp(`function private\\.${helper}[\\s\\S]+?security definer[\\s\\S]+?set search_path = ''`, "i"));
  assert.match(migration, new RegExp(`revoke all on function private\\.${helper}`, "i"));
}

for (const rpc of [
  "listar_minhas_ligas",
  "listar_membros_liga",
  "obter_palpites_encerrados_liga",
  "obter_contagem_palpites_liga",
  "obter_ranking_liga",
  "obter_ranking_provisorio_liga"
]) {
  assert.match(migration, new RegExp(`function public\\.${rpc}`, "i"));
  assert.match(migration, new RegExp(`revoke all on function public\\.${rpc}`, "i"));
  assert.match(migration, new RegExp(`grant execute on function public\\.${rpc}`, "i"));
}

for (const view of ["contagem_palpites_participantes", "progresso_palpites_adm"]) {
  assert.match(migration, new RegExp(`view public\\.${view}[\\s\\S]+?security_invoker = true`, "i"));
}
assert.match(migration, /function public\.contagem_palpites_visivel\(\)[\s\S]+?usuarios_compartilham_liga/i);
assert.match(migration, /function public\.progresso_palpites_adm_visivel\(\)[\s\S]+?eh_administrador_atual/i);

for (const table of ["temporadas", "ligas", "liga_membros"]) {
  assert.match(migration, new RegExp(`create policy [\\s\\S]+?on public\\.${table} for select to authenticated`, "i"));
}

assert.match(migration, /grant select on table public\.temporadas, public\.ligas, public\.liga_membros to authenticated/i);
assert.match(migration, /usuarios_compartilham_liga\(user_id\)/i);
assert.match(migration, /usuario le seu palpite compartilhado/i);
assert.match(migration, /\(encerr\|finaliz\|awarded\|finished\)/i);
assert.match(migration, /drop policy if exists "palpites próprios inserção"/i);
assert.match(migration, /drop policy if exists "palpites próprios atualização"/i);
assert.doesNotMatch(migration, /create policy [^;]+?on public\.palpites for (?:insert|update)/i);
assert.match(migration, /revoke execute on function public\.eh_administrador_atual\(\) from public, anon/i);
assert.match(migration, /j\.temporada = t\.ano/i);
assert.match(migration, /row_number\(\) over\(order by t\.pontos desc,t\.exatos desc,t\.nome\)/i);
assert.doesNotMatch(migration, /alter table public\.(jogos|palpites|participantes|participantes_autorizados)\b/i);
assert.doesNotMatch(migration, /(?:insert into|update|delete from) public\.(jogos|palpites|participantes|participantes_autorizados)\b/i);

for (const object of [
  "obter_ranking_provisorio_liga", "obter_ranking_liga",
  "obter_contagem_palpites_liga", "obter_palpites_encerrados_liga",
  "listar_membros_liga", "listar_minhas_ligas",
  "progresso_palpites_adm_visivel", "contagem_palpites_visivel",
  "usuarios_compartilham_liga", "usuario_membro_ativo"
]) {
  assert.match(rollback, new RegExp(`drop function if exists (?:public|private)\\.${object}`, "i"));
}
assert.doesNotMatch(rollback, /drop table/i);
assert.match(corrective, /max\(coalesce\(jc\.sincronizado_em,jc\.atualizado_em\)\) atualizado/i);
assert.match(corrective, /from jogos_classificados jc where jc\.rodada=p_rodada/i);
assert.match(corrective, /if v_corrigida = v_definicao then/i);
assert.match(statusAlignment, /drop policy if exists "usuario le seu palpite compartilhado"/i);
assert.match(statusAlignment, /\(encerr\|finaliz\|awarded\)/i);
assert.match(statusAlignment, /replace\([\s\S]+?awarded\|finished[\s\S]+?awarded/i);
assert.match(statusAlignment, /obter_palpites_encerrados_liga','obter_ranking_liga/i);

console.log("Segurança e consultas contextualizadas por liga verificadas com sucesso.");
