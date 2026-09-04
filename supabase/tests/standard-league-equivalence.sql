-- L04 — Auditoria transacional da equivalência da Liga Standard.
-- Executar como uma única unidade; nenhuma entidade sintética deve persistir.
begin;

create temporary table l04_contexto on commit drop as
select t.id temporada_id, t.ano, l.id liga_standard_id,
  (select lm.user_id from public.liga_membros lm
   where lm.liga_id=l.id and lm.status='ativo'
   order by lm.entrou_em,lm.user_id limit 1) membro_a,
  (select lm.user_id from public.liga_membros lm
   where lm.liga_id=l.id and lm.status='ativo'
   order by lm.entrou_em,lm.user_id offset 1 limit 1) membro_b,
  gen_random_uuid() liga_a_id, gen_random_uuid() liga_b_id
from public.temporadas t join public.ligas l on l.temporada_id=t.id
where t.codigo='brasileirao-2026' and l.codigo='brasileirao-2026-standard'
  and t.status='ativa' and l.status='ativa';

do $$ begin
  if (select count(*) from l04_contexto)<>1 then
    raise exception 'L04: temporada ou Liga Standard não encontrada de forma única.';
  end if;
  if exists(select 1 from l04_contexto where membro_a is null or membro_b is null) then
    raise exception 'L04: são necessários ao menos dois membros ativos.';
  end if;
end $$;

create temporary table l04_assinaturas_antes on commit drop as
select 'jogos'::text objeto,count(*)::bigint quantidade,
 md5(coalesce(string_agg(concat_ws('|',id_jogo,temporada,rodada,status,gols_casa,gols_fora),'§' order by id_jogo),'')) assinatura from public.jogos
union all select 'palpites',count(*),md5(coalesce(string_agg(concat_ws('|',id,id_jogo,user_id,gols_casa,gols_fora),'§' order by id),'')) from public.palpites
union all select 'participantes',count(*),md5(coalesce(string_agg(concat_ws('|',user_id,nome,email,ativo),'§' order by user_id),'')) from public.participantes
union all select 'participantes_autorizados',count(*),md5(coalesce(string_agg(concat_ws('|',id,email,ativo,status,administrador),'§' order by id),'')) from public.participantes_autorizados;

create temporary table l04_esperado_por_palpite on commit drop as
select pa.id_jogo,pa.user_id,pa.gols_casa palpite_casa,pa.gols_fora palpite_fora,
 public.calcular_pontos(pa.gols_casa,pa.gols_fora,j.gols_casa,j.gols_fora)::integer pontos,
 (pa.gols_casa=j.gols_casa and pa.gols_fora=j.gols_fora) exato,j.rodada
from l04_contexto c
join public.liga_membros lm on lm.liga_id=c.liga_standard_id and lm.status='ativo'
join public.palpites pa on pa.user_id=lm.user_id
join public.jogos j on j.id_jogo=pa.id_jogo and j.temporada=c.ano
where lower(coalesce(j.status,''))~'(encerr|finaliz|awarded)'
 and lower(coalesce(j.status,''))!~'(cancel|anulad)'
 and j.gols_casa is not null and j.gols_fora is not null;

create temporary table l04_real_por_palpite (like l04_esperado_por_palpite including all) on commit drop;
grant select on l04_contexto to authenticated;
grant insert,select on l04_real_por_palpite to authenticated;
select set_config('request.jwt.claim.sub',(select membro_a::text from l04_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
insert into l04_real_por_palpite
select pa.id_jogo,pa.user_id,pa.gols_casa,pa.gols_fora,
 public.calcular_pontos(pa.gols_casa,pa.gols_fora,j.gols_casa,j.gols_fora)::integer,
 (pa.gols_casa=j.gols_casa and pa.gols_fora=j.gols_fora),j.rodada
from public.obter_palpites_encerrados_liga((select liga_standard_id from l04_contexto)) pa
join public.jogos j on j.id_jogo=pa.id_jogo;
reset role;

do $$ begin
 if exists((select * from l04_esperado_por_palpite except select * from l04_real_por_palpite) union all (select * from l04_real_por_palpite except select * from l04_esperado_por_palpite)) then
  raise exception 'L04: divergência na menor unidade participante-partida.';
 end if;
end $$;

create temporary table l04_esperado_oficial on commit drop as
with membros as (
 select lm.user_id,p.nome from l04_contexto c
 join public.liga_membros lm on lm.liga_id=c.liga_standard_id
 join public.participantes p on p.user_id=lm.user_id
 where lm.status='ativo' and p.ativo is true
), totais as (
 select m.user_id,m.nome,
  coalesce(sum(public.calcular_pontos(pa.gols_casa,pa.gols_fora,j.gols_casa,j.gols_fora)) filter(where lower(coalesce(j.status,''))~'(encerr|finaliz|awarded)' and lower(coalesce(j.status,''))!~'(cancel|anulad)' and j.gols_casa is not null and j.gols_fora is not null),0)::integer pontos,
  count(*) filter(where lower(coalesce(j.status,''))~'(encerr|finaliz|awarded)' and lower(coalesce(j.status,''))!~'(cancel|anulad)' and pa.gols_casa=j.gols_casa and pa.gols_fora=j.gols_fora)::integer exatos,
  count(j.id_jogo)::integer palpites,
  count(*) filter(where lower(coalesce(j.status,''))~'(encerr|finaliz|awarded)' and lower(coalesce(j.status,''))!~'(cancel|anulad)' and j.gols_casa is not null and j.gols_fora is not null)::integer avaliados
 from membros m cross join l04_contexto c
 left join public.palpites pa on pa.user_id=m.user_id
 left join public.jogos j on j.id_jogo=pa.id_jogo and j.temporada=c.ano
 group by m.user_id,m.nome
)
select row_number() over(order by pontos desc,exatos desc,nome)::bigint posicao,
 user_id,nome,pontos,exatos,palpites,avaliados from totais;

create temporary table l04_real_oficial(posicao bigint,user_id uuid,nome text,pontos integer,exatos integer,palpites integer,avaliados integer) on commit drop;
grant insert,select on l04_real_oficial to authenticated;
select set_config('request.jwt.claim.sub',(select membro_a::text from l04_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
insert into l04_real_oficial select * from public.obter_ranking_liga((select liga_standard_id from l04_contexto));
reset role;

create temporary table l04_esperado_provisorio on commit drop as
with contexto_rodadas as (
 select c.*,r.rodada from l04_contexto c cross join generate_series(1,38) r(rodada)
), membros as (
 select cr.rodada,cr.ano,lm.user_id,p.nome
 from contexto_rodadas cr
 join public.liga_membros lm on lm.liga_id=cr.liga_standard_id and lm.status='ativo'
 join public.participantes p on p.user_id=lm.user_id and p.ativo is true
), jogos_classificados as (
 select cr.rodada rodada_consultada,j.*,
  case when lower(coalesce(j.status,''))~'(cancel|anulad)' then 'cancelled'
       when lower(coalesce(j.status,''))~'(encerr|finaliz|awarded)' then 'finished'
       when lower(coalesce(j.status,''))~'(suspend|suspens)' then 'suspended'
       when lower(coalesce(j.status,''))~'(adiad|postpon)' then 'postponed'
       when lower(coalesce(j.status,''))~'(vivo|andamento|intervalo|1-tempo|2-tempo|in[_-]play|half[_-]time|paused)' then 'live'
       else 'future' end estado
 from contexto_rodadas cr join public.jogos j on j.temporada=cr.ano
), totais as (
 select m.rodada,m.user_id,m.nome,
  coalesce(sum(public.calcular_pontos(pa.gols_casa,pa.gols_fora,j.gols_casa,j.gols_fora)) filter(where j.estado='finished' and j.gols_casa is not null and j.gols_fora is not null),0)::integer pontos_oficiais,
  count(*) filter(where j.estado='finished' and pa.gols_casa=j.gols_casa and pa.gols_fora=j.gols_fora)::integer exatos_oficiais,
  coalesce(sum(public.calcular_pontos(pa.gols_casa,pa.gols_fora,j.gols_casa,j.gols_fora)) filter(where j.rodada=m.rodada and j.estado in('live','suspended') and j.gols_casa is not null and j.gols_fora is not null),0)::integer pontos_provisorios,
  count(*) filter(where j.rodada=m.rodada and j.estado in('live','suspended') and pa.gols_casa=j.gols_casa and pa.gols_fora=j.gols_fora)::integer exatos_provisorios
 from membros m left join public.palpites pa on pa.user_id=m.user_id
 left join jogos_classificados j on j.id_jogo=pa.id_jogo and j.rodada_consultada=m.rodada
 group by m.rodada,m.user_id,m.nome
), resumos as (
 select rodada_consultada rodada,
  count(*) filter(where estado='finished' and jogos_classificados.rodada=rodada_consultada)::integer jogos_encerrados,
  count(*) filter(where estado='live' and jogos_classificados.rodada=rodada_consultada)::integer jogos_ao_vivo,
  count(*) filter(where estado='suspended' and jogos_classificados.rodada=rodada_consultada)::integer jogos_suspensos,
  count(*) filter(where estado='postponed' and jogos_classificados.rodada=rodada_consultada)::integer jogos_adiados,
  count(*) filter(where estado='future' and jogos_classificados.rodada=rodada_consultada)::integer jogos_futuros,
  count(*) filter(where estado='cancelled' and jogos_classificados.rodada=rodada_consultada)::integer jogos_cancelados,
  max(coalesce(sincronizado_em,atualizado_em)) filter(where jogos_classificados.rodada=rodada_consultada) atualizado_em
 from jogos_classificados group by rodada_consultada
), projetados as (
 select t.*,(pontos_oficiais+pontos_provisorios)::integer total_projetado,
  (exatos_oficiais+exatos_provisorios)::integer exatos_projetados
 from totais t
)
select row_number() over(partition by p.rodada order by p.total_projetado desc,p.exatos_projetados desc,p.nome)::bigint posicao,
 p.user_id,p.nome,p.pontos_oficiais,p.exatos_oficiais,p.pontos_provisorios,p.exatos_provisorios,
 p.total_projetado,p.exatos_projetados,p.rodada,r.jogos_encerrados,r.jogos_ao_vivo,r.jogos_suspensos,
 r.jogos_adiados,r.jogos_futuros,r.jogos_cancelados,r.atualizado_em
from projetados p join resumos r on r.rodada=p.rodada;

create temporary table l04_real_provisorio (like l04_esperado_provisorio including all) on commit drop;
grant insert,select on l04_real_provisorio to authenticated;
select set_config('request.jwt.claim.sub',(select membro_a::text from l04_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare v_rodada integer; begin
 for v_rodada in 1..38 loop
  insert into l04_real_provisorio
  select * from public.obter_ranking_provisorio_liga((select liga_standard_id from l04_contexto),v_rodada);
 end loop;
end $$;
reset role;

do $$ begin
 if exists((select * from l04_esperado_provisorio except select * from l04_real_provisorio) union all (select * from l04_real_provisorio except select * from l04_esperado_provisorio)) then
  raise exception 'L04: divergência no ranking provisório ou nos estados das partidas.';
 end if;
end $$;

do $$ begin
 if exists((select * from l04_esperado_oficial except select * from l04_real_oficial) union all (select * from l04_real_oficial except select * from l04_esperado_oficial)) then
  raise exception 'L04: divergência no ranking oficial da Liga Standard.';
 end if;
 if exists(select 1 from public.palpites group by user_id,id_jogo having count(*)>1) then
  raise exception 'L04: há mais de um palpite para participante e partida.';
 end if;
end $$;

insert into public.ligas(id,temporada_id,codigo,nome,tipo,status,criado_por)
select liga_a_id,temporada_id,'l04-sintetica-a','L04 Sintética A','privada','ativa',membro_a from l04_contexto
union all select liga_b_id,temporada_id,'l04-sintetica-b','L04 Sintética B','privada','ativa',membro_b from l04_contexto;
insert into public.liga_membros(liga_id,user_id,papel,status,adicionado_por)
select liga_a_id,membro_a,'administrador','ativo',membro_a from l04_contexto
union all select liga_b_id,membro_b,'administrador','ativo',membro_b from l04_contexto;

select set_config('request.jwt.claim.sub',(select membro_b::text from l04_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.ligas where id=(select liga_a_id from l04_contexto)) then
  raise exception 'L04: RLS expôs uma liga sintética a não membro.';
 end if;
 begin
  perform * from public.obter_ranking_liga((select liga_a_id from l04_contexto));
  raise exception 'L04: RPC permitiu acesso cruzado entre ligas.';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;

-- entrou_em é auditável, mas não limita os palpites anteriores da temporada.
insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,adicionado_por)
select liga_a_id,membro_b,'membro','ativo',clock_timestamp(),membro_a from l04_contexto;
create temporary table l04_retroativo(posicao bigint,user_id uuid,nome text,pontos integer,exatos integer,palpites integer,avaliados integer) on commit drop;
grant insert,select on l04_retroativo to authenticated;
select set_config('request.jwt.claim.sub',(select membro_b::text from l04_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
insert into l04_retroativo select * from public.obter_ranking_liga((select liga_a_id from l04_contexto));
reset role;

do $$ declare v_esperado integer; v_real integer; begin
 select count(*)::integer into v_esperado from public.palpites pa cross join l04_contexto c join public.jogos j on j.id_jogo=pa.id_jogo and j.temporada=c.ano where pa.user_id=c.membro_b;
 select palpites into v_real from l04_retroativo r cross join l04_contexto c where r.user_id=c.membro_b;
 if v_real is distinct from v_esperado then raise exception 'L04: adesão retroativa retornou % palpites; esperado %.',v_real,v_esperado; end if;
 if (select count(*) from l04_retroativo)<>2 then raise exception 'L04: ranking sintético deveria conter exatamente dois membros.'; end if;
end $$;

create temporary table l04_assinaturas_depois on commit drop as
select 'jogos'::text objeto,count(*)::bigint quantidade,
 md5(coalesce(string_agg(concat_ws('|',id_jogo,temporada,rodada,status,gols_casa,gols_fora),'§' order by id_jogo),'')) assinatura from public.jogos
union all select 'palpites',count(*),md5(coalesce(string_agg(concat_ws('|',id,id_jogo,user_id,gols_casa,gols_fora),'§' order by id),'')) from public.palpites
union all select 'participantes',count(*),md5(coalesce(string_agg(concat_ws('|',user_id,nome,email,ativo),'§' order by user_id),'')) from public.participantes
union all select 'participantes_autorizados',count(*),md5(coalesce(string_agg(concat_ws('|',id,email,ativo,status,administrador),'§' order by id),'')) from public.participantes_autorizados;
do $$ begin
 if exists((select * from l04_assinaturas_antes except select * from l04_assinaturas_depois) union all (select * from l04_assinaturas_depois except select * from l04_assinaturas_antes)) then
  raise exception 'L04: uma tabela central foi alterada durante a auditoria.';
 end if;
end $$;

rollback;
select 'L04_OK: equivalência, isolamento, retroatividade e rollback comprovados.' resultado;
