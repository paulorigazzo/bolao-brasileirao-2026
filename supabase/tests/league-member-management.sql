-- L06 — Ensaio transacional da gestão de membros. Nenhum dado deve persistir.
begin;

create temporary table l06_contexto on commit drop as
select t.id temporada_id,gen_random_uuid() liga_id,
  (array_agg(p.user_id order by p.criado_em,p.user_id))[1] administrador_id,
  (array_agg(p.user_id order by p.criado_em,p.user_id))[2] membro_id,
  (array_agg(p.email order by p.criado_em,p.user_id))[2] membro_email
from public.temporadas t
cross join public.participantes p
join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
where t.codigo='brasileirao-2026' and p.ativo is true and pa.ativo is true
  and coalesce(pa.status,'approved')='approved'
group by t.id;

do $$ begin
  if exists(select 1 from l06_contexto where administrador_id is null or membro_id is null) then
    raise exception 'L06: são necessários dois participantes elegíveis.';
  end if;
end $$;

insert into public.ligas(id,temporada_id,codigo,nome,tipo,status,criado_por)
select liga_id,temporada_id,'l06-sintetica','L06 Sintética','privada','ativa',administrador_id from l06_contexto;
insert into public.liga_membros(liga_id,user_id,papel,status,adicionado_por)
select liga_id,administrador_id,'administrador','ativo',administrador_id from l06_contexto;

-- Um participante sem associação não administra a liga.
select set_config('request.jwt.claim.sub',(select membro_id::text from l06_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ begin
  begin
    perform * from public.listar_gestao_membros_liga((select liga_id from l06_contexto));
    raise exception 'L06: participante sem associação administrou a liga.';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub',(select administrador_id::text from l06_contexto),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select public.adicionar_membro_liga((select liga_id from l06_contexto),(select membro_email from l06_contexto),'membro');
do $$ begin
  if not exists(select 1 from public.listar_gestao_membros_liga((select liga_id from l06_contexto)) where user_id=(select membro_id from l06_contexto) and status='ativo') then
    raise exception 'L06: novo membro não apareceu ativo.';
  end if;
  if (select count(*) from public.listar_auditoria_membros_liga((select liga_id from l06_contexto)) where acao='adicionado')<>1 then
    raise exception 'L06: inclusão não foi auditada uma única vez.';
  end if;
  begin
    perform public.alterar_status_membro_liga((select liga_id from l06_contexto),(select administrador_id from l06_contexto),false);
    raise exception 'L06: administrador alterou a própria associação.';
  exception when insufficient_privilege then null;
  end;
end $$;
select public.alterar_papel_membro_liga((select liga_id from l06_contexto),(select membro_id from l06_contexto),'administrador');
select public.alterar_status_membro_liga((select liga_id from l06_contexto),(select membro_id from l06_contexto),false);
select public.alterar_status_membro_liga((select liga_id from l06_contexto),(select membro_id from l06_contexto),true);
reset role;

do $$ begin
  if (select count(*) from private.liga_membros_auditoria a cross join l06_contexto c where a.liga_id=c.liga_id)<>4 then
    raise exception 'L06: sequência de auditoria incompleta.';
  end if;
  begin
    update private.liga_membros_auditoria set acao='reativado' where liga_id=(select liga_id from l06_contexto);
    raise exception 'L06: auditoria permitiu alteração.';
  exception when insufficient_privilege then null;
  end;
  if exists(select 1 from public.palpites group by user_id,id_jogo having count(*)>1) then
    raise exception 'L06: gestão produziu palpites duplicados.';
  end if;
end $$;

rollback;
select 'L06_OK: isolamento, gestão, auditoria, preservação e rollback comprovados.' resultado;
