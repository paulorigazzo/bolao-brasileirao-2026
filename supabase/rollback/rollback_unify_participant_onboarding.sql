begin;
drop function if exists public.listar_situacao_participantes_ligas();
drop function if exists public.salvar_participante_autorizado_com_ligas(text,text,uuid[],boolean);
drop function if exists public.adicionar_ligas_participante_autorizado(uuid,uuid[]);
commit;
