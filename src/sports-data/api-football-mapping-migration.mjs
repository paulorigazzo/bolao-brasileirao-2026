export const APPROVED_RECONCILIATION_HASH = "eba86a38c9514427d04d2d23547ce25c5366547d5051c014bbb35dbc0c0bbe1f";
export const APPROVED_MAPPING_COUNT = 255;
export const BLOCKED_MAPPING_COUNT = 125;
export const CANONICAL_GAME_COUNT = 380;

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${label}_invalid`);
  return number;
}

function sqlValues(mappings) {
  return mappings.map((mapping) => `    (${[
    positiveInteger(mapping.canonicalGameId, "canonical_game_id"),
    positiveInteger(mapping.providerFixtureId, "provider_fixture_id"),
    positiveInteger(mapping.providerHomeTeamId, "provider_home_team_id"),
    positiveInteger(mapping.providerAwayTeamId, "provider_away_team_id"),
  ].join(", ")})`).join(",\n");
}

export function validateApprovedReconciliation(result) {
  if (result.reconciliationHash !== APPROVED_RECONCILIATION_HASH) throw new Error("approved_reconciliation_hash_mismatch");
  if (result.canonicalCount !== CANONICAL_GAME_COUNT) throw new Error("canonical_game_count_mismatch");
  if (result.providerCount !== CANONICAL_GAME_COUNT) throw new Error("provider_game_count_mismatch");
  if (result.mappedCount !== APPROVED_MAPPING_COUNT || result.mappings?.length !== APPROVED_MAPPING_COUNT) throw new Error("approved_mapping_count_mismatch");
  if (result.blocked?.length !== BLOCKED_MAPPING_COUNT) throw new Error("blocked_mapping_count_mismatch");
  if (result.structuralErrors?.length) throw new Error("reconciliation_structural_error");
  if (result.maximumKickoffDeltaMinutes !== 0 || result.mappings.some((mapping) => mapping.kickoffDeltaMinutes !== 0)) {
    throw new Error("approved_mapping_kickoff_delta_mismatch");
  }
  if (result.blocked.some((item) => item.reason !== "kickoff_out_of_tolerance")) throw new Error("blocked_mapping_reason_mismatch");
  return result.mappings;
}

export function buildMappingMigrationSql(result) {
  const mappings = validateApprovedReconciliation(result);
  return `-- Fase 5B.2: grava somente os 255 mapeamentos aprovados na reconciliação seca.
-- A football-data.org permanece como fonte oficial. Nenhum dado competitivo é alterado.
-- Aplicação remota exige revisão e autorização humanas específicas.

set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $migration$
declare
  expected_hash constant text := '${APPROVED_RECONCILIATION_HASH}';
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
${sqlValues(mappings)};

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
  if (select count(*) from public.jogos) <> ${CANONICAL_GAME_COUNT} then
    raise exception 'api_football_5b2_canonical_count_mismatch';
  end if;
  if (select count(*) from api_football_mapeamentos_5b2) <> ${APPROVED_MAPPING_COUNT} then
    raise exception 'api_football_5b2_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos j join api_football_mapeamentos_5b2 m using (id_jogo)) <> ${APPROVED_MAPPING_COUNT} then
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

  if updated_count <> ${APPROVED_MAPPING_COUNT} then
    raise exception 'api_football_5b2_updated_count_mismatch: expected ${APPROVED_MAPPING_COUNT}, got %', updated_count;
  end if;
  if (select count(*) from public.jogos where api_football_id is not null) <> ${APPROVED_MAPPING_COUNT} then
    raise exception 'api_football_5b2_post_mapping_count_mismatch';
  end if;
  if (select count(*) from public.jogos where api_football_id is null and api_football_time_casa_id is null and api_football_time_fora_id is null and api_football_mapeado_em is null) <> ${BLOCKED_MAPPING_COUNT} then
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
    true, true, ${CANONICAL_GAME_COUNT}, ${APPROVED_MAPPING_COUNT},
    jsonb_build_object(
      'tipo', 'reconciliacao_mapeamentos',
      'fase_migracao', '5B.2',
      'hash_reconciliacao', expected_hash,
      'quantidade_mapeada', ${APPROVED_MAPPING_COUNT},
      'quantidade_bloqueada', ${BLOCKED_MAPPING_COUNT},
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
`;
}

export function buildMappingRollbackSql() {
  return `-- Rollback operacional da Fase 5B.2. Não é uma migração automática.
-- Executar somente após autorização específica e confirmação de que nenhuma fase posterior depende dos vínculos.

begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $rollback$
declare
  expected_hash constant text := '${APPROVED_RECONCILIATION_HASH}';
  audit_record record;
  restored_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('bolao:api-football-mapeamentos-5b2'));
  lock table public.jogos in share row exclusive mode;

  select id, detalhes into audit_record
  from public.transicao_api_execucoes
  where detalhes->>'tipo' = 'reconciliacao_mapeamentos'
    and detalhes->>'fase_migracao' = '5B.2'
    and detalhes->>'hash_reconciliacao' = expected_hash
  order by id desc
  limit 1;

  if audit_record.id is null then raise exception 'api_football_5b2_rollback_audit_missing'; end if;
  if jsonb_array_length(audit_record.detalhes->'mapeamentos') <> ${APPROVED_MAPPING_COUNT} then
    raise exception 'api_football_5b2_rollback_audit_count_mismatch';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(audit_record.detalhes->'mapeamentos') item
    join public.jogos j on j.id_jogo = (item->>'id_jogo')::bigint
    where (j.api_football_id, j.api_football_time_casa_id, j.api_football_time_fora_id, j.api_football_mapeado_em)
      is distinct from (
        (item->'depois'->>'api_football_id')::bigint,
        (item->'depois'->>'api_football_time_casa_id')::bigint,
        (item->'depois'->>'api_football_time_fora_id')::bigint,
        (item->'depois'->>'api_football_mapeado_em')::timestamptz
      )
  ) then raise exception 'api_football_5b2_rollback_state_diverged'; end if;

  update public.jogos j
  set api_football_id = null,
      api_football_time_casa_id = null,
      api_football_time_fora_id = null,
      api_football_mapeado_em = null
  from jsonb_array_elements(audit_record.detalhes->'mapeamentos') item
  where j.id_jogo = (item->>'id_jogo')::bigint;
  get diagnostics restored_count = row_count;
  if restored_count <> ${APPROVED_MAPPING_COUNT} then raise exception 'api_football_5b2_rollback_count_mismatch'; end if;

  update public.transicao_api_execucoes
  set detalhes = detalhes || jsonb_build_object(
    'rollback_executado_em', transaction_timestamp(),
    'rollback_quantidade', restored_count
  )
  where id = audit_record.id;
end
$rollback$;

commit;
`;
}
