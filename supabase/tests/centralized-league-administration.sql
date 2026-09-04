-- L07 — Ensaio transacional; nenhuma liga sintética deve persistir.
begin;
create temporary table l07_contexto on commit drop as
select l.criado_por gestor_id,(select p.user_id from public.participantes p where p.user_id<>l.criado_por limit 1) participante_id
from public.ligas l join public.temporadas t on t.id=l.temporada_id
where l.tipo='standard' and t.codigo='brasileirao-2026';
grant select on l07_contexto to authenticated;

select set_config('request.jwt.claim.sub',(select gestor_id::text from l07_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare v_liga uuid; begin
  if not public.sou_gestor_central_ligas() then raise exception 'L07: gestor central não reconhecido.'; end if;
  v_liga:=public.criar_liga('Liga L07 Sintética');
  if not exists(select 1 from public.listar_ligas_administracao() where liga_id=v_liga and liga_status='ativa') then raise exception 'L07: liga não criada.'; end if;
  perform public.renomear_liga(v_liga,'Liga L07 Renomeada');
  perform public.alterar_status_liga(v_liga,false);
  perform public.alterar_status_liga(v_liga,true);
  if (select count(*) from public.listar_auditoria_ligas() where liga_id=v_liga)<>4 then raise exception 'L07: auditoria do ciclo de vida incompleta.'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub',(select participante_id::text from l07_contexto),true);
set local role authenticated;
do $$ begin
  begin perform public.criar_liga('Liga indevida'); raise exception 'L07: participante criou liga.';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin
  if exists(select 1 from public.liga_membros group by liga_id having count(*) filter(where papel='administrador' and status='ativo')<>1) then raise exception 'L07: liga sem administrador central único.'; end if;
  if exists(select 1 from public.palpites group by user_id,id_jogo having count(*)>1) then raise exception 'L07: palpites duplicados.'; end if;
end $$;
rollback;
select 'L07_OK: criação, autorização exclusiva, ciclo de vida, auditoria e rollback comprovados.' resultado;
