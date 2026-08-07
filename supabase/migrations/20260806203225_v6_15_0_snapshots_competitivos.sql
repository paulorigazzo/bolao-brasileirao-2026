begin;

-- Camada interna de recuperação competitiva. O schema não é exposto pela
-- Data API e as funções são acionadas exclusivamente por triggers do banco.
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
revoke all on schema private from service_role;

create table private.jogos_encerrados_snapshot (
  id_jogo bigint primary key,
  rodada integer not null check (rodada between 1 and 38),
  time_casa text not null,
  time_fora text not null,
  inicio timestamptz not null,
  gols_casa integer not null check (gols_casa between 0 and 30),
  gols_fora integer not null check (gols_fora between 0 and 30),
  status text not null check (status = 'encerrado'),
  fonte text not null,
  confirmado_em timestamptz,
  capturado_em timestamptz not null default now(),
  captura_origem text not null check (captura_origem in ('baseline_v6_15_0', 'finalizacao'))
);

create table private.palpites_encerrados_snapshot (
  id_jogo bigint not null,
  palpite_id bigint not null,
  user_id uuid not null,
  usuario text not null,
  gols_casa integer not null check (gols_casa between 0 and 15),
  gols_fora integer not null check (gols_fora between 0 and 15),
  criado_em timestamptz,
  atualizado_em timestamptz,
  capturado_em timestamptz not null default now(),
  primary key (id_jogo, user_id),
  unique (palpite_id),
  foreign key (id_jogo)
    references private.jogos_encerrados_snapshot (id_jogo)
    on delete restrict
);

create table private.historico_resultados (
  id bigint generated always as identity primary key,
  id_jogo bigint not null,
  rodada integer not null check (rodada between 1 and 38),
  status_anterior text not null,
  gols_casa_anterior integer,
  gols_fora_anterior integer,
  status_novo text not null,
  gols_casa_novo integer,
  gols_fora_novo integer,
  fonte_anterior text,
  fonte_nova text,
  sincronizado_em_anterior timestamptz,
  sincronizado_em_novo timestamptz,
  registrado_em timestamptz not null default now()
);

create index historico_resultados_jogo_data_idx
  on private.historico_resultados (id_jogo, registrado_em desc);

create table private.checkpoints_competitivos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('baseline_v6_15_0', 'rodada')),
  rodada integer check (rodada between 1 and 38),
  jogos_encerrados integer not null check (jogos_encerrados >= 0),
  palpites_avaliados integer not null check (palpites_avaliados >= 0),
  participantes integer not null check (participantes >= 0),
  criado_em timestamptz not null default now(),
  check (
    (tipo = 'baseline_v6_15_0' and rodada is null)
    or
    (tipo = 'rodada' and rodada is not null)
  )
);

create unique index checkpoints_competitivos_baseline_idx
  on private.checkpoints_competitivos (tipo)
  where tipo = 'baseline_v6_15_0';

create unique index checkpoints_competitivos_rodada_idx
  on private.checkpoints_competitivos (rodada)
  where tipo = 'rodada';

create table private.ranking_checkpoints (
  checkpoint_id bigint not null,
  user_id uuid not null,
  usuario text not null,
  pontos integer not null check (pontos >= 0),
  exatos integer not null check (exatos >= 0),
  posicao integer not null check (posicao >= 1),
  primary key (checkpoint_id, user_id),
  unique (checkpoint_id, posicao),
  foreign key (checkpoint_id)
    references private.checkpoints_competitivos (id)
    on delete restrict
);

alter table private.jogos_encerrados_snapshot enable row level security;
alter table private.palpites_encerrados_snapshot enable row level security;
alter table private.historico_resultados enable row level security;
alter table private.checkpoints_competitivos enable row level security;
alter table private.ranking_checkpoints enable row level security;

revoke all on all tables in schema private from public;
revoke all on all tables in schema private from anon;
revoke all on all tables in schema private from authenticated;
revoke all on all tables in schema private from service_role;
revoke all on all sequences in schema private from public;
revoke all on all sequences in schema private from anon;
revoke all on all sequences in schema private from authenticated;
revoke all on all sequences in schema private from service_role;

create or replace function private.criar_checkpoint_competitivo(
  p_tipo text,
  p_rodada integer default null
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_checkpoint_id bigint;
begin
  if p_tipo not in ('baseline_v6_15_0', 'rodada') then
    raise exception 'Tipo de checkpoint competitivo inválido: %', p_tipo;
  end if;

  if p_tipo = 'rodada' then
    if p_rodada is null or p_rodada not between 1 and 38 then
      raise exception 'Rodada inválida para checkpoint: %', p_rodada;
    end if;

    if (
      select count(*) <> 10
          or count(*) filter (
            where status = 'encerrado'
              and gols_casa is not null
              and gols_fora is not null
          ) <> 10
        from public.jogos
       where rodada = p_rodada
    ) then
      return null;
    end if;
  elsif p_rodada is not null then
    raise exception 'O baseline não deve informar rodada';
  end if;

  insert into private.checkpoints_competitivos (
    tipo,
    rodada,
    jogos_encerrados,
    palpites_avaliados,
    participantes
  )
  select
    p_tipo,
    p_rodada,
    count(*) filter (
      where j.status = 'encerrado'
        and j.gols_casa is not null
        and j.gols_fora is not null
    ),
    (
      select count(*)
        from public.palpites p
        join public.jogos jogo on jogo.id_jogo = p.id_jogo
       where jogo.status = 'encerrado'
         and jogo.gols_casa is not null
         and jogo.gols_fora is not null
    ),
    (select count(*) from public.participantes)
  from public.jogos j
  on conflict do nothing
  returning id into v_checkpoint_id;

  if v_checkpoint_id is null then
    return null;
  end if;

  with totais as (
    select
      participante.user_id,
      participante.nome as usuario,
      coalesce(sum(public.calcular_pontos(
        palpite.gols_casa,
        palpite.gols_fora,
        jogo.gols_casa,
        jogo.gols_fora
      )) filter (
        where jogo.status = 'encerrado'
          and jogo.gols_casa is not null
          and jogo.gols_fora is not null
      ), 0)::integer as pontos,
      count(palpite.id) filter (
        where jogo.status = 'encerrado'
          and jogo.gols_casa is not null
          and jogo.gols_fora is not null
          and palpite.gols_casa = jogo.gols_casa
          and palpite.gols_fora = jogo.gols_fora
      )::integer as exatos
    from public.participantes participante
    left join public.palpites palpite on palpite.user_id = participante.user_id
    left join public.jogos jogo on jogo.id_jogo = palpite.id_jogo
    group by participante.user_id, participante.nome
  ), ranking as (
    select
      user_id,
      usuario,
      pontos,
      exatos,
      row_number() over (
        order by pontos desc, exatos desc, usuario asc
      )::integer as posicao
    from totais
  )
  insert into private.ranking_checkpoints (
    checkpoint_id,
    user_id,
    usuario,
    pontos,
    exatos,
    posicao
  )
  select
    v_checkpoint_id,
    user_id,
    usuario,
    pontos,
    exatos,
    posicao
  from ranking;

  return v_checkpoint_id;
end;
$$;

create or replace function private.registrar_historico_resultado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if exists (
    select 1
      from private.jogos_encerrados_snapshot snapshot
     where snapshot.id_jogo = old.id_jogo
  ) and (
    old.status is distinct from new.status
    or old.gols_casa is distinct from new.gols_casa
    or old.gols_fora is distinct from new.gols_fora
  ) then
    insert into private.historico_resultados (
      id_jogo,
      rodada,
      status_anterior,
      gols_casa_anterior,
      gols_fora_anterior,
      status_novo,
      gols_casa_novo,
      gols_fora_novo,
      fonte_anterior,
      fonte_nova,
      sincronizado_em_anterior,
      sincronizado_em_novo
    ) values (
      old.id_jogo,
      old.rodada,
      old.status,
      old.gols_casa,
      old.gols_fora,
      new.status,
      new.gols_casa,
      new.gols_fora,
      old.fonte,
      new.fonte,
      old.sincronizado_em,
      new.sincronizado_em
    );
  end if;

  return new;
end;
$$;

create or replace function private.capturar_jogo_encerrado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_capturado bigint;
begin
  if new.status <> 'encerrado'
     or new.gols_casa is null
     or new.gols_fora is null then
    return new;
  end if;

  insert into private.jogos_encerrados_snapshot (
    id_jogo,
    rodada,
    time_casa,
    time_fora,
    inicio,
    gols_casa,
    gols_fora,
    status,
    fonte,
    confirmado_em,
    captura_origem
  ) values (
    new.id_jogo,
    new.rodada,
    new.time_casa,
    new.time_fora,
    new.inicio,
    new.gols_casa,
    new.gols_fora,
    new.status,
    new.fonte,
    coalesce(new.sincronizado_em, new.atualizado_em, now()),
    'finalizacao'
  )
  on conflict (id_jogo) do nothing
  returning id_jogo into v_capturado;

  if v_capturado is not null then
    insert into private.palpites_encerrados_snapshot (
      id_jogo,
      palpite_id,
      user_id,
      usuario,
      gols_casa,
      gols_fora,
      criado_em,
      atualizado_em
    )
    select
      palpite.id_jogo,
      palpite.id,
      palpite.user_id,
      palpite.usuario,
      palpite.gols_casa,
      palpite.gols_fora,
      palpite.criado_em,
      palpite.atualizado_em
    from public.palpites palpite
    where palpite.id_jogo = new.id_jogo
    on conflict (id_jogo, user_id) do nothing;

    -- O checkpoint só pode nascer junto com uma nova captura. Assim, a
    -- primeira sincronização após a implantação não fabrica checkpoints
    -- retroativos para rodadas que já estavam completas no baseline.
    perform private.criar_checkpoint_competitivo('rodada', new.rodada);
  end if;

  return new;
end;
$$;

revoke all on function private.criar_checkpoint_competitivo(text, integer) from public;
revoke all on function private.criar_checkpoint_competitivo(text, integer) from anon;
revoke all on function private.criar_checkpoint_competitivo(text, integer) from authenticated;
revoke all on function private.criar_checkpoint_competitivo(text, integer) from service_role;
revoke all on function private.registrar_historico_resultado() from public;
revoke all on function private.registrar_historico_resultado() from anon;
revoke all on function private.registrar_historico_resultado() from authenticated;
revoke all on function private.registrar_historico_resultado() from service_role;
revoke all on function private.capturar_jogo_encerrado() from public;
revoke all on function private.capturar_jogo_encerrado() from anon;
revoke all on function private.capturar_jogo_encerrado() from authenticated;
revoke all on function private.capturar_jogo_encerrado() from service_role;

-- Baseline: preserva o estado atual sem afirmar que foi capturado no momento
-- histórico da finalização original.
insert into private.jogos_encerrados_snapshot (
  id_jogo,
  rodada,
  time_casa,
  time_fora,
  inicio,
  gols_casa,
  gols_fora,
  status,
  fonte,
  confirmado_em,
  captura_origem
)
select
  jogo.id_jogo,
  jogo.rodada,
  jogo.time_casa,
  jogo.time_fora,
  jogo.inicio,
  jogo.gols_casa,
  jogo.gols_fora,
  jogo.status,
  jogo.fonte,
  coalesce(jogo.sincronizado_em, jogo.atualizado_em),
  'baseline_v6_15_0'
from public.jogos jogo
where jogo.status = 'encerrado'
  and jogo.gols_casa is not null
  and jogo.gols_fora is not null
on conflict (id_jogo) do nothing;

insert into private.palpites_encerrados_snapshot (
  id_jogo,
  palpite_id,
  user_id,
  usuario,
  gols_casa,
  gols_fora,
  criado_em,
  atualizado_em
)
select
  palpite.id_jogo,
  palpite.id,
  palpite.user_id,
  palpite.usuario,
  palpite.gols_casa,
  palpite.gols_fora,
  palpite.criado_em,
  palpite.atualizado_em
from public.palpites palpite
join private.jogos_encerrados_snapshot snapshot
  on snapshot.id_jogo = palpite.id_jogo
on conflict (id_jogo, user_id) do nothing;

select private.criar_checkpoint_competitivo('baseline_v6_15_0', null);

create trigger registrar_historico_resultado_encerrado
before update on public.jogos
for each row
execute function private.registrar_historico_resultado();

create trigger capturar_primeiro_resultado_encerrado
after insert or update on public.jogos
for each row
execute function private.capturar_jogo_encerrado();

create or replace function private.impedir_mutacao_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
begin
  raise exception 'Snapshots competitivos são imutáveis; restaurações exigem procedimento administrativo explícito';
end;
$$;

revoke all on function private.impedir_mutacao_snapshot() from public;
revoke all on function private.impedir_mutacao_snapshot() from anon;
revoke all on function private.impedir_mutacao_snapshot() from authenticated;
revoke all on function private.impedir_mutacao_snapshot() from service_role;

create trigger impedir_mutacao_jogos_snapshot
before update or delete on private.jogos_encerrados_snapshot
for each row execute function private.impedir_mutacao_snapshot();

create trigger impedir_mutacao_palpites_snapshot
before update or delete on private.palpites_encerrados_snapshot
for each row execute function private.impedir_mutacao_snapshot();

create trigger impedir_mutacao_historico_resultados
before update or delete on private.historico_resultados
for each row execute function private.impedir_mutacao_snapshot();

create trigger impedir_mutacao_checkpoints
before update or delete on private.checkpoints_competitivos
for each row execute function private.impedir_mutacao_snapshot();

create trigger impedir_mutacao_ranking_checkpoints
before update or delete on private.ranking_checkpoints
for each row execute function private.impedir_mutacao_snapshot();

comment on schema private is
  'Dados internos não expostos pela Data API, usados para recuperação competitiva do Bolão 2026.';
comment on table private.jogos_encerrados_snapshot is
  'Primeiro resultado final válido de cada jogo, preservado para reconstrução.';
comment on table private.palpites_encerrados_snapshot is
  'Palpites vinculados ao primeiro snapshot final do jogo.';
comment on table private.historico_resultados is
  'Alterações posteriores de status ou placar em jogos com snapshot final.';
comment on table private.checkpoints_competitivos is
  'Baseline da implantação e checkpoints criados quando uma rodada fica integralmente encerrada.';
comment on table private.ranking_checkpoints is
  'Pontuação e posição calculadas no instante de cada checkpoint competitivo.';

-- Retorno operacional:
-- 1. desabilitar os dois triggers de public.jogos;
-- 2. preservar os dados já capturados;
-- 3. remover funções e tabelas somente mediante decisão humana específica.

commit;
