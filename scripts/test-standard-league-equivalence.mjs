import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const auditPath = fileURLToPath(new URL("../supabase/tests/standard-league-equivalence.sql", import.meta.url));
const sql = readFileSync(auditPath, "utf8");

assert.match(sql, /^begin;/im);
assert.match(sql, /^rollback;/im);
assert.doesNotMatch(sql, /^commit;/im);
assert.match(sql, /L04_OK: equivalência, isolamento, retroatividade e rollback comprovados/i);
for (const table of ["jogos", "palpites", "participantes", "participantes_autorizados"]) {
  assert.match(sql, new RegExp(`'${table}'::text objeto|'${table}',count`, "i"));
  assert.doesNotMatch(sql, new RegExp(`(?:insert into|update|delete from) public\\.${table}\\b`, "i"));
}
assert.match(sql, /group by user_id,id_jogo having count\(\*\)>1/i);
assert.match(sql, /public\.calcular_pontos\(/i);
assert.match(sql, /obter_palpites_encerrados_liga/i);
assert.match(sql, /except select \* from l04_real_por_palpite/i);
assert.match(sql, /menor unidade participante-partida/i);
assert.match(sql, /row_number\(\) over\(order by pontos desc,exatos desc,nome\)/i);
assert.match(sql, /\(encerr\|finaliz\|awarded\)/i);
assert.match(sql, /\(cancel\|anulad\)/i);
assert.match(sql, /except select \* from l04_real_oficial/i);
assert.match(sql, /generate_series\(1,38\)/i);
assert.match(sql, /obter_ranking_provisorio_liga/i);
assert.match(sql, /except select \* from l04_real_provisorio/i);
for (const state of ["finished", "live", "suspended", "postponed", "future", "cancelled"]) {
  assert.match(sql, new RegExp(`'${state}'`, "i"));
}
for (const code of ["l04-sintetica-a", "l04-sintetica-b"]) assert.match(sql, new RegExp(code, "i"));
assert.match(sql, /set local role authenticated/i);
assert.match(sql, /grant select on l04_contexto to authenticated/i);
assert.match(sql, /grant insert,select on l04_real_oficial to authenticated/i);
assert.match(sql, /grant insert,select on l04_retroativo to authenticated/i);
assert.match(sql, /RPC permitiu acesso cruzado entre ligas/i);
assert.match(sql, /adesão retroativa retornou/i);
assert.match(sql, /entrou_em,adicionado_por/i);
assert.match(sql, /ranking sintético deveria conter exatamente dois membros/i);
assert.doesNotMatch(sql, /create\s+(?:or\s+replace\s+)?(?:function|view|policy|trigger)\b/i);
assert.doesNotMatch(sql, /alter\s+table\b/i);
assert.doesNotMatch(sql, /drop\s+(?:table|function|view|policy|trigger)\b/i);

console.log("Contrato transacional da equivalência da Liga Standard verificado com sucesso.");
