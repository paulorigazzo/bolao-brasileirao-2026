-- Fundação aditiva para a transição controlada da fonte esportiva.
-- Versão remota registrada pelo Supabase: 20260825021432.
-- Esta migração não preenche mapeamentos, não inicia coleta e não altera a fonte oficial.
--
-- Rollback seguro enquanto a fase permanecer sem coleta:
--   drop table public.transicao_api_classificacoes;
--   drop table public.transicao_api_jogos;
--   drop table public.transicao_api_execucoes;
--   drop index public.jogos_api_football_id_uidx;
--   alter table public.jogos drop column api_football_mapeado_em,
--     drop column api_football_time_fora_id,
--     drop column api_football_time_casa_id,
--     drop column api_football_id;

alter table public.jogos
  add column api_football_id bigint,
  add column api_football_time_casa_id bigint,
  add column api_football_time_fora_id bigint,
  add column api_football_mapeado_em timestamptz,
  add constraint jogos_api_football_id_positivo
    check (api_football_id is null or api_football_id > 0),
  add constraint jogos_api_football_time_casa_id_positivo
    check (api_football_time_casa_id is null or api_football_time_casa_id > 0),
  add constraint jogos_api_football_time_fora_id_positivo
    check (api_football_time_fora_id is null or api_football_time_fora_id > 0);

create unique index jogos_api_football_id_uidx
  on public.jogos (api_football_id)
  where api_football_id is not null;

comment on column public.jogos.api_football_id is
  'Identificador auxiliar da partida na API-Football; não substitui id_jogo.';
comment on column public.jogos.api_football_time_casa_id is
  'Identificador observado do mandante na API-Football.';
comment on column public.jogos.api_football_time_fora_id is
  'Identificador observado do visitante na API-Football.';
comment on column public.jogos.api_football_mapeado_em is
  'Instante da aprovação do mapeamento determinístico com a API-Football.';

create table public.transicao_api_execucoes (
  id bigint generated always as identity primary key,
  fase text not null
    check (fase in ('ensaio', 'sombra_pre_corte', 'sombra_pos_corte')),
  fonte_oficial text not null
    check (fonte_oficial in ('football-data.org', 'api-football')),
  fonte_sombra text not null
    check (fonte_sombra in ('football-data.org', 'api-football')),
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  sucesso_oficial boolean,
  sucesso_sombra boolean,
  duracao_oficial_ms integer
    check (duracao_oficial_ms is null or duracao_oficial_ms >= 0),
  duracao_sombra_ms integer
    check (duracao_sombra_ms is null or duracao_sombra_ms >= 0),
  chamadas_oficial integer not null default 0
    check (chamadas_oficial >= 0),
  chamadas_sombra integer not null default 0
    check (chamadas_sombra >= 0),
  cota_sombra_limite integer
    check (cota_sombra_limite is null or cota_sombra_limite >= 0),
  cota_sombra_restante integer
    check (cota_sombra_restante is null or cota_sombra_restante >= 0),
  jogos_oficial integer not null default 0
    check (jogos_oficial >= 0),
  jogos_sombra integer not null default 0
    check (jogos_sombra >= 0),
  classificacoes_oficial integer not null default 0
    check (classificacoes_oficial >= 0),
  classificacoes_sombra integer not null default 0
    check (classificacoes_sombra >= 0),
  erros_oficial text[] not null default '{}',
  erros_sombra text[] not null default '{}',
  detalhes jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detalhes) = 'object'),
  constraint transicao_api_execucoes_fontes_distintas
    check (fonte_oficial <> fonte_sombra),
  constraint transicao_api_execucoes_intervalo_valido
    check (concluida_em is null or concluida_em >= iniciada_em),
  constraint transicao_api_execucoes_cota_valida
    check (
      cota_sombra_limite is null
      or cota_sombra_restante is null
      or cota_sombra_restante <= cota_sombra_limite
    )
);

comment on table public.transicao_api_execucoes is
  'Execuções comparativas isoladas, sem autoridade sobre o estado competitivo.';

create table public.transicao_api_jogos (
  id bigint generated always as identity primary key,
  execucao_id bigint not null
    references public.transicao_api_execucoes (id) on delete cascade,
  fornecedor text not null
    check (fornecedor in ('football-data.org', 'api-football')),
  id_jogo bigint not null
    references public.jogos (id_jogo) on delete restrict,
  id_externo bigint not null check (id_externo > 0),
  time_casa_id_externo bigint check (time_casa_id_externo is null or time_casa_id_externo > 0),
  time_fora_id_externo bigint check (time_fora_id_externo is null or time_fora_id_externo > 0),
  time_casa_nome text not null,
  time_fora_nome text not null,
  competicao_id_externo bigint check (competicao_id_externo is null or competicao_id_externo > 0),
  competicao_nome text,
  temporada integer not null check (temporada between 2000 and 2100),
  rodada integer check (rodada is null or rodada between 1 and 38),
  rodada_original text,
  inicio_previsto timestamptz not null,
  status_original text not null,
  status_normalizado text not null
    check (status_normalizado in (
      'scheduled', 'live', 'halftime', 'postponed',
      'cancelled', 'finished', 'unknown'
    )),
  minuto smallint check (minuto is null or minuto between 0 and 130),
  acrescimos smallint check (acrescimos is null or acrescimos between 0 and 30),
  gols_casa smallint check (gols_casa is null or gols_casa between 0 and 99),
  gols_fora smallint check (gols_fora is null or gols_fora between 0 and 99),
  intervalo_casa smallint check (intervalo_casa is null or intervalo_casa between 0 and 99),
  intervalo_fora smallint check (intervalo_fora is null or intervalo_fora between 0 and 99),
  final_casa smallint check (final_casa is null or final_casa between 0 and 99),
  final_fora smallint check (final_fora is null or final_fora between 0 and 99),
  prorrogacao_casa smallint check (prorrogacao_casa is null or prorrogacao_casa between 0 and 99),
  prorrogacao_fora smallint check (prorrogacao_fora is null or prorrogacao_fora between 0 and 99),
  penaltis_casa smallint check (penaltis_casa is null or penaltis_casa between 0 and 99),
  penaltis_fora smallint check (penaltis_fora is null or penaltis_fora between 0 and 99),
  fornecedor_atualizado_em timestamptz,
  observado_em timestamptz not null default now(),
  hash_relevante text not null check (hash_relevante ~ '^[0-9a-f]{64}$'),
  campos_ausentes text[] not null default '{}',
  erro_normalizacao text,
  valido boolean not null,
  constraint transicao_api_jogos_execucao_fornecedor_jogo_uid
    unique (execucao_id, fornecedor, id_jogo)
);

comment on table public.transicao_api_jogos is
  'Fotografias normalizadas de jogos por fornecedor; nunca alimentam diretamente a competição.';

create index transicao_api_jogos_id_jogo_idx
  on public.transicao_api_jogos (id_jogo);
create index transicao_api_jogos_fornecedor_id_externo_idx
  on public.transicao_api_jogos (fornecedor, id_externo);

create table public.transicao_api_classificacoes (
  id bigint generated always as identity primary key,
  execucao_id bigint not null
    references public.transicao_api_execucoes (id) on delete cascade,
  fornecedor text not null
    check (fornecedor in ('football-data.org', 'api-football')),
  competicao_id_externo bigint
    check (competicao_id_externo is null or competicao_id_externo > 0),
  competicao_nome text not null,
  temporada integer not null check (temporada between 2000 and 2100),
  rodada integer check (rodada is null or rodada between 1 and 38),
  observado_em timestamptz not null default now(),
  quantidade_times smallint not null check (quantidade_times between 0 and 100),
  conteudo_normalizado jsonb not null
    check (jsonb_typeof(conteudo_normalizado) = 'object'),
  hash_relevante text not null check (hash_relevante ~ '^[0-9a-f]{64}$'),
  valido boolean not null,
  erro_normalizacao text,
  constraint transicao_api_classificacoes_execucao_fornecedor_uid
    unique (execucao_id, fornecedor)
);

comment on table public.transicao_api_classificacoes is
  'Fotografias normalizadas de classificação por fornecedor, isoladas do cache oficial.';

alter table public.transicao_api_execucoes enable row level security;
alter table public.transicao_api_jogos enable row level security;
alter table public.transicao_api_classificacoes enable row level security;

revoke all on table public.transicao_api_execucoes from public, anon, authenticated, service_role;
revoke all on table public.transicao_api_jogos from public, anon, authenticated, service_role;
revoke all on table public.transicao_api_classificacoes from public, anon, authenticated, service_role;
revoke all on sequence public.transicao_api_execucoes_id_seq from public, anon, authenticated, service_role;
revoke all on sequence public.transicao_api_jogos_id_seq from public, anon, authenticated, service_role;
revoke all on sequence public.transicao_api_classificacoes_id_seq from public, anon, authenticated, service_role;

grant select, insert, update on table public.transicao_api_execucoes to service_role;
grant select, insert, update on table public.transicao_api_jogos to service_role;
grant select, insert, update on table public.transicao_api_classificacoes to service_role;
grant usage, select on sequence public.transicao_api_execucoes_id_seq to service_role;
grant usage, select on sequence public.transicao_api_jogos_id_seq to service_role;
grant usage, select on sequence public.transicao_api_classificacoes_id_seq to service_role;
