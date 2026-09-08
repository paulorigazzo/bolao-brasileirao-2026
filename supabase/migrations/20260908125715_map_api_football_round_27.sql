-- Mapeia exclusivamente os dez jogos da Rodada 27 já reconciliados em produção.
-- Não altera agenda, clubes canônicos, placares, status, palpites ou pontuação.

set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $migration$
declare
  expected_hash constant text := '1da24b4c152ba53ee0a5fab2025847433a78f34eb565141c78087e009dd96d4b';
  calculated_hash text;
  competitive_hash_before text;
  competitive_hash_after text;
  mapping_timestamp timestamptz := transaction_timestamp();
  updated_count integer;
  audit_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('bolao:api-football:mapeamento:rodada-27'));
  lock table public.jogos in share row exclusive mode;

  create temporary table api_football_mapeamentos_rodada_27 (
    id_jogo bigint primary key,
    api_football_id bigint not null unique,
    api_football_time_casa_id bigint not null,
    api_football_time_fora_id bigint not null
  ) on commit drop;

  insert into api_football_mapeamentos_rodada_27
    (id_jogo, api_football_id, api_football_time_casa_id, api_football_time_fora_id)
  values
    (555000, 1492370, 1062, 124),
    (555001, 1492371, 118, 1198),
    (555002, 1492372, 120, 794),
    (555003, 1492373, 132, 119),
    (555004, 1492374, 147, 134),
    (555005, 1492375, 127, 131),
    (555006, 1492376, 130, 133),
    (555007, 1492377, 7848, 136),
    (555008, 1492378, 121, 126),
    (555009, 1492379, 128, 135);

  select encode(sha256(convert_to(
    '[' || string_agg(
      format('{"canonicalGameId":%s,"providerFixtureId":%s,"providerHomeTeamId":%s,"providerAwayTeamId":%s}',
        id_jogo, api_football_id, api_football_time_casa_id, api_football_time_fora_id),
      ',' order by id_jogo
    ) || ']', 'UTF8')), 'hex')
  into calculated_hash
  from api_football_mapeamentos_rodada_27;

  if calculated_hash <> expected_hash then
    raise exception 'api_football_round_27_hash_mismatch: expected %, got %', expected_hash, calculated_hash;
  end if;
  if (select count(*) from api_football_mapeamentos_rodada_27) <> 10 then
    raise exception 'api_football_round_27_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos where rodada = 27) <> 10 then
    raise exception 'api_football_round_27_canonical_count_mismatch';
  end if;
  if (select count(*) from public.jogos j join api_football_mapeamentos_rodada_27 m using (id_jogo) where j.rodada = 27) <> 10 then
    raise exception 'api_football_round_27_canonical_ids_missing';
  end if;
  if (select count(*) from public.jogos where api_football_id is not null) <> 255 then
    raise exception 'api_football_round_27_previous_mapping_count_mismatch';
  end if;
  if exists (
    select 1 from public.jogos j
    join api_football_mapeamentos_rodada_27 m using (id_jogo)
    where j.api_football_id is not null
       or j.api_football_time_casa_id is not null
       or j.api_football_time_fora_id is not null
       or j.api_football_mapeado_em is not null
  ) then raise exception 'api_football_round_27_existing_mapping_detected'; end if;
  if exists (
    select 1 from public.jogos j
    join api_football_mapeamentos_rodada_27 m on j.api_football_id = m.api_football_id
  ) then raise exception 'api_football_round_27_fixture_already_used'; end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into competitive_hash_before from public.jogos j;

  update public.jogos j
  set api_football_id = m.api_football_id,
      api_football_time_casa_id = m.api_football_time_casa_id,
      api_football_time_fora_id = m.api_football_time_fora_id,
      api_football_mapeado_em = mapping_timestamp
  from api_football_mapeamentos_rodada_27 m
  where j.id_jogo = m.id_jogo
    and j.api_football_id is null
    and j.api_football_time_casa_id is null
    and j.api_football_time_fora_id is null
    and j.api_football_mapeado_em is null;
  get diagnostics updated_count = row_count;
  if updated_count <> 10 then raise exception 'api_football_round_27_updated_count_mismatch: %', updated_count; end if;

  if (select count(*) from public.jogos where api_football_id is not null) <> 265 then
    raise exception 'api_football_round_27_post_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos where api_football_id is null and api_football_time_casa_id is null
      and api_football_time_fora_id is null and api_football_mapeado_em is null) <> 115 then
    raise exception 'api_football_round_27_remaining_null_count_mismatch';
  end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into competitive_hash_after from public.jogos j;
  if competitive_hash_after <> competitive_hash_before then
    raise exception 'api_football_round_27_competitive_state_changed';
  end if;

  insert into public.transicao_api_execucoes (
    fase, fonte_oficial, fonte_sombra, concluida_em,
    sucesso_oficial, sucesso_sombra, jogos_oficial, jogos_sombra, detalhes
  ) values (
    'sombra_pos_corte', 'api-football', 'football-data.org', mapping_timestamp,
    true, true, 10, 10,
    jsonb_build_object(
      'tipo', 'reconciliacao_mapeamentos',
      'fase_migracao', 'rodada_27',
      'hash_reconciliacao', expected_hash,
      'quantidade_mapeada', 10,
      'estado_competitivo_hash_antes', competitive_hash_before,
      'estado_competitivo_hash_depois', competitive_hash_after,
      'mapeado_em', mapping_timestamp,
      'mapeamentos', (select jsonb_agg(to_jsonb(m) order by m.id_jogo) from api_football_mapeamentos_rodada_27 m)
    )
  ) returning id into audit_id;
  if audit_id is null then raise exception 'api_football_round_27_audit_missing'; end if;
end
$migration$;
