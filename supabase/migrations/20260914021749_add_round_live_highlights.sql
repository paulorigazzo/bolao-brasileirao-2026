-- Aggregate-only live highlights. No writes to competitive data or changes to RLS.
begin;

create function private.obter_destaques_rodada_liga(p_liga_id uuid, p_rodada integer)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if (select auth.uid()) is null or not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;
  if p_rodada is null or p_rodada < 1 or p_rodada > 38 then
    raise exception 'Rodada inválida.' using errcode = '22023';
  end if;

  with games as (
    select j.*,
      case
        when lower(coalesce(j.status,'')) ~ '(cancel|anulad)' then 'cancelled'
        when lower(coalesce(j.status,'')) ~ '(suspend|suspens)' then 'suspended'
        when lower(coalesce(j.status,'')) ~ '(adiad|postpon)' then 'postponed'
        when lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded)' then 'finished'
        when lower(coalesce(j.status,'')) ~ '(vivo|andamento|intervalo|1-tempo|2-tempo|in[_-]play|half[_-]time|paused|^live$)' then 'live'
        else 'future' end as phase,
      j.gols_casa is not null and j.gols_fora is not null
        and j.gols_casa >= 0 and j.gols_fora >= 0 as valid_score
    from public.jogos j
    join public.temporadas t on t.ano=j.temporada
    join public.ligas l on l.temporada_id=t.id
    where l.id=p_liga_id and j.rodada=p_rodada
  ), official as (
    select * from public.obter_ranking_liga(p_liga_id)
  ), totals as (
    select o.user_id,o.nome,o.pontos as official_total,o.exatos as official_exact,o.posicao as official_position,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,g.gols_casa,g.gols_fora))
        filter(where g.phase='finished' and g.valid_score),0)::integer as confirmed,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,g.gols_casa,g.gols_fora))
        filter(where g.phase in ('live','suspended') and g.valid_score),0)::integer as provisional,
      count(*) filter(where g.phase='finished' and g.valid_score and p.gols_casa=g.gols_casa and p.gols_fora=g.gols_fora)::integer as confirmed_exact,
      count(*) filter(where g.phase in ('live','suspended') and g.valid_score and p.gols_casa=g.gols_casa and p.gols_fora=g.gols_fora)::integer as provisional_exact
    from official o
    left join public.palpites p on p.user_id=o.user_id
    left join games g on g.id_jogo=p.id_jogo
    group by o.user_id,o.nome,o.pontos,o.exatos,o.posicao
  ), projected as (
    select t.*, t.confirmed+t.provisional as total, t.confirmed_exact+t.provisional_exact as exact,
      t.official_total+t.provisional as projected_total,
      -- Equal names retain the official order; no artificial movement on ties.
      row_number() over(order by t.official_total+t.provisional desc,t.official_exact+t.provisional_exact desc,t.nome,t.official_position) as projected_position
    from totals t
  ), ranked as (
    select p.*, row_number() over(order by p.total desc,p.exact desc,p.nome,p.user_id) as position,
      max(p.projected_total) over()-p.projected_total as gap from projected p
  ), lifecycle as (
    select count(*) as total,
      count(*) filter(where phase='finished' and valid_score) as finished,
      count(*) filter(where phase='live') as live,
      count(*) filter(where phase='live' and valid_score) as live_with_score,
      count(*) filter(where phase='suspended') as suspended,
      count(*) filter(where phase='suspended' and valid_score) as suspended_with_score,
      count(*) filter(where phase='postponed') as postponed,
      count(*) filter(where phase='future') as future,
      count(*) filter(where phase='cancelled') as cancelled,
      max(coalesce(g.sincronizado_em,g.atualizado_em)) as updated_at
    from games g
  )
  select jsonb_build_object(
    'round',p_rodada,'leagueId',p_liga_id,'updatedAt',l.updated_at,
    'lifecycle',jsonb_build_object('total',l.total,'finished',l.finished,'live',l.live,
      'liveWithScore',l.live_with_score,'suspended',l.suspended,'suspendedWithScore',l.suspended_with_score,
      'postponed',l.postponed,'future',l.future,'cancelled',l.cancelled,
      'complete',l.total>0 and l.finished+l.cancelled=l.total),
    'ranking',coalesce((select jsonb_agg(jsonb_build_object(
      'user_id',r.user_id,'nome',r.nome,'position',r.position,
      'confirmed',r.confirmed,'provisional',r.provisional,'total',r.total,'exact',r.exact,
      'officialPosition',r.official_position,'projectedPosition',r.projected_position,'gap',r.gap
    ) order by r.position) from ranked r),'[]'::jsonb)
  ) into v_result from lifecycle l;
  return v_result;
end;
$$;

-- The privileged calculation stays in the non-exposed schema. The public API
-- only delegates; membership is checked inside the privileged function too.
create function public.obter_destaques_rodada_liga(p_liga_id uuid, p_rodada integer)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.obter_destaques_rodada_liga(p_liga_id,p_rodada); $$;
revoke all on function private.obter_destaques_rodada_liga(uuid,integer) from public,anon;
revoke all on function public.obter_destaques_rodada_liga(uuid,integer) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.obter_destaques_rodada_liga(uuid,integer) to authenticated;
grant execute on function public.obter_destaques_rodada_liga(uuid,integer) to authenticated;
commit;
