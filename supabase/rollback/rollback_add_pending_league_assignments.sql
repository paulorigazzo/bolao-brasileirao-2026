begin;
drop function if exists public.processar_minhas_designacoes_liga();
drop function if exists public.cancelar_designacoes_pendentes_participante(uuid);
drop function if exists public.aprovar_participante_com_ligas(uuid,uuid[],boolean);
drop function if exists public.listar_designacoes_participantes();
-- A tabela privada é preservada por padrão para não apagar o histórico das aprovações.
commit;
