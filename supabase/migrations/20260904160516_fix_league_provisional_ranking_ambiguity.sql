-- Corrige a colisão entre a coluna retornada atualizado_em e a coluna de jogos.
begin;

do $$
declare
  v_definicao text;
  v_corrigida text;
begin
  select pg_get_functiondef(p.oid)
  into v_definicao
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'obter_ranking_provisorio_liga'
    and pg_get_function_identity_arguments(p.oid) = 'p_liga_id uuid, p_rodada integer';

  if v_definicao is null then
    raise exception 'Função obter_ranking_provisorio_liga não encontrada.';
  end if;

  v_corrigida := replace(
    v_definicao,
    'max(coalesce(sincronizado_em,atualizado_em)) atualizado',
    'max(coalesce(jc.sincronizado_em,jc.atualizado_em)) atualizado'
  );
  v_corrigida := replace(
    v_corrigida,
    'from jogos_classificados where rodada=p_rodada',
    'from jogos_classificados jc where jc.rodada=p_rodada'
  );

  if v_corrigida = v_definicao then
    raise exception 'Definição esperada não encontrada para correção.';
  end if;

  execute v_corrigida;
end;
$$;

commit;
