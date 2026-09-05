-- v6.31.0 — Assinaturas Web Push manuais e aditivas.
-- Não altera participantes, jogos, palpites, ligas ou regras competitivas.

begin;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ativo boolean not null default true,
  autorizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (length(endpoint) between 20 and 4096),
  check (length(p256dh) between 20 and 512),
  check (length(auth) between 8 and 512)
);

create index push_subscriptions_usuario_ativo_idx
on public.push_subscriptions (user_id, ativo);

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from public, anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

create policy "usuario consulta suas assinaturas push"
on public.push_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "usuario cria suas assinaturas push"
on public.push_subscriptions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "usuario atualiza suas assinaturas push"
on public.push_subscriptions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "usuario remove suas assinaturas push"
on public.push_subscriptions for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.push_subscriptions is
  'Assinaturas Web Push criadas voluntariamente por aparelho; não usa telefone e não registra histórico de envios.';

commit;
