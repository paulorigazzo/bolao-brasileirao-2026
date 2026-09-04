-- Rollback da L02. Usar somente antes de qualquer entrega que passe a depender
-- das novas tabelas. Não altera jogos, palpites, participantes ou autorizações.

begin;

drop table if exists public.liga_membros;
drop table if exists public.ligas;
drop table if exists public.temporadas;

commit;
