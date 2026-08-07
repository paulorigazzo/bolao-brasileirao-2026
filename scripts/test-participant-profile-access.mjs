import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migrationPath=fileURLToPath(new URL(
  "../supabase/migrations/20260806234749_v6_15_2_acesso_perfis_ranking.sql",
  import.meta.url
));
const sql=readFileSync(migrationPath,"utf8");

assert.match(sql,/create or replace function public\.email_autorizado\(\)/i);
assert.match(sql,/security invoker/i);
assert.match(sql,/set search_path = pg_catalog, public/i);
assert.match(sql,/from public\.participantes_autorizados pa/i);
assert.match(sql,/lower\(pa\.email\).*auth\.jwt\(\)/is);
assert.match(sql,/pa\.ativo is true/i);
assert.match(sql,/coalesce\(pa\.status, 'approved'\) = 'approved'/i);
assert.match(sql,/revoke all on function public\.email_autorizado\(\) from public/i);
assert.match(sql,/revoke all on function public\.email_autorizado\(\) from anon/i);
assert.match(sql,/grant execute on function public\.email_autorizado\(\) to authenticated/i);
assert.match(sql,/using \(\(select public\.email_autorizado\(\)\)\)/i);

assert.doesNotMatch(sql,/rigazzo@gmail\.com/i);
assert.doesNotMatch(sql,/update\s+public\.(participantes|palpites)/i);
assert.doesNotMatch(sql,/delete\s+from\s+public\.(participantes|palpites)/i);

const hasGlobalAccess=({authenticated=true,ativo,status})=>
  authenticated && ativo===true && (status??"approved")==="approved";

assert.equal(hasGlobalAccess({ativo:true,status:"approved"}),true);
assert.equal(hasGlobalAccess({ativo:false,status:"approved"}),false);
assert.equal(hasGlobalAccess({ativo:true,status:"pending"}),false);
assert.equal(hasGlobalAccess({ativo:true,status:"rejected"}),false);
assert.equal(hasGlobalAccess({ativo:true,status:"inactive"}),false);
assert.equal(hasGlobalAccess({authenticated:false,ativo:true,status:"approved"}),false);

console.log("Contrato de acesso aos perfis do Ranking verificado com sucesso.");
