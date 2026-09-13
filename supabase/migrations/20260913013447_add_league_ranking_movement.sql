begin;

create or replace function public.obter_movimentacao_ranking_liga(p_liga_id uuid)
returns table (
  user_id uuid,
  nome text,
  rodada_anterior integer,
  posicao_anterior bigint,
  rodada_atual integer,
  posicao_atual bigint,
  variacao integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;

  return query
  with contexto as (
    select t.ano
    from public.ligas l
    join public.temporadas t on t.id = l.temporada_id
    where l.id = p_liga_id
  ),
  rodadas_encerradas as (
    select distinct j.rodada
    from contexto c
    join public.jogos j on j.temporada = c.ano
    where j.rodada is not null
      and lower(coalesce(j.status, '')) ~ '(encerr|finaliz|awarded)'
      and lower(coalesce(j.status, '')) !~ '(cancel|anulad)'
      and j.gols_casa is not null
      and j.gols_fora is not null
  ),
  cortes as (
    select rodada, row_number() over (order by rodada desc) as ordem
    from rodadas_encerradas
    order by rodada desc
    limit 2
  ),
  membros as (
    select lm.user_id, participante.nome
    from public.liga_membros lm
    join public.participantes participante
      on participante.user_id = lm.user_id and participante.ativo is true
    where lm.liga_id = p_liga_id and lm.status = 'ativo'
  ),
  totais as (
    select c.rodada, c.ordem, m.user_id, m.nome,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora))
        filter (where lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded)'
          and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
          and j.gols_casa is not null and j.gols_fora is not null), 0)::integer as pontos,
      count(*) filter (where lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded)'
        and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
        and j.gols_casa is not null and j.gols_fora is not null
        and p.gols_casa = j.gols_casa and p.gols_fora = j.gols_fora)::integer as exatos
    from cortes c
    cross join membros m
    cross join contexto contexto_liga
    left join public.palpites p on p.user_id = m.user_id
    left join public.jogos j on j.id_jogo = p.id_jogo
      and j.temporada = contexto_liga.ano
      and j.rodada <= c.rodada
    group by c.rodada, c.ordem, m.user_id, m.nome
  ),
  posicoes as (
    select t.*,
      row_number() over (partition by t.rodada order by t.pontos desc,t.exatos desc,t.nome)::bigint as posicao
    from totais t
  ),
  atual as (
    select * from posicoes where ordem = 1
  ),
  anterior as (
    select * from posicoes where ordem = 2
  )
  select a.user_id, a.nome,
    ant.rodada as rodada_anterior,
    ant.posicao as posicao_anterior,
    a.rodada as rodada_atual,
    a.posicao as posicao_atual,
    case when ant.posicao is null then 0 else (ant.posicao - a.posicao)::integer end as variacao
  from atual a
  left join anterior ant on ant.user_id = a.user_id
  order by a.posicao;
end;
$$;

revoke all on function public.obter_movimentacao_ranking_liga(uuid) from public, anon;
grant execute on function public.obter_movimentacao_ranking_liga(uuid) to authenticated;

commit;
