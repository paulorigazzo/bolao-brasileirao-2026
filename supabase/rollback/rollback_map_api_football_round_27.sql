-- Rollback operacional do mapeamento da Rodada 27.
-- Executar somente com autorização específica e antes de dependências posteriores.

begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $rollback$
declare
  expected_hash constant text := '1da24b4c152ba53ee0a5fab2025847433a78f34eb565141c78087e009dd96d4b';
  audit_record record;
  restored_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('bolao:api-football:mapeamento:rodada-27'));
  lock table public.jogos in share row exclusive mode;

  select id, detalhes into audit_record
  from public.transicao_api_execucoes
  where detalhes->>'tipo' = 'reconciliacao_mapeamentos'
    and detalhes->>'fase_migracao' = 'rodada_27'
    and detalhes->>'hash_reconciliacao' = expected_hash
  order by id desc limit 1;
  if audit_record.id is null then raise exception 'api_football_round_27_rollback_audit_missing'; end if;
  if jsonb_array_length(audit_record.detalhes->'mapeamentos') <> 10 then
    raise exception 'api_football_round_27_rollback_audit_count_mismatch';
  end if;
  if exists (
    select 1 from jsonb_array_elements(audit_record.detalhes->'mapeamentos') item
    join public.jogos j on j.id_jogo = (item->>'id_jogo')::bigint
    where (j.api_football_id, j.api_football_time_casa_id, j.api_football_time_fora_id)
      is distinct from ((item->>'api_football_id')::bigint, (item->>'api_football_time_casa_id')::bigint,
        (item->>'api_football_time_fora_id')::bigint)
  ) then raise exception 'api_football_round_27_rollback_state_diverged'; end if;

  update public.jogos j
  set api_football_id = null,
      api_football_time_casa_id = null,
      api_football_time_fora_id = null,
      api_football_mapeado_em = null
  from jsonb_array_elements(audit_record.detalhes->'mapeamentos') item
  where j.id_jogo = (item->>'id_jogo')::bigint;
  get diagnostics restored_count = row_count;
  if restored_count <> 10 then raise exception 'api_football_round_27_rollback_count_mismatch'; end if;

  update public.transicao_api_execucoes
  set detalhes = detalhes || jsonb_build_object('rollback_executado_em', transaction_timestamp(), 'rollback_quantidade', restored_count)
  where id = audit_record.id;
end
$rollback$;

commit;
