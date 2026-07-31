-- Bolão Brasileirão 2026 — v6.9.0
-- Libera para participantes autenticados somente palpites de partidas
-- oficialmente encerradas e com placar final disponível.

begin;

drop policy if exists "Participantes consultam palpites encerrados" on public.palpites;

create policy "Participantes consultam palpites encerrados"
on public.palpites
for select
to authenticated
using (
  exists (
    select 1
    from public.jogos
    where jogos.id_jogo = palpites.id_jogo
      and lower(coalesce(jogos.status, '')) ~ '(encerr|finaliz|awarded)'
      and lower(coalesce(jogos.status, '')) !~ '(cancel|anulad)'
      and jogos.gols_casa is not null
      and jogos.gols_fora is not null
  )
);

create or replace view public.palpites_encerrados_publicos
with (security_invoker = true)
as
select
  p.id_jogo,
  p.user_id,
  p.usuario,
  p.gols_casa,
  p.gols_fora
from public.palpites p
join public.jogos j on j.id_jogo = p.id_jogo
where lower(coalesce(j.status, '')) ~ '(encerr|finaliz|awarded)'
  and lower(coalesce(j.status, '')) !~ '(cancel|anulad)'
  and j.gols_casa is not null
  and j.gols_fora is not null;

revoke all on public.palpites_encerrados_publicos from anon;
grant select on public.palpites_encerrados_publicos to authenticated;

commit;

-- Rollback:
-- begin;
-- drop view if exists public.palpites_encerrados_publicos;
-- drop policy if exists "Participantes consultam palpites encerrados" on public.palpites;
-- commit;
