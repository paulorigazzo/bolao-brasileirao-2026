-- Correção controlada de agenda baseada na comparação entre football-data.org,
-- API-Football e fontes oficiais externas. Não altera IDs, placares ou resultados.

select pg_advisory_xact_lock(hashtext('bolao_2026_agendamentos_divergentes'));

create temporary table agendamento_preflight on commit drop as
select
  (select encode(sha256(convert_to(
    '[' || string_agg(
      format('{"canonicalGameId":%s,"providerFixtureId":%s,"providerHomeTeamId":%s,"providerAwayTeamId":%s}',
        j.id_jogo, j.api_football_id, j.api_football_time_casa_id, j.api_football_time_fora_id),
      ',' order by j.id_jogo
    ) || ']', 'UTF8')), 'hex')
   from public.jogos j
   where j.api_football_id is not null
     and j.api_football_time_casa_id is not null
     and j.api_football_time_fora_id is not null) as mapping_hash_current,
  (select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['inicio','api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
   from public.jogos j) as protected_hash_before;

do $preflight$
declare
  registered_hash text;
  current_hash text;
begin
  select detalhes ->> 'hash_reconciliacao'
    into registered_hash
  from public.transicao_api_execucoes
  where detalhes ->> 'tipo' = 'reconciliacao_mapeamentos'
    and detalhes ->> 'fase_migracao' = '5B.2'
  order by id desc
  limit 1;

  select mapping_hash_current into current_hash from agendamento_preflight;
  if registered_hash is null or registered_hash <> current_hash then
    raise exception 'agendamento_hash_mapeamentos_5b2_divergente: registrado %, atual %', registered_hash, current_hash;
  end if;
  if (select count(*) from public.jogos) <> 380 then
    raise exception 'agendamento_contagem_canonica_divergente';
  end if;
  if (select count(*) from public.jogos where api_football_id is not null
      and api_football_time_casa_id is not null and api_football_time_fora_id is not null
      and api_football_mapeado_em is not null) <> 255 then
    raise exception 'agendamento_mapeamentos_completos_divergentes';
  end if;
  if (select count(*) from public.jogos where api_football_id is null
      and api_football_time_casa_id is null and api_football_time_fora_id is null
      and api_football_mapeado_em is null) <> 125 then
    raise exception 'agendamento_mapeamentos_nulos_divergentes';
  end if;
  if exists (select 1 from public.jogos where
      (api_football_id is null)::integer
      + (api_football_time_casa_id is null)::integer
      + (api_football_time_fora_id is null)::integer
      + (api_football_mapeado_em is null)::integer not in (0,4)) then
    raise exception 'agendamento_mapeamentos_parciais_detectados';
  end if;
  if not exists (
    select 1 from public.jogos
    where id_jogo = 554887
      and inicio = timestamptz '2026-05-10 20:40:00+00'
      and status = 'encerrado'
  ) then
    raise exception 'agendamento_remo_precondicao_divergente';
  end if;
  if (select count(*) from public.jogos where id_jogo in (554940,554941,554942,554948)
      and inicio = timestamptz '2026-07-29 00:00:00+00' and status = 'adiado') <> 4 then
    raise exception 'agendamento_adiados_precondicao_divergente';
  end if;
  if (select count(*) from public.jogos where rodada between 27 and 38) <> 120 then
    raise exception 'agendamento_provisorios_precondicao_divergente';
  end if;
end
$preflight$;

alter table public.jogos add column situacao_agendamento text not null default 'confirmado';
alter table public.jogos add column fonte_agendamento text;
alter table public.jogos add column agendamento_confirmado_em timestamptz;
alter table public.jogos add column data_base date;

alter table public.jogos
  add constraint jogos_situacao_agendamento_valida
  check (situacao_agendamento in ('confirmado','provisorio','adiado_sem_data'));

comment on column public.jogos.situacao_agendamento is
  'Confiança semântica do agendamento; não substitui o estado competitivo do jogo.';
comment on column public.jogos.fonte_agendamento is
  'Fonte que sustenta a classificação ou confirmação atual do agendamento.';
comment on column public.jogos.agendamento_confirmado_em is
  'Instante de confirmação externa do horário, quando aplicável.';
comment on column public.jogos.data_base is
  'Data de referência quando a fonte ainda não publicou um horário confirmado.';

create table public.jogos_agendamento_observacoes (
  id bigint generated always as identity primary key,
  id_jogo bigint not null references public.jogos (id_jogo),
  fonte text not null,
  inicio_observado timestamptz,
  status_observado text,
  situacao_agendamento text not null,
  observado_em timestamptz not null default now(),
  evidencia_url text,
  hash_evidencia text not null,
  detalhes jsonb not null default '{}'::jsonb,
  constraint jogos_agendamento_observacoes_situacao_valida
    check (situacao_agendamento in ('confirmado','provisorio','adiado_sem_data')),
  constraint jogos_agendamento_observacoes_hash_valido
    check (hash_evidencia ~ '^[0-9a-f]{64}$')
);

comment on table public.jogos_agendamento_observacoes is
  'Histórico append-only e sem payload bruto das evidências de agenda dos provedores.';

alter table public.jogos_agendamento_observacoes enable row level security;
revoke all on table public.jogos_agendamento_observacoes from public, anon, authenticated, service_role;
revoke all on sequence public.jogos_agendamento_observacoes_id_seq from public, anon, authenticated, service_role;
grant select, insert on table public.jogos_agendamento_observacoes to service_role;
grant usage, select on sequence public.jogos_agendamento_observacoes_id_seq to service_role;

update public.jogos
set fonte_agendamento = coalesce(fonte, 'football-data.org'),
    agendamento_confirmado_em = sincronizado_em
where situacao_agendamento = 'confirmado';

update public.jogos
set inicio = timestamptz '2026-05-10 19:00:00+00',
    situacao_agendamento = 'confirmado',
    fonte_agendamento = 'cbf',
    agendamento_confirmado_em = now(),
    data_base = null
where id_jogo = 554887
  and inicio = timestamptz '2026-05-10 20:40:00+00'
  and status = 'encerrado';

update public.jogos
set situacao_agendamento = 'adiado_sem_data',
    fonte_agendamento = 'cbf',
    agendamento_confirmado_em = null,
    data_base = null
where id_jogo in (554940,554941,554942,554948)
  and inicio = timestamptz '2026-07-29 00:00:00+00'
  and status = 'adiado';

update public.jogos
set situacao_agendamento = 'provisorio',
    fonte_agendamento = 'football-data.org',
    agendamento_confirmado_em = null,
    data_base = timezone('UTC', inicio)::date
where rodada between 27 and 38;

insert into public.jogos_agendamento_observacoes
  (id_jogo, fonte, inicio_observado, status_observado, situacao_agendamento, evidencia_url, hash_evidencia, detalhes)
values
  (554887, 'football-data.org', timestamptz '2026-05-10 20:40:00+00', 'FINISHED', 'provisorio',
   'https://api.football-data.org/v4/competitions/BSA/matches?season=2026',
   encode(sha256(convert_to('554887|football-data.org|2026-05-10T20:40:00Z|FINISHED', 'UTF8')), 'hex'),
   '{"consulta_autenticada":true}'::jsonb),
  (554887, 'cbf', timestamptz '2026-05-10 19:00:00+00', 'encerrado', 'confirmado',
   'https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/serie-a/2026/remo-x-palmeiras/832039?view=documentos',
   encode(sha256(convert_to('554887|cbf|2026-05-10T19:00:00Z|confirmado', 'UTF8')), 'hex'),
   '{"horario_brasilia":"16:00"}'::jsonb);

insert into public.jogos_agendamento_observacoes
  (id_jogo, fonte, inicio_observado, status_observado, situacao_agendamento, evidencia_url, hash_evidencia, detalhes)
select j.id_jogo, 'cbf', j.inicio, 'POSTPONED', 'adiado_sem_data',
  'https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro-serie-a/a/brasileirao-betano-21-rodada-comeca-nesta-quarta',
  encode(sha256(convert_to(j.id_jogo::text || '|cbf|POSTPONED|sem_nova_data', 'UTF8')), 'hex'),
  '{"nova_data":null}'::jsonb
from public.jogos j
where j.id_jogo in (554940,554941,554942,554948);

insert into public.jogos_agendamento_observacoes
  (id_jogo, fonte, inicio_observado, status_observado, situacao_agendamento, evidencia_url, hash_evidencia, detalhes)
select j.id_jogo, 'football-data.org', j.inicio, j.status, 'provisorio',
  'https://api.football-data.org/v4/competitions/BSA/matches?season=2026',
  encode(sha256(convert_to(j.id_jogo::text || '|football-data.org|' || j.inicio::text || '|provisorio', 'UTF8')), 'hex'),
  jsonb_build_object('rodada', j.rodada, 'data_base', j.data_base)
from public.jogos j
where j.rodada between 27 and 38;

do $postconditions$
declare
  protected_hash_after text;
  audit_id bigint;
begin
  if (select count(*) from public.jogos where situacao_agendamento = 'provisorio') <> 120 then
    raise exception 'agendamento_provisorios_pos_condicao_divergente';
  end if;
  if (select count(*) from public.jogos where situacao_agendamento = 'adiado_sem_data') <> 4 then
    raise exception 'agendamento_adiados_pos_condicao_divergente';
  end if;
  if (select count(*) from public.jogos_agendamento_observacoes) <> 126 then
    raise exception 'agendamento_observacoes_pos_condicao_divergente';
  end if;
  if not exists (select 1 from public.jogos where id_jogo = 554887
      and inicio = timestamptz '2026-05-10 19:00:00+00'
      and situacao_agendamento = 'confirmado' and fonte_agendamento = 'cbf') then
    raise exception 'agendamento_remo_pos_condicao_divergente';
  end if;

  select encode(sha256(convert_to(coalesce(string_agg(
    (to_jsonb(j) - array['inicio','api_football_id','api_football_time_casa_id','api_football_time_fora_id','api_football_mapeado_em','situacao_agendamento','fonte_agendamento','agendamento_confirmado_em','data_base']::text[])::text,
    ',' order by j.id_jogo), ''), 'UTF8')), 'hex')
  into protected_hash_after
  from public.jogos j;

  if protected_hash_after <> (select protected_hash_before from agendamento_preflight) then
    raise exception 'agendamento_estado_competitivo_nao_autorizado_alterado';
  end if;

  insert into public.transicao_api_execucoes (
    fase, fonte_oficial, fonte_sombra, concluida_em,
    sucesso_oficial, sucesso_sombra, jogos_oficial, jogos_sombra, detalhes
  ) values (
    'sombra_pre_corte', 'football-data.org', 'api-football', now(),
    true, true, 380, 125,
    jsonb_build_object(
      'tipo', 'correcao_agendamentos_divergentes',
      'fase_migracao', '5B.3-corretiva',
      'hash_reconciliacao_5b2_validado', (select mapping_hash_current from agendamento_preflight),
      'hash_protegido_antes', (select protected_hash_before from agendamento_preflight),
      'hash_protegido_depois', protected_hash_after,
      'inicio_corrigido', jsonb_build_object('id_jogo',554887,'antes','2026-05-10T20:40:00Z','depois','2026-05-10T19:00:00Z'),
      'adiados_sem_data', jsonb_build_array(554940,554941,554942,554948),
      'provisorios', 120,
      'observacoes', 126
    )
  ) returning id into audit_id;

  if audit_id is null then raise exception 'agendamento_auditoria_ausente'; end if;
end
$postconditions$;
