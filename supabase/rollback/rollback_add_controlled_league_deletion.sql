-- Desativa o recurso. Dados excluídos só podem ser recuperados de backup.
begin;
drop function if exists public.excluir_liga(uuid,text,text);
drop function if exists public.preparar_exclusao_liga(uuid);
create or replace function private.impedir_mutacao_auditoria_liga()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  raise exception 'O histórico de membros da liga é imutável.' using errcode='42501';
end $$;
drop function if exists private.resumo_exclusao_liga(uuid);
drop table if exists private.liga_exclusao_contexto;
commit;
