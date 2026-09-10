begin;

create table public.detalhes_partida_cache (
  id_jogo bigint primary key references public.jogos(id_jogo) on delete cascade,
  fornecedor text not null check (fornecedor = 'api-football'),
  id_externo bigint not null check (id_externo > 0),
  estatisticas jsonb check (estatisticas is null or jsonb_typeof(estatisticas) = 'object'),
  hash_estatisticas text check (hash_estatisticas is null or hash_estatisticas ~ '^[0-9a-f]{64}$'),
  estatisticas_observadas_em timestamptz,
  escalacoes jsonb check (escalacoes is null or jsonb_typeof(escalacoes) = 'object'),
  hash_escalacoes text check (hash_escalacoes is null or hash_escalacoes ~ '^[0-9a-f]{64}$'),
  escalacoes_observadas_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (fornecedor, id_externo),
  check (estatisticas is not null or escalacoes is not null),
  check ((estatisticas is null) = (hash_estatisticas is null)),
  check ((escalacoes is null) = (hash_escalacoes is null))
);

comment on table public.detalhes_partida_cache is
  'Projeção auxiliar de estatísticas e escalações; nunca é autoridade para placar, status, palpites ou pontuação.';

alter table public.detalhes_partida_cache enable row level security;
revoke all on table public.detalhes_partida_cache from anon, authenticated;
grant select on table public.detalhes_partida_cache to authenticated;
grant select, insert, update, delete on table public.detalhes_partida_cache to service_role;

create policy "participante_ativo_consulta_detalhes_partida"
on public.detalhes_partida_cache for select to authenticated
using (exists (
  select 1 from public.participantes p
  where p.user_id = (select auth.uid()) and p.ativo is true
));

commit;
