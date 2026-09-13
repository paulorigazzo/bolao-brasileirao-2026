import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [migration, rollback, audit, app] = await Promise.all([
  readFile(new URL("supabase/migrations/20260913013447_add_league_ranking_movement.sql", root), "utf8"),
  readFile(new URL("supabase/rollback/rollback_add_league_ranking_movement.sql", root), "utf8"),
  readFile(new URL("supabase/tests/ranking-movement.sql", root), "utf8"),
  readFile(new URL("js/app.js", root), "utf8")
]);

assert.match(migration, /function public\.obter_movimentacao_ranking_liga\(p_liga_id uuid\)/i);
assert.match(migration, /returns table[\s\S]+?user_id uuid[\s\S]+?variacao integer/i);
assert.match(migration, /private\.usuario_membro_ativo\(p_liga_id\)/i);
assert.match(migration, /security definer[\s\S]+?set search_path = ''/i);
assert.match(migration, /revoke all on function public\.obter_movimentacao_ranking_liga\(uuid\) from public, anon/i);
assert.match(migration, /grant execute on function public\.obter_movimentacao_ranking_liga\(uuid\) to authenticated/i);
assert.match(migration, /row_number\(\) over \(partition by t\.rodada order by t\.pontos desc,t\.exatos desc,t\.nome\)/i);
assert.match(migration, /left join anterior ant on ant\.user_id = a\.user_id/i);
assert.match(migration, /ant\.posicao - a\.posicao/i);
assert.doesNotMatch(migration, /\blimit\s+1000\b/i);
assert.doesNotMatch(migration, /obter_palpites_encerrados_liga/i);
assert.doesNotMatch(migration, /(?:insert into|update|delete from) public\.(?:jogos|palpites|participantes|liga_membros)\b/i);
assert.match(rollback, /drop function if exists public\.obter_movimentacao_ranking_liga\(uuid\)/i);
assert.match(audit, /^begin;/im);
assert.match(audit, /^rollback;/im);
assert.doesNotMatch(audit, /^commit;/im);
assert.match(audit, /posicao_atual is distinct from r\.posicao/i);
assert.match(audit, /group by user_id having count\(\*\)<>1/i);
assert.match(audit, /MOVIMENTO_OK: posição oficial, identidade e variação comprovadas/i);
assert.doesNotMatch(audit, /(?:insert into|update|delete from) public\./i);
assert.match(app, /sb\.rpc\("obter_movimentacao_ranking_liga",params\)/i);
assert.match(app, /buildRankingMovementFromRows\(\{ranking:state\.ranking,rows:state\.leagueRankingMovement\}\)/i);

console.log("Migração da movimentação do Ranking verificada com sucesso.");
