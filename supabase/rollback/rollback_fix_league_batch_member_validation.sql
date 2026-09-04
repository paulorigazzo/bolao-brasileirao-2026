begin;
-- Retorno seguro: desabilita a operação em lote em vez de restaurar a versão ambígua.
drop function if exists public.adicionar_membros_liga_em_lote(uuid,uuid[]);
commit;
