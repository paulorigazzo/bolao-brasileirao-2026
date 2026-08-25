-- Executar somente depois de desativar a 5B.3B e confirmar que nenhuma evidência
-- usa a chave. O bloqueio preserva a auditabilidade das execuções já coletadas.

do $$
begin
  if exists (
    select 1 from public.transicao_api_execucoes
    where chave_idempotencia is not null
  ) then
    raise exception 'rollback_5b3b_blocked:idempotency_keys_in_use';
  end if;
end;
$$;

drop index public.transicao_api_execucoes_chave_idempotencia_uidx;

alter table public.transicao_api_execucoes
  drop constraint transicao_api_execucoes_chave_idempotencia_formato,
  drop column chave_idempotencia;
