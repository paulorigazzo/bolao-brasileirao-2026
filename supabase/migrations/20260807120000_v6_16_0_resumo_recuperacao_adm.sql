begin;

create or replace function public.obter_resumo_protecao_recuperacao()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
      from public.participantes_autorizados participante
     where lower(participante.email) = v_email
       and participante.administrador is true
       and participante.ativo is true
       and participante.status = 'approved'
  ) then
    raise exception 'Acesso restrito a administradores ativos e aprovados.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ultima_captura', (select max(capturado_em) from private.jogos_encerrados_snapshot),
    'ultima_origem', (select captura_origem from private.jogos_encerrados_snapshot order by capturado_em desc, id_jogo desc limit 1),
    'ultima_rodada', (select rodada from private.jogos_encerrados_snapshot order by capturado_em desc, id_jogo desc limit 1),
    'jogos_preservados', (select count(*) from private.jogos_encerrados_snapshot),
    'palpites_preservados', (select count(*) from private.palpites_encerrados_snapshot),
    'alteracoes_registradas', (select count(*) from private.historico_resultados),
    'checkpoint_tipo', (select tipo from private.checkpoints_competitivos order by criado_em desc, id desc limit 1),
    'checkpoint_rodada', (select rodada from private.checkpoints_competitivos order by criado_em desc, id desc limit 1),
    'checkpoint_criado_em', (select criado_em from private.checkpoints_competitivos order by criado_em desc, id desc limit 1),
    'jogos_sem_snapshot', (
      select count(*) from public.jogos jogo
       where jogo.status = 'encerrado' and jogo.gols_casa is not null and jogo.gols_fora is not null
         and not exists (select 1 from private.jogos_encerrados_snapshot snapshot where snapshot.id_jogo = jogo.id_jogo)
    ),
    'divergencias', (
      select count(*) from private.jogos_encerrados_snapshot snapshot
      join public.jogos jogo on jogo.id_jogo = snapshot.id_jogo
      where jogo.status is distinct from snapshot.status
         or jogo.gols_casa is distinct from snapshot.gols_casa
         or jogo.gols_fora is distinct from snapshot.gols_fora
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.obter_resumo_protecao_recuperacao() from public;
revoke all on function public.obter_resumo_protecao_recuperacao() from anon;
revoke all on function public.obter_resumo_protecao_recuperacao() from authenticated;
revoke all on function public.obter_resumo_protecao_recuperacao() from service_role;
grant execute on function public.obter_resumo_protecao_recuperacao() to authenticated;

comment on function public.obter_resumo_protecao_recuperacao() is
  'Resumo agregado e somente leitura da proteção competitiva, restrito a administradores ativos e aprovados.';

commit;
