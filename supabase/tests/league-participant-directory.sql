-- L08 — Ensaio transacional do diretório e da inclusão em lote.
begin;
create temporary table l08_contexto on commit drop as
select l.id liga_id,l.criado_por gestor_id,
  (array_agg(p.user_id order by p.criado_em,p.user_id) filter(where p.user_id<>l.criado_por))[1] participante_a,
  (array_agg(p.user_id order by p.criado_em,p.user_id) filter(where p.user_id<>l.criado_por))[2] participante_b
from public.ligas l join public.temporadas t on t.id=l.temporada_id
cross join public.participantes p
join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
where l.tipo='standard' and t.codigo='brasileirao-2026' and p.ativo is true and pa.ativo is true and coalesce(pa.status,'approved')='approved'
group by l.id,l.criado_por;
grant select on l08_contexto to authenticated;

select set_config('request.jwt.claim.sub',(select gestor_id::text from l08_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare v_result record; begin
  if not exists(select 1 from public.listar_diretorio_participantes_liga((select liga_id from l08_contexto),null)) then raise exception 'L08: diretório vazio.'; end if;
  select * into v_result from public.adicionar_membros_liga_em_lote((select liga_id from l08_contexto),array[(select participante_a from l08_contexto),(select participante_b from l08_contexto),(select participante_a from l08_contexto)]);
  if v_result.adicionados+v_result.reativados+v_result.ja_ativos<>2 then raise exception 'L08: lote não deduplicado.'; end if;
  if exists(select 1 from public.listar_diretorio_participantes_liga((select liga_id from l08_contexto),null) where email_mascarado not like '%***@%') then raise exception 'L08: e-mail não mascarado.'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub',(select participante_a::text from l08_contexto),true);
set local role authenticated;
do $$ begin
  begin perform * from public.listar_diretorio_participantes_liga((select liga_id from l08_contexto),null);raise exception 'L08: participante comum acessou o diretório.';
  exception when insufficient_privilege then null;end;
end $$;
reset role;

do $$ begin
  if exists(select 1 from public.palpites group by user_id,id_jogo having count(*)>1) then raise exception 'L08: palpites duplicados.'; end if;
end $$;
rollback;
select 'L08_OK: diretório protegido, lote atômico e palpites preservados.' resultado;
