-- Completa os 115 vínculos restantes da temporada 2026 após reconciliação
-- por rodada, mando e clubes. Horários divergentes permanecem fora da identidade.
-- Não altera agenda, clubes canônicos, placares, status, palpites ou pontuação.

set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $migration$
declare
  expected_hash constant text := '90fc90cd14e73e3654acef3f3ca2318ecd679436d76be762d9e6d46dc4da2b67';
  calculated_hash text;
  competitive_hash_before text;
  competitive_hash_after text;
  mapping_timestamp timestamptz := transaction_timestamp();
  updated_count integer;
  audit_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('bolao:api-football:mapeamento-final-2026'));
  lock table public.jogos in share row exclusive mode;

  create temporary table api_football_mapeamentos_finais_2026 (
    id_jogo bigint primary key,
    api_football_id bigint not null unique,
    api_football_time_casa_id bigint not null,
    api_football_time_fora_id bigint not null
  ) on commit drop;

  insert into api_football_mapeamentos_finais_2026
    (id_jogo, api_football_id, api_football_time_casa_id, api_football_time_fora_id)
  values
    (554887, 1492257, 1198, 121),
    (554940, 1492310, 1062, 794),
    (554941, 1492311, 120, 130),
    (554942, 1492312, 132, 133),
    (554948, 1492318, 126, 128),
    (555010, 1492380, 134, 118),
    (555011, 1492381, 1062, 132),
    (555012, 1492382, 131, 124),
    (555013, 1492383, 127, 794),
    (555014, 1492384, 130, 121),
    (555015, 1492385, 7848, 120),
    (555016, 1492386, 1198, 128),
    (555017, 1492387, 126, 119),
    (555018, 1492388, 133, 147),
    (555019, 1492389, 136, 135),
    (555020, 1492390, 134, 1062),
    (555021, 1492391, 120, 133),
    (555022, 1492392, 794, 7848),
    (555023, 1492393, 135, 126),
    (555024, 1492394, 124, 147),
    (555025, 1492395, 119, 131),
    (555026, 1492396, 121, 118),
    (555027, 1492397, 1198, 130),
    (555028, 1492398, 128, 127),
    (555029, 1492399, 136, 132),
    (555030, 1492400, 1062, 128),
    (555031, 1492401, 118, 7848),
    (555032, 1492402, 794, 135),
    (555033, 1492403, 132, 134),
    (555034, 1492404, 147, 120),
    (555035, 1492405, 127, 124),
    (555036, 1492406, 130, 119),
    (555037, 1492407, 121, 131),
    (555038, 1492408, 126, 136),
    (555039, 1492409, 133, 1198),
    (555040, 1492410, 134, 121),
    (555041, 1492411, 1062, 147),
    (555042, 1492412, 118, 127),
    (555043, 1492413, 120, 132),
    (555044, 1492414, 131, 136),
    (555045, 1492415, 124, 128),
    (555046, 1492416, 130, 135),
    (555047, 1492417, 7848, 119),
    (555048, 1492418, 1198, 794),
    (555049, 1492419, 126, 133),
    (555050, 1492420, 132, 124),
    (555051, 1492421, 147, 130),
    (555052, 1492422, 135, 1198),
    (555053, 1492423, 127, 1062),
    (555054, 1492424, 119, 120),
    (555055, 1492425, 7848, 126),
    (555056, 1492426, 121, 794),
    (555057, 1492427, 128, 118),
    (555058, 1492428, 133, 131),
    (555059, 1492429, 136, 134),
    (555060, 1492430, 1062, 135),
    (555061, 1492431, 118, 126),
    (555062, 1492432, 794, 132),
    (555063, 1492433, 131, 7848),
    (555064, 1492434, 147, 136),
    (555065, 1492435, 124, 119),
    (555066, 1492436, 130, 134),
    (555067, 1492437, 1198, 120),
    (555068, 1492438, 128, 121),
    (555069, 1492439, 133, 127),
    (555070, 1492440, 134, 133),
    (555071, 1492441, 120, 1062),
    (555072, 1492442, 794, 128),
    (555073, 1492443, 132, 7848),
    (555074, 1492444, 135, 118),
    (555075, 1492445, 127, 130),
    (555076, 1492446, 119, 147),
    (555077, 1492447, 121, 1198),
    (555078, 1492448, 126, 131),
    (555079, 1492449, 136, 124),
    (555080, 1492450, 131, 120),
    (555081, 1492451, 147, 128),
    (555082, 1492452, 135, 121),
    (555083, 1492453, 127, 134),
    (555084, 1492454, 130, 118),
    (555085, 1492455, 7848, 1062),
    (555086, 1492456, 1198, 132),
    (555087, 1492457, 126, 124),
    (555088, 1492458, 133, 119),
    (555089, 1492459, 136, 794),
    (555090, 1492460, 134, 1198),
    (555091, 1492461, 1062, 131),
    (555092, 1492462, 118, 147),
    (555093, 1492463, 120, 126),
    (555094, 1492464, 794, 133),
    (555095, 1492465, 132, 135),
    (555096, 1492466, 124, 7848),
    (555097, 1492467, 119, 136),
    (555098, 1492468, 121, 127),
    (555099, 1492469, 128, 130),
    (555100, 1492470, 1062, 133),
    (555101, 1492471, 120, 118),
    (555102, 1492472, 132, 121),
    (555103, 1492473, 131, 130),
    (555104, 1492474, 147, 127),
    (555105, 1492475, 124, 135),
    (555106, 1492476, 119, 794),
    (555107, 1492477, 7848, 134),
    (555108, 1492478, 126, 1198),
    (555109, 1492479, 136, 128),
    (555110, 1492480, 134, 126),
    (555111, 1492481, 118, 1062),
    (555112, 1492482, 794, 124),
    (555113, 1492483, 135, 119),
    (555114, 1492484, 127, 132),
    (555115, 1492485, 130, 7848),
    (555116, 1492486, 121, 147),
    (555117, 1492487, 1198, 131),
    (555118, 1492488, 128, 120),
    (555119, 1492489, 133, 136);

  select encode(sha256(convert_to(
    '[' || string_agg(
      format('{"canonicalGameId":%s,"providerFixtureId":%s,"providerHomeTeamId":%s,"providerAwayTeamId":%s}',
        id_jogo, api_football_id, api_football_time_casa_id, api_football_time_fora_id),
      ',' order by id_jogo
    ) || ']', 'UTF8')), 'hex')
  into calculated_hash
  from api_football_mapeamentos_finais_2026;

  if calculated_hash <> expected_hash then
    raise exception 'api_football_final_mapping_hash_mismatch: expected %, got %', expected_hash, calculated_hash;
  end if;
  if (select count(*) from public.jogos) <> 380 then
    raise exception 'api_football_final_canonical_count_mismatch';
  end if;
  if (select count(*) from api_football_mapeamentos_finais_2026) <> 115 then
    raise exception 'api_football_final_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos where api_football_id is not null) <> 265 then
    raise exception 'api_football_final_previous_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos j join api_football_mapeamentos_finais_2026 m using (id_jogo)) <> 115 then
    raise exception 'api_football_final_canonical_ids_missing';
  end if;
  if exists (
    select 1 from public.jogos j
    join api_football_mapeamentos_finais_2026 m using (id_jogo)
    where j.api_football_id is not null
       or j.api_football_time_casa_id is not null
       or j.api_football_time_fora_id is not null
       or j.api_football_mapeado_em is not null
  ) then raise exception 'api_football_final_existing_mapping_detected'; end if;
  if exists (
    select 1 from public.jogos j
    join api_football_mapeamentos_finais_2026 m on j.api_football_id = m.api_football_id
  ) then raise exception 'api_football_final_fixture_already_used'; end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into competitive_hash_before from public.jogos j;

  update public.jogos j
  set api_football_id = m.api_football_id,
      api_football_time_casa_id = m.api_football_time_casa_id,
      api_football_time_fora_id = m.api_football_time_fora_id,
      api_football_mapeado_em = mapping_timestamp
  from api_football_mapeamentos_finais_2026 m
  where j.id_jogo = m.id_jogo
    and j.api_football_id is null
    and j.api_football_time_casa_id is null
    and j.api_football_time_fora_id is null
    and j.api_football_mapeado_em is null;
  get diagnostics updated_count = row_count;
  if updated_count <> 115 then
    raise exception 'api_football_final_updated_count_mismatch: expected 115, got %', updated_count;
  end if;

  if (select count(*) from public.jogos where api_football_id is not null) <> 380 then
    raise exception 'api_football_final_post_mapping_count_mismatch';
  end if;
  if exists (
    select 1 from public.jogos
    where api_football_id is null
       or api_football_time_casa_id is null
       or api_football_time_fora_id is null
       or api_football_mapeado_em is null
  ) then raise exception 'api_football_final_mapping_incomplete'; end if;
  if exists (
    select api_football_id from public.jogos
    group by api_football_id having count(*) > 1
  ) then raise exception 'api_football_final_fixture_duplicate'; end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into competitive_hash_after from public.jogos j;
  if competitive_hash_after <> competitive_hash_before then
    raise exception 'api_football_final_competitive_state_changed';
  end if;

  insert into public.transicao_api_execucoes (
    fase, fonte_oficial, fonte_sombra, concluida_em,
    sucesso_oficial, sucesso_sombra, jogos_oficial, jogos_sombra, detalhes
  ) values (
    'sombra_pos_corte', 'api-football', 'football-data.org', mapping_timestamp,
    true, true, 115, 115,
    jsonb_build_object(
      'tipo', 'reconciliacao_mapeamentos',
      'fase_migracao', 'mapeamento_final_2026',
      'hash_reconciliacao', expected_hash,
      'quantidade_mapeada', 115,
      'quantidade_total_apos', 380,
      'estado_competitivo_hash_antes', competitive_hash_before,
      'estado_competitivo_hash_depois', competitive_hash_after,
      'mapeado_em', mapping_timestamp,
      'mapeamentos', (select jsonb_agg(to_jsonb(m) order by m.id_jogo) from api_football_mapeamentos_finais_2026 m)
    )
  ) returning id into audit_id;
  if audit_id is null then raise exception 'api_football_final_audit_missing'; end if;
end
$migration$;
