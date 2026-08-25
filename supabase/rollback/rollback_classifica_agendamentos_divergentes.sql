select pg_advisory_xact_lock(hashtext('bolao_2026_agendamentos_divergentes'));

do $rollback$
begin
  if not exists (
    select 1 from public.transicao_api_execucoes
    where detalhes ->> 'tipo' = 'correcao_agendamentos_divergentes'
      and detalhes ->> 'fase_migracao' = '5B.3-corretiva'
  ) then
    raise exception 'agendamento_rollback_auditoria_ausente';
  end if;
  if not exists (
    select 1 from public.jogos
    where id_jogo = 554887
      and inicio = timestamptz '2026-05-10 19:00:00+00'
      and situacao_agendamento = 'confirmado'
      and fonte_agendamento = 'cbf'
  ) then
    raise exception 'agendamento_rollback_estado_divergente';
  end if;
end
$rollback$;

update public.jogos
set inicio = timestamptz '2026-05-10 20:40:00+00'
where id_jogo = 554887
  and inicio = timestamptz '2026-05-10 19:00:00+00';

drop table public.jogos_agendamento_observacoes;

alter table public.jogos
  drop constraint jogos_situacao_agendamento_valida,
  drop column situacao_agendamento,
  drop column fonte_agendamento,
  drop column agendamento_confirmado_em,
  drop column data_base;

update public.transicao_api_execucoes
set detalhes = detalhes || jsonb_build_object('revertida_em', now(), 'rollback', true)
where detalhes ->> 'tipo' = 'correcao_agendamentos_divergentes'
  and detalhes ->> 'fase_migracao' = '5B.3-corretiva'
  and not (detalhes ? 'revertida_em');
