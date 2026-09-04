import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const migration = await readFile(new URL("supabase/migrations/20260904185813_add_league_member_management.sql", root), "utf8");
const rollback = await readFile(new URL("supabase/rollback/rollback_add_league_member_management.sql", root), "utf8");
const transactionalTest = await readFile(new URL("supabase/tests/league-member-management.sql", root), "utf8");
const app = await readFile(new URL("js/app.js", root), "utf8");
const html = await readFile(new URL("index.html", root), "utf8");

assert.match(migration, /create table private\.liga_membros_auditoria/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on table private\.liga_membros_auditoria from public, anon, authenticated/i);
assert.match(migration, /before update or delete on private\.liga_membros_auditoria/i);
assert.match(migration, /security definer set search_path = ''/i);
assert.match(migration, /Administração local da liga obrigatória/i);
assert.match(migration, /from public\.ligas where id=p_liga_id for update/i);
assert.match(migration, /A liga deve manter ao menos um administrador ativo/i);
assert.match(migration, /não pode alterar a própria função/i);
assert.match(migration, /não pode alterar o próprio status/i);
assert.match(migration, /Participante elegível não encontrado/i);
assert.match(migration, /Participante já integra esta liga/i);
assert.match(migration, /lower\(p\.email\)=lower\(trim\(p_email\)\)/i);
assert.match(migration, /grant execute on function public\.listar_gestao_membros_liga/i);
assert.doesNotMatch(migration, /(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.palpites/i);
assert.doesNotMatch(migration, /delete\s+from\s+public\.(?:participantes|liga_membros)/i);

for (const rpc of ["listar_gestao_membros_liga", "listar_auditoria_membros_liga", "alterar_status_membro_liga"]) {
  assert.match(app, new RegExp(`rpc\\(\"${rpc}\"`));
}
assert.match(app, /state\.leagueManager/);
assert.match(html, /id="leagueAdminModal"/);
assert.match(html, /id="leagueDirectorySearch" type="search"/);
assert.match(html, /data-league-admin-view="audit"/);
assert.doesNotMatch(html, /id="leagueMemberRole"/);
assert.match(rollback, /drop table if exists private\.liga_membros_auditoria/i);
assert.doesNotMatch(rollback, /drop table if exists public\.(?:liga_membros|ligas|temporadas|palpites)/i);
assert.match(transactionalTest, /participante sem associação administrou a liga/i);
assert.match(transactionalTest, /administrador alterou a própria associação/i);
assert.match(transactionalTest, /auditoria permitiu alteração/i);
assert.match(transactionalTest, /gestão produziu palpites duplicados/i);
assert.match(transactionalTest, /rollback;/i);

console.log("Contrato da gestão auditável de membros da L06 verificado com sucesso.");
