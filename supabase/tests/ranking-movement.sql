-- Auditoria transacional e somente leitura da movimentação do Ranking.
begin;

create temporary table movimento_contexto on commit drop as
select t.ano, l.id liga_id,
  (select lm.user_id from public.liga_membros lm
   where lm.liga_id=l.id and lm.status='ativo'
   order by lm.entrou_em,lm.user_id limit 1) membro_id
from public.temporadas t
join public.ligas l on l.temporada_id=t.id
where t.codigo='brasileirao-2026' and l.codigo='brasileirao-2026-standard'
  and t.status='ativa' and l.status='ativa';

do $$ begin
  if (select count(*) from movimento_contexto)<>1 then
    raise exception 'Movimentação: Liga Standard não encontrada de forma única.';
  end if;
end $$;

create temporary table movimento_real (
  user_id uuid, nome text, rodada_anterior integer, posicao_anterior bigint,
  rodada_atual integer, posicao_atual bigint, variacao integer
) on commit drop;
grant select on movimento_contexto to authenticated;
grant insert,select on movimento_real to authenticated;
select set_config('request.jwt.claim.sub',(select membro_id::text from movimento_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
insert into movimento_real
select * from public.obter_movimentacao_ranking_liga((select liga_id from movimento_contexto));
reset role;

do $$ begin
  if exists (
    select 1
    from movimento_real m
    join public.obter_ranking_liga((select liga_id from movimento_contexto)) r using (user_id)
    where m.posicao_atual is distinct from r.posicao
  ) then
    raise exception 'Movimentação: a posição atual diverge do Ranking oficial.';
  end if;
  if exists (
    select 1 from movimento_real
    where variacao is distinct from coalesce((posicao_anterior-posicao_atual)::integer,0)
  ) then
    raise exception 'Movimentação: direção ou quantidade inconsistente.';
  end if;
  if exists (select user_id from movimento_real group by user_id having count(*)<>1) then
    raise exception 'Movimentação: participante retornado mais de uma vez.';
  end if;
  if (select count(*) from movimento_real) is distinct from (
    select count(*) from public.liga_membros lm
    join public.participantes p on p.user_id=lm.user_id and p.ativo is true
    where lm.liga_id=(select liga_id from movimento_contexto) and lm.status='ativo'
  ) then
    raise exception 'Movimentação: quantidade diferente dos membros ativos.';
  end if;
end $$;

rollback;
select 'MOVIMENTO_OK: posição oficial, identidade e variação comprovadas.' resultado;
