-- Rollback da L06. Remove a gestão de membros e sua auditoria, preservando associações e dados competitivos.
begin;

drop function if exists public.alterar_status_membro_liga(uuid,uuid,boolean);
drop function if exists public.alterar_papel_membro_liga(uuid,uuid,text);
drop function if exists public.adicionar_membro_liga(uuid,text,text);
drop function if exists public.listar_auditoria_membros_liga(uuid);
drop function if exists public.listar_gestao_membros_liga(uuid);
drop function if exists private.usuario_administrador_liga(uuid);
drop table if exists private.liga_membros_auditoria;
drop function if exists private.impedir_mutacao_auditoria_liga();

commit;
