-- Bolão Brasileirão 2026 — v6.15.2
-- Substitui a autorização legada por lista fixa por uma verificação dinâmica
-- do cadastro ativo e aprovado, preservando a leitura individual existente.

begin;

create or replace function public.email_autorizado()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.participantes_autorizados pa
      where lower(pa.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
        and pa.ativo is true
        and coalesce(pa.status, 'approved') = 'approved'
    );
$$;

revoke all on function public.email_autorizado() from public;
revoke all on function public.email_autorizado() from anon;
grant execute on function public.email_autorizado() to authenticated;

drop policy if exists "participantes podem ler participantes" on public.participantes;
create policy "participantes podem ler participantes"
on public.participantes
for select
to authenticated
using ((select public.email_autorizado()));

commit;

-- Rollback seguro de autorização global, sem restaurar listas fixas:
-- begin;
-- drop policy if exists "participantes podem ler participantes" on public.participantes;
-- create or replace function public.email_autorizado()
-- returns boolean language sql stable security invoker
-- set search_path = pg_catalog, public
-- as $$ select false; $$;
-- revoke all on function public.email_autorizado() from public;
-- revoke all on function public.email_autorizado() from anon;
-- grant execute on function public.email_autorizado() to authenticated;
-- commit;
