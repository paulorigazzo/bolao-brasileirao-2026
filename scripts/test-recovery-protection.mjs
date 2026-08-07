import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRecoveryProtectionModel, recoveryOriginLabel } from "../js/recovery-protection.js";

assert.equal(buildRecoveryProtectionModel({jogos_sem_snapshot:0,divergencias:0}).tone,"ok");
assert.equal(buildRecoveryProtectionModel({jogos_sem_snapshot:1,divergencias:0}).tone,"warning");
assert.equal(buildRecoveryProtectionModel(null).tone,"error");
assert.equal(recoveryOriginLabel("finalizacao"),"Finalização de jogo");

const sql=readFileSync(new URL("../supabase/migrations/20260807120000_v6_16_0_resumo_recuperacao_adm.sql",import.meta.url),"utf8");
assert.match(sql,/security definer\s+set search_path = pg_catalog, public, private/i);
assert.match(sql,/auth\.uid\(\) is null/i);
assert.match(sql,/administrador is true/i);
assert.match(sql,/status = 'approved'/i);
assert.match(sql,/revoke all on function public\.obter_resumo_protecao_recuperacao\(\) from public/i);
assert.match(sql,/grant execute on function public\.obter_resumo_protecao_recuperacao\(\) to authenticated/i);
assert.doesNotMatch(sql,/select\s+(email|usuario|user_id)(?:\s|,).*from\s+private/i);
assert.doesNotMatch(sql,/(update|delete|insert)\s+(into|from)?\s*(public|private)\./i);
console.log("Proteção de recuperação e contrato administrativo verificados.");
