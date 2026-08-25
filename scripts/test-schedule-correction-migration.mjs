import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/20260825190000_classifica_agendamentos_divergentes.sql",import.meta.url),"utf8");
const rollback=readFileSync(new URL("../supabase/rollback/rollback_classifica_agendamentos_divergentes.sql",import.meta.url),"utf8");

assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/detalhes ->> 'hash_reconciliacao'/);
assert.match(migration,/mapping_hash_current/);
assert.match(migration,/agendamento_mapeamentos_completos_divergentes/);
assert.match(migration,/agendamento_mapeamentos_nulos_divergentes/);
assert.match(migration,/agendamento_mapeamentos_parciais_detectados/);
assert.doesNotMatch(migration,/detalhes ->> 'estado_competitivo_hash_depois'/);
assert.match(migration,/id_jogo = 554887[\s\S]*2026-05-10 20:40:00\+00/);
assert.match(migration,/inicio = timestamptz '2026-05-10 19:00:00\+00'/);
assert.match(migration,/id_jogo in \(554940,554941,554942,554948\)/);
assert.match(migration,/rodada between 27 and 38/);
assert.match(migration,/situacao_agendamento in \('confirmado','provisorio','adiado_sem_data'\)/);
assert.match(migration,/enable row level security/);
assert.match(migration,/revoke all on table public\.jogos_agendamento_observacoes from public, anon, authenticated, service_role/);
assert.match(migration,/grant select, insert on table public\.jogos_agendamento_observacoes to service_role/);
assert.doesNotMatch(migration,/grant (?:all|delete|update).*jogos_agendamento_observacoes/i);
assert.match(migration,/agendamento_observacoes_pos_condicao_divergente/);
assert.match(migration,/agendamento_estado_competitivo_nao_autorizado_alterado/);
assert.match(rollback,/agendamento_rollback_auditoria_ausente/);
assert.match(rollback,/2026-05-10 20:40:00\+00/);

console.log("Migration corretiva de agendamentos verificada com sucesso.");
