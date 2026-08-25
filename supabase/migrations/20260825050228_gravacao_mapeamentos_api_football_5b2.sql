-- Fase 5B.2: grava somente os 255 mapeamentos aprovados na reconciliação seca.
-- A football-data.org permanece como fonte oficial. Nenhum dado competitivo é alterado.
-- Aplicação remota exige revisão e autorização humanas específicas.

set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $migration$
declare
  expected_hash constant text := 'eba86a38c9514427d04d2d23547ce25c5366547d5051c014bbb35dbc0c0bbe1f';
  calculated_hash text;
  competitive_hash_before text;
  competitive_hash_after text;
  mapping_timestamp timestamptz := transaction_timestamp();
  updated_count integer;
  audit_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('bolao:api-football-mapeamentos-5b2'));
  lock table public.jogos in share row exclusive mode;

  create temporary table api_football_mapeamentos_5b2 (
    id_jogo bigint primary key,
    api_football_id bigint not null unique,
    api_football_time_casa_id bigint not null,
    api_football_time_fora_id bigint not null
  ) on commit drop;

  insert into api_football_mapeamentos_5b2
    (id_jogo, api_football_id, api_football_time_casa_id, api_football_time_fora_id)
  values
    (554740, 1492110, 1062, 121),
    (554741, 1492111, 120, 135),
    (554742, 1492112, 132, 128),
    (554743, 1492113, 131, 118),
    (554744, 1492114, 147, 794),
    (554745, 1492115, 124, 130),
    (554746, 1492116, 119, 134),
    (554747, 1492117, 7848, 133),
    (554748, 1492118, 126, 127),
    (554749, 1492119, 136, 1198),
    (554750, 1492120, 134, 131),
    (554751, 1492121, 118, 124),
    (554752, 1492122, 794, 1062),
    (554753, 1492123, 135, 147),
    (554754, 1492124, 127, 119),
    (554755, 1492125, 130, 120),
    (554756, 1492126, 121, 136),
    (554757, 1492127, 1198, 7848),
    (554758, 1492128, 128, 126),
    (554759, 1492129, 133, 132),
    (554760, 1492130, 134, 128),
    (554761, 1492131, 1062, 1198),
    (554762, 1492132, 132, 147),
    (554763, 1492133, 131, 794),
    (554764, 1492134, 124, 120),
    (554765, 1492135, 119, 121),
    (554766, 1492136, 7848, 135),
    (554767, 1492137, 126, 130),
    (554768, 1492138, 133, 118),
    (554769, 1492139, 136, 127),
    (554770, 1492140, 118, 132),
    (554771, 1492141, 120, 136),
    (554772, 1492142, 794, 134),
    (554773, 1492143, 147, 126),
    (554774, 1492144, 135, 131),
    (554775, 1492145, 127, 7848),
    (554776, 1492146, 130, 1062),
    (554777, 1492147, 121, 124),
    (554778, 1492148, 1198, 119),
    (554779, 1492149, 128, 133),
    (554780, 1492150, 134, 120),
    (554781, 1492151, 1062, 119),
    (554782, 1492152, 118, 136),
    (554783, 1492153, 131, 147),
    (554784, 1492154, 127, 135),
    (554785, 1492155, 130, 794),
    (554786, 1492156, 7848, 128),
    (554787, 1492157, 1198, 124),
    (554788, 1492158, 126, 132),
    (554789, 1492159, 133, 121),
    (554790, 1492160, 120, 127),
    (554791, 1492161, 794, 126),
    (554792, 1492162, 132, 130),
    (554793, 1492163, 147, 1198),
    (554794, 1492164, 135, 133),
    (554795, 1492165, 124, 134),
    (554796, 1492166, 119, 118),
    (554797, 1492167, 121, 7848),
    (554798, 1492168, 128, 131),
    (554799, 1492169, 136, 1062),
    (554800, 1492170, 134, 135),
    (554801, 1492171, 1062, 126),
    (554802, 1492172, 118, 794),
    (554803, 1492173, 132, 131),
    (554804, 1492174, 127, 1198),
    (554805, 1492175, 130, 136),
    (554806, 1492176, 7848, 147),
    (554807, 1492177, 121, 120),
    (554808, 1492178, 128, 119),
    (554809, 1492179, 133, 124),
    (554810, 1492180, 134, 147),
    (554811, 1492181, 794, 120),
    (554812, 1492182, 131, 127),
    (554813, 1492183, 135, 128),
    (554814, 1492184, 124, 1062),
    (554815, 1492185, 119, 132),
    (554816, 1492186, 1198, 118),
    (554817, 1492187, 126, 121),
    (554818, 1492188, 133, 130),
    (554819, 1492189, 136, 7848),
    (554820, 1492190, 118, 134),
    (554821, 1492191, 120, 7848),
    (554822, 1492192, 794, 127),
    (554823, 1492193, 132, 1062),
    (554824, 1492194, 147, 133),
    (554825, 1492195, 135, 136),
    (554826, 1492196, 124, 131),
    (554827, 1492197, 119, 126),
    (554828, 1492198, 121, 130),
    (554829, 1492199, 128, 1198),
    (554830, 1492200, 1062, 134),
    (554831, 1492201, 118, 121),
    (554832, 1492202, 132, 136),
    (554833, 1492203, 131, 119),
    (554834, 1492204, 147, 124),
    (554835, 1492205, 127, 128),
    (554836, 1492206, 130, 1198),
    (554837, 1492207, 7848, 794),
    (554838, 1492208, 126, 135),
    (554839, 1492209, 133, 120),
    (554840, 1492210, 134, 132),
    (554841, 1492211, 120, 147),
    (554842, 1492212, 131, 121),
    (554843, 1492213, 135, 794),
    (554844, 1492214, 124, 127),
    (554845, 1492215, 119, 130),
    (554846, 1492216, 7848, 118),
    (554847, 1492217, 1198, 133),
    (554848, 1492218, 128, 1062),
    (554849, 1492219, 136, 126),
    (554850, 1492220, 794, 1198),
    (554851, 1492221, 132, 120),
    (554852, 1492222, 147, 1062),
    (554853, 1492223, 135, 130),
    (554854, 1492224, 127, 118),
    (554855, 1492225, 119, 7848),
    (554856, 1492226, 121, 134),
    (554857, 1492227, 128, 124),
    (554858, 1492228, 133, 126),
    (554859, 1492229, 136, 131),
    (554860, 1492230, 134, 136),
    (554861, 1492231, 1062, 127),
    (554862, 1492232, 118, 128),
    (554863, 1492233, 120, 119),
    (554864, 1492234, 794, 121),
    (554865, 1492235, 131, 133),
    (554866, 1492236, 124, 132),
    (554867, 1492237, 130, 147),
    (554868, 1492238, 1198, 135),
    (554869, 1492239, 126, 7848),
    (554870, 1492240, 134, 130),
    (554871, 1492241, 120, 1198),
    (554872, 1492242, 132, 794),
    (554873, 1492243, 135, 1062),
    (554874, 1492244, 127, 133),
    (554875, 1492245, 119, 124),
    (554876, 1492246, 7848, 131),
    (554877, 1492247, 121, 128),
    (554878, 1492248, 126, 118),
    (554879, 1492249, 136, 147),
    (554880, 1492250, 1062, 120),
    (554881, 1492251, 118, 135),
    (554882, 1492252, 131, 126),
    (554883, 1492253, 147, 119),
    (554884, 1492254, 124, 136),
    (554885, 1492255, 130, 127),
    (554886, 1492256, 7848, 132),
    (554888, 1492258, 128, 794),
    (554889, 1492259, 133, 134),
    (554890, 1492260, 134, 127),
    (554891, 1492261, 1062, 7848),
    (554892, 1492262, 118, 130),
    (554893, 1492263, 120, 131),
    (554894, 1492264, 794, 136),
    (554895, 1492265, 132, 1198),
    (554896, 1492266, 124, 126),
    (554897, 1492267, 119, 133),
    (554898, 1492268, 121, 135),
    (554899, 1492269, 128, 147),
    (554900, 1492270, 131, 1062),
    (554901, 1492271, 147, 118),
    (554902, 1492272, 135, 132),
    (554903, 1492273, 127, 121),
    (554904, 1492274, 130, 128),
    (554905, 1492275, 7848, 124),
    (554906, 1492276, 1198, 134),
    (554907, 1492277, 126, 120),
    (554908, 1492278, 133, 794),
    (554909, 1492279, 136, 119),
    (554910, 1492280, 134, 7848),
    (554911, 1492281, 118, 120),
    (554912, 1492282, 794, 119),
    (554913, 1492283, 135, 124),
    (554914, 1492284, 127, 147),
    (554915, 1492285, 130, 131),
    (554916, 1492286, 121, 132),
    (554917, 1492287, 1198, 126),
    (554918, 1492288, 128, 136),
    (554919, 1492289, 133, 1062),
    (554920, 1492290, 1062, 118),
    (554921, 1492291, 120, 128),
    (554922, 1492292, 132, 127),
    (554923, 1492293, 131, 1198),
    (554924, 1492294, 147, 121),
    (554925, 1492295, 124, 794),
    (554926, 1492296, 119, 135),
    (554927, 1492297, 7848, 130),
    (554928, 1492298, 126, 134),
    (554929, 1492299, 136, 133),
    (554930, 1492300, 134, 119),
    (554931, 1492301, 118, 131),
    (554932, 1492302, 794, 147),
    (554933, 1492303, 135, 120),
    (554934, 1492304, 127, 126),
    (554935, 1492305, 130, 124),
    (554936, 1492306, 121, 1062),
    (554937, 1492307, 1198, 136),
    (554938, 1492308, 128, 132),
    (554939, 1492309, 133, 7848),
    (554943, 1492313, 131, 134),
    (554944, 1492314, 147, 135),
    (554945, 1492315, 124, 118),
    (554946, 1492316, 119, 127),
    (554947, 1492317, 7848, 1198),
    (554949, 1492319, 136, 121),
    (554950, 1492320, 118, 133),
    (554951, 1492321, 120, 124),
    (554952, 1492322, 794, 131),
    (554953, 1492323, 147, 132),
    (554954, 1492324, 135, 7848),
    (554955, 1492325, 127, 136),
    (554956, 1492326, 130, 126),
    (554957, 1492327, 121, 119),
    (554958, 1492328, 1198, 1062),
    (554959, 1492329, 128, 134),
    (554960, 1492330, 134, 794),
    (554961, 1492331, 1062, 130),
    (554962, 1492332, 132, 118),
    (554963, 1492333, 131, 135),
    (554964, 1492334, 124, 121),
    (554965, 1492335, 119, 1198),
    (554966, 1492336, 7848, 127),
    (554967, 1492337, 126, 147),
    (554968, 1492338, 133, 128),
    (554969, 1492339, 136, 120),
    (554970, 1492340, 120, 134),
    (554971, 1492341, 794, 130),
    (554972, 1492342, 132, 126),
    (554973, 1492343, 147, 131),
    (554974, 1492344, 135, 127),
    (554975, 1492345, 124, 1198),
    (554976, 1492346, 119, 1062),
    (554977, 1492347, 121, 133),
    (554978, 1492348, 128, 7848),
    (554979, 1492349, 136, 118),
    (554980, 1492350, 134, 124),
    (554981, 1492351, 1062, 136),
    (554982, 1492352, 118, 119),
    (554983, 1492353, 131, 128),
    (554984, 1492354, 127, 120),
    (554985, 1492355, 130, 132),
    (554986, 1492356, 7848, 121),
    (554987, 1492357, 1198, 147),
    (554988, 1492358, 126, 794),
    (554989, 1492359, 133, 135),
    (554990, 1492360, 120, 121),
    (554991, 1492361, 794, 118),
    (554992, 1492362, 131, 132),
    (554993, 1492363, 147, 7848),
    (554994, 1492364, 135, 134),
    (554995, 1492365, 124, 133),
    (554996, 1492366, 119, 128),
    (554997, 1492367, 1198, 127),
    (554998, 1492368, 126, 1062),
    (554999, 1492369, 136, 130);

  select encode(sha256(convert_to(
    '[' || string_agg(
      format('{"canonicalGameId":%s,"providerFixtureId":%s,"providerHomeTeamId":%s,"providerAwayTeamId":%s}',
        id_jogo, api_football_id, api_football_time_casa_id, api_football_time_fora_id),
      ',' order by id_jogo
    ) || ']', 'UTF8')), 'hex')
  into calculated_hash
  from api_football_mapeamentos_5b2;

  if calculated_hash <> expected_hash then
    raise exception 'api_football_5b2_hash_mismatch: expected %, got %', expected_hash, calculated_hash;
  end if;
  if (select count(*) from public.jogos) <> 380 then
    raise exception 'api_football_5b2_canonical_count_mismatch';
  end if;
  if (select count(*) from api_football_mapeamentos_5b2) <> 255 then
    raise exception 'api_football_5b2_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos j join api_football_mapeamentos_5b2 m using (id_jogo)) <> 255 then
    raise exception 'api_football_5b2_canonical_ids_missing';
  end if;
  if exists (
    select 1 from public.jogos
    where api_football_id is not null
       or api_football_time_casa_id is not null
       or api_football_time_fora_id is not null
       or api_football_mapeado_em is not null
  ) then
    raise exception 'api_football_5b2_existing_mapping_detected';
  end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into competitive_hash_before
  from public.jogos j;

  update public.jogos j
  set api_football_id = m.api_football_id,
      api_football_time_casa_id = m.api_football_time_casa_id,
      api_football_time_fora_id = m.api_football_time_fora_id,
      api_football_mapeado_em = mapping_timestamp
  from api_football_mapeamentos_5b2 m
  where j.id_jogo = m.id_jogo
    and j.api_football_id is null
    and j.api_football_time_casa_id is null
    and j.api_football_time_fora_id is null
    and j.api_football_mapeado_em is null;
  get diagnostics updated_count = row_count;

  if updated_count <> 255 then
    raise exception 'api_football_5b2_updated_count_mismatch: expected 255, got %', updated_count;
  end if;
  if (select count(*) from public.jogos where api_football_id is not null) <> 255 then
    raise exception 'api_football_5b2_post_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos where api_football_id is null and api_football_time_casa_id is null and api_football_time_fora_id is null and api_football_mapeado_em is null) <> 125 then
    raise exception 'api_football_5b2_blocked_count_mismatch';
  end if;
  if exists (
    select 1
    from public.jogos j
    join api_football_mapeamentos_5b2 m using (id_jogo)
    where (j.api_football_id, j.api_football_time_casa_id, j.api_football_time_fora_id)
       is distinct from (m.api_football_id, m.api_football_time_casa_id, m.api_football_time_fora_id)
       or j.api_football_mapeado_em is distinct from mapping_timestamp
  ) then
    raise exception 'api_football_5b2_post_mapping_value_mismatch';
  end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into competitive_hash_after
  from public.jogos j;

  if competitive_hash_after <> competitive_hash_before then
    raise exception 'api_football_5b2_competitive_state_changed';
  end if;

  insert into public.transicao_api_execucoes (
    fase, fonte_oficial, fonte_sombra, concluida_em,
    sucesso_oficial, sucesso_sombra, jogos_oficial, jogos_sombra, detalhes
  ) values (
    'sombra_pre_corte', 'football-data.org', 'api-football', mapping_timestamp,
    true, true, 380, 255,
    jsonb_build_object(
      'tipo', 'reconciliacao_mapeamentos',
      'fase_migracao', '5B.2',
      'hash_reconciliacao', expected_hash,
      'quantidade_mapeada', 255,
      'quantidade_bloqueada', 125,
      'estado_competitivo_hash_antes', competitive_hash_before,
      'estado_competitivo_hash_depois', competitive_hash_after,
      'mapeado_em', mapping_timestamp,
      'estado_anterior', 'quatro_campos_auxiliares_nulos_nos_380_jogos',
      'mapeamentos', (select jsonb_agg(jsonb_build_object(
        'id_jogo', id_jogo,
        'antes', jsonb_build_object('api_football_id', null, 'api_football_time_casa_id', null, 'api_football_time_fora_id', null, 'api_football_mapeado_em', null),
        'depois', jsonb_build_object('api_football_id', api_football_id, 'api_football_time_casa_id', api_football_time_casa_id, 'api_football_time_fora_id', api_football_time_fora_id, 'api_football_mapeado_em', mapping_timestamp)
      ) order by id_jogo) from api_football_mapeamentos_5b2),
      'ids_bloqueados', (select jsonb_agg(j.id_jogo order by j.id_jogo) from public.jogos j where not exists (select 1 from api_football_mapeamentos_5b2 m where m.id_jogo = j.id_jogo))
    )
  ) returning id into audit_id;

  if audit_id is null then
    raise exception 'api_football_5b2_audit_missing';
  end if;
end
$migration$;
