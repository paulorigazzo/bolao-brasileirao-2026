-- Bolão Brasileirão 2026 — Ranking provisório agregado.
-- Não revela palpites individuais e não persiste pontuação temporária.

begin;

create or replace function public.obter_ranking_provisorio(p_rodada integer)
returns table (
  user_id uuid,
  nome text,
  pontos_oficiais integer,
  exatos_oficiais integer,
  pontos_provisorios integer,
  exatos_provisorios integer,
  total_projetado integer,
  exatos_projetados integer,
  rodada integer,
  jogos_encerrados integer,
  jogos_ao_vivo integer,
  jogos_suspensos integer,
  jogos_adiados integer,
  jogos_futuros integer,
  jogos_cancelados integer,
  atualizado_em timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (select auth.uid()) is null or not public.email_autorizado() then
    raise exception 'Participante ativo e aprovado obrigatório.' using errcode = '42501';
  end if;
  if p_rodada is null or p_rodada < 1 or p_rodada > 38 then
    raise exception 'Rodada inválida.' using errcode = '22023';
  end if;

  return query
  with participantes_validos as (
    select p.user_id, p.nome
    from public.participantes p
    join public.participantes_autorizados pa on lower(pa.email) = lower(p.email)
    where p.ativo is true
      and pa.ativo is true
      and coalesce(pa.status, 'approved') = 'approved'
  ), jogos_classificados as (
    select j.*,
      case
        when lower(coalesce(j.status, '')) ~ '(cancel|anulad)' then 'cancelled'
        when lower(coalesce(j.status, '')) ~ '(encerr|finaliz|awarded|finished)' then 'finished'
        when lower(coalesce(j.status, '')) ~ '(suspend|suspens)' then 'suspended'
        when lower(coalesce(j.status, '')) ~ '(adiad|postpon)' then 'postponed'
        when lower(coalesce(j.status, '')) ~ '(vivo|andamento|intervalo|1-tempo|2-tempo|in[_-]play|half[_-]time|paused)' then 'live'
        else 'future'
      end as estado_provisorio
    from public.jogos j
  ), totais as (
    select pv.user_id, pv.nome,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora)) filter (
        where j.estado_provisorio = 'finished' and j.gols_casa is not null and j.gols_fora is not null
      ),0)::integer as pontos_oficiais,
      count(*) filter (
        where j.estado_provisorio = 'finished' and p.gols_casa = j.gols_casa and p.gols_fora = j.gols_fora
      )::integer as exatos_oficiais,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora)) filter (
        where j.rodada = p_rodada and j.estado_provisorio in ('live','suspended') and j.gols_casa is not null and j.gols_fora is not null
      ),0)::integer as pontos_provisorios,
      count(*) filter (
        where j.rodada = p_rodada and j.estado_provisorio in ('live','suspended') and p.gols_casa = j.gols_casa and p.gols_fora = j.gols_fora
      )::integer as exatos_provisorios
    from participantes_validos pv
    left join public.palpites p on p.user_id = pv.user_id
    left join jogos_classificados j on j.id_jogo = p.id_jogo
    group by pv.user_id, pv.nome
  ), resumo as (
    select
      count(*) filter (where estado_provisorio='finished')::integer as encerrados,
      count(*) filter (where estado_provisorio='live')::integer as ao_vivo,
      count(*) filter (where estado_provisorio='suspended')::integer as suspensos,
      count(*) filter (where estado_provisorio='postponed')::integer as adiados,
      count(*) filter (where estado_provisorio='future')::integer as futuros,
      count(*) filter (where estado_provisorio='cancelled')::integer as cancelados,
      max(coalesce(sincronizado_em,atualizado_em)) as atualizado_em
    from jogos_classificados
    where jogos_classificados.rodada = p_rodada
  )
  select t.user_id,t.nome,t.pontos_oficiais,t.exatos_oficiais,t.pontos_provisorios,t.exatos_provisorios,
    (t.pontos_oficiais+t.pontos_provisorios)::integer,
    (t.exatos_oficiais+t.exatos_provisorios)::integer,
    p_rodada,r.encerrados,r.ao_vivo,r.suspensos,r.adiados,r.futuros,r.cancelados,r.atualizado_em
  from totais t cross join resumo r
  order by (t.pontos_oficiais+t.pontos_provisorios) desc,
    (t.exatos_oficiais+t.exatos_provisorios) desc,
    t.nome asc;
end;
$$;

revoke all on function public.obter_ranking_provisorio(integer) from public;
revoke all on function public.obter_ranking_provisorio(integer) from anon;
grant execute on function public.obter_ranking_provisorio(integer) to authenticated;

commit;

-- Rollback:
-- begin;
-- revoke all on function public.obter_ranking_provisorio(integer) from authenticated;
-- drop function if exists public.obter_ranking_provisorio(integer);
-- commit;
