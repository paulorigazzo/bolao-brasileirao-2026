begin;

create table public.eventos_partida_cache (
  id_jogo bigint primary key references public.jogos(id_jogo) on delete cascade,
  fornecedor text not null check (fornecedor = 'api-football'),
  id_externo bigint not null check (id_externo > 0),
  eventos jsonb not null check (jsonb_typeof(eventos) = 'array'),
  hash_eventos text not null check (hash_eventos ~ '^[0-9a-f]{64}$'),
  observado_em timestamptz not null,
  atualizado_em timestamptz not null default now(),
  unique (fornecedor, id_externo)
);

comment on table public.eventos_partida_cache is
  'Projeção normalizada mais recente dos eventos de cada jogo; nunca é autoridade para placar, status ou pontuação.';

alter table public.eventos_partida_cache enable row level security;
revoke all on table public.eventos_partida_cache from anon, authenticated;
grant select on table public.eventos_partida_cache to authenticated;
grant select, insert, update, delete on table public.eventos_partida_cache to service_role;

create policy "participante_ativo_consulta_eventos_partida"
on public.eventos_partida_cache
for select
to authenticated
using (
  exists (
    select 1
    from public.participantes p
    where p.user_id = (select auth.uid())
      and p.ativo is true
  )
);

commit;
