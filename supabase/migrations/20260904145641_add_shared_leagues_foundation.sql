-- L02 — Fundação paralela de temporadas e ligas com palpites compartilhados.
-- Esta migração cria somente estruturas aditivas e não ativa leituras no app.

begin;

create table if not exists public.temporadas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  ano integer not null unique,
  status text not null default 'preparacao'
    check (status in ('preparacao', 'ativa', 'encerrada', 'arquivada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (codigo = lower(codigo)),
  check (codigo ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (length(trim(nome)) between 2 and 100),
  check (ano between 2000 and 2100)
);

create table if not exists public.ligas (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas(id) on delete restrict,
  codigo text not null,
  nome text not null,
  tipo text not null default 'privada'
    check (tipo in ('standard', 'privada')),
  status text not null default 'ativa'
    check (status in ('ativa', 'inativa', 'arquivada')),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (temporada_id, codigo),
  check (codigo = lower(codigo)),
  check (codigo ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (length(trim(nome)) between 2 and 100)
);

create unique index if not exists ligas_uma_standard_por_temporada_idx
on public.ligas (temporada_id)
where tipo = 'standard';

create table if not exists public.liga_membros (
  liga_id uuid not null references public.ligas(id) on delete cascade,
  user_id uuid not null references public.participantes(user_id) on delete cascade,
  papel text not null default 'membro'
    check (papel in ('membro', 'administrador')),
  status text not null default 'ativo'
    check (status in ('ativo', 'inativo')),
  entrou_em timestamptz not null default now(),
  inativado_em timestamptz,
  adicionado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (liga_id, user_id),
  check (
    (status = 'ativo' and inativado_em is null)
    or (status = 'inativo' and inativado_em is not null)
  )
);

create index if not exists liga_membros_usuario_status_idx
on public.liga_membros (user_id, status);

alter table public.temporadas enable row level security;
alter table public.ligas enable row level security;
alter table public.liga_membros enable row level security;

revoke all on table public.temporadas from anon, authenticated;
revoke all on table public.ligas from anon, authenticated;
revoke all on table public.liga_membros from anon, authenticated;

grant all on table public.temporadas to service_role;
grant all on table public.ligas to service_role;
grant all on table public.liga_membros to service_role;

insert into public.temporadas (codigo, nome, ano, status)
values ('brasileirao-2026', 'Brasileirão 2026', 2026, 'ativa')
on conflict (codigo) do nothing;

with administrador_inicial as (
  select p.user_id
  from public.participantes p
  join public.participantes_autorizados pa
    on lower(pa.email) = lower(p.email)
  where p.ativo is true
    and pa.ativo is true
    and coalesce(pa.status, 'approved') = 'approved'
    and pa.administrador is true
  order by p.criado_em, p.user_id
  limit 1
)
insert into public.ligas (
  temporada_id,
  codigo,
  nome,
  tipo,
  status,
  criado_por
)
select
  temporada.id,
  'brasileirao-2026-standard',
  'Brasileirão 2026',
  'standard',
  'ativa',
  administrador.user_id
from public.temporadas temporada
left join administrador_inicial administrador on true
where temporada.codigo = 'brasileirao-2026'
on conflict (temporada_id, codigo) do nothing;

with administrador_inicial as (
  select p.user_id
  from public.participantes p
  join public.participantes_autorizados pa
    on lower(pa.email) = lower(p.email)
  where p.ativo is true
    and pa.ativo is true
    and coalesce(pa.status, 'approved') = 'approved'
    and pa.administrador is true
  order by p.criado_em, p.user_id
  limit 1
), membros_elegiveis as (
  select
    p.user_id,
    case when pa.administrador is true then 'administrador' else 'membro' end as papel
  from public.participantes p
  join public.participantes_autorizados pa
    on lower(pa.email) = lower(p.email)
  where p.ativo is true
    and pa.ativo is true
    and coalesce(pa.status, 'approved') = 'approved'
)
insert into public.liga_membros (
  liga_id,
  user_id,
  papel,
  status,
  adicionado_por
)
select
  liga.id,
  membro.user_id,
  membro.papel,
  'ativo',
  administrador.user_id
from public.ligas liga
join public.temporadas temporada on temporada.id = liga.temporada_id
cross join membros_elegiveis membro
left join administrador_inicial administrador on true
where temporada.codigo = 'brasileirao-2026'
  and liga.codigo = 'brasileirao-2026-standard'
on conflict (liga_id, user_id) do nothing;

do $$
declare
  v_elegiveis integer;
  v_membros_standard integer;
begin
  select count(*) into v_elegiveis
  from public.participantes p
  join public.participantes_autorizados pa
    on lower(pa.email) = lower(p.email)
  where p.ativo is true
    and pa.ativo is true
    and coalesce(pa.status, 'approved') = 'approved';

  select count(*) into v_membros_standard
  from public.liga_membros membro
  join public.ligas liga on liga.id = membro.liga_id
  join public.temporadas temporada on temporada.id = liga.temporada_id
  where temporada.codigo = 'brasileirao-2026'
    and liga.codigo = 'brasileirao-2026-standard'
    and membro.status = 'ativo';

  if v_membros_standard <> v_elegiveis then
    raise exception
      'Liga Standard inconsistente: % membros para % participantes elegíveis.',
      v_membros_standard,
      v_elegiveis;
  end if;
end;
$$;

comment on table public.temporadas is
  'Edições anuais que delimitam partidas, resultados e ligas.';
comment on table public.ligas is
  'Grupos competitivos de uma temporada; não possuem cópias de palpites.';
comment on table public.liga_membros is
  'Associações que determinam membros e papéis locais de cada liga.';

commit;
