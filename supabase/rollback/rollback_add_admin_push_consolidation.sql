-- Executar somente após reverter o código para v6.53.0 ou desabilitar a rotina.
-- Não apagar controles: preserva deduplicação e permite retomar após correção.
begin;
revoke execute on function public.preparar_push_automaticos_com_adm(integer),
  public.concluir_push_automatico_com_adm(uuid,uuid,text,boolean),
  public.reservar_consolidados_push_adm(integer,uuid,integer),
  public.obter_conteudo_consolidado_adm(uuid,uuid),
  public.concluir_consolidado_push_adm(uuid,uuid,text) from service_role;
commit;
