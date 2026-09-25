import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql=readFileSync(new URL("../supabase/migrations/20260925173008_confirmar_datas_rodada_21_cbf.sql",import.meta.url),"utf8");
assert.match(sql,/id_jogo=554948[\s\S]*?2026-10-02 23:00:00\+00/);
assert.match(sql,/id_jogo=554940[\s\S]*?2026-10-03 21:30:00\+00/);
assert.match(sql,/id_jogo=554942[\s\S]*?adiado_sem_data/);
assert.match(sql,/status='agendado' and situacao_agendamento='provisorio'/);
assert.match(sql,/gols_casa is null and gols_fora is null/);
assert.match(sql,/to_jsonb\(j\) - array\['situacao_agendamento','fonte_agendamento','agendamento_confirmado_em'\]/);
assert.match(sql,/r21_agenda_chapecoense_alterada/);
assert.match(sql,/insert into public\.jogos_agendamento_observacoes/);
const update=sql.match(/update public\.jogos\s+set ([\s\S]*?)\s+where id_jogo in \(554940,554948\);/)?.[1];
assert.ok(update,"A atualização deve atingir somente os dois jogos aprovados.");
assert.deepEqual([...update.matchAll(/([a-z_]+)=/g)].map(match=>match[1]),["situacao_agendamento","fonte_agendamento","agendamento_confirmado_em"]);
console.log("Migração R21 verificada: pré-condições, evidência e campos alterados.");
