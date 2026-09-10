begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $rollback$
declare
  v_audit jsonb;
  v_restored integer;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('bolao:backfill-lineup-reserves-round-26', 0)) then
    raise exception 'rollback_lineup_reserves_round_26_lock_unavailable';
  end if;

  select detalhes
  into v_audit
  from public.api_sync_log
  where origem = 'migration:backfill-lineup-reserves-round-26'
    and sucesso is true
  order by criado_em desc
  limit 1;

  if v_audit is null
     or v_audit ->> 'contract' <> 'round26-lineup-reserves-refresh-v1'
     or jsonb_array_length(v_audit -> 'backup') <> 10 then
    raise exception 'rollback_lineup_reserves_round_26_backup_unavailable';
  end if;

  lock table public.detalhes_partida_cache in share row exclusive mode;

  if (
    select count(*)
    from public.detalhes_partida_cache d
    join jsonb_each_text(v_audit -> 'newHashes') expected
      on expected.key = d.id_jogo::text
    where d.hash_escalacoes = expected.value
  ) <> 10 then
    raise exception 'rollback_lineup_reserves_round_26_current_state_changed';
  end if;

  update public.detalhes_partida_cache d
  set escalacoes = backup.item -> 'escalacoes',
      hash_escalacoes = backup.item ->> 'hash_escalacoes',
      escalacoes_observadas_em = (backup.item ->> 'escalacoes_observadas_em')::timestamptz,
      atualizado_em = (backup.item ->> 'atualizado_em')::timestamptz
  from jsonb_array_elements(v_audit -> 'backup') backup(item)
  where d.id_jogo = (backup.item ->> 'id_jogo')::bigint;

  get diagnostics v_restored = row_count;
  if v_restored <> 10 then
    raise exception 'rollback_lineup_reserves_round_26_restore_count_invalid:%', v_restored;
  end if;

  insert into public.api_sync_log (origem, sucesso, duracao_ms, chamadas_api, jogos_atualizados, detalhes)
  values (
    'rollback:backfill-lineup-reserves-round-26',
    true,
    0,
    0,
    10,
    jsonb_build_object(
      'contract', 'round26-lineup-reserves-refresh-v1',
      'round', 26,
      'restoredFromBackup', true
    )
  );
end
$rollback$;

commit;
