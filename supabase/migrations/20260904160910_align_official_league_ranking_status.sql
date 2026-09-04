-- Alinha a leitura oficial por liga ao contrato vigente de partidas encerradas.
begin;

drop policy if exists "usuario le seu palpite compartilhado" on public.palpites;
create policy "usuario le seu palpite compartilhado"
on public.palpites for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select private.usuarios_compartilham_liga(user_id))
    and exists (
      select 1 from public.jogos j
      where j.id_jogo = palpites.id_jogo
        and lower(coalesce(j.status, '')) ~ '(encerr|finaliz|awarded)'
        and lower(coalesce(j.status, '')) !~ '(cancel|anulad)'
        and j.gols_casa is not null and j.gols_fora is not null
    )
  )
);

do $$
declare
  v_oid oid;
  v_definicao text;
  v_corrigida text;
begin
  for v_oid in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('obter_palpites_encerrados_liga','obter_ranking_liga')
  loop
    v_definicao := pg_get_functiondef(v_oid);
    v_corrigida := replace(
      v_definicao,
      '(encerr|finaliz|awarded|finished)',
      '(encerr|finaliz|awarded)'
    );
    if v_corrigida = v_definicao then
      raise exception 'Definição esperada não encontrada em %.', v_oid::regprocedure;
    end if;
    execute v_corrigida;
  end loop;
end;
$$;

commit;
