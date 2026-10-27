-- Mitigação conservadora: antes, desabilitar AUTOMATIC_ROUND_PUSH_ENABLED e publicar deploy.
-- Revoga somente a execução da automação. Preserva tabela e marcadores contra reenvios.
-- Não executar em produção sem autorização específica.
begin;
revoke execute on function public.preparar_push_automaticos(integer) from service_role;
revoke execute on function public.reservar_push_automaticos(integer,uuid,integer) from service_role;
revoke execute on function public.obter_conteudo_push_automatico(uuid,uuid) from service_role;
revoke execute on function public.concluir_push_automatico(uuid,uuid,text) from service_role;
commit;
