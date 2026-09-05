-- L10 — Jornada unificada e aditiva de novos participantes.
begin;

create or replace function public.adicionar_ligas_participante_autorizado(p_participante_autorizado_id uuid,p_liga_ids uuid[])
returns table(adicionadas integer,reativadas integer,ja_ativas integer,pendentes integer)
language plpgsql security definer set search_path='' as $$
declare v_ids uuid[];v_alvo public.participantes_autorizados%rowtype;v_user_id uuid;v_liga uuid;v_membro public.liga_membros%rowtype;v_existe boolean;v_add integer:=0;v_react integer:=0;v_active integer:=0;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501';end if;
  select array_agg(x.id order by x.id) into v_ids from (select distinct id from unnest(coalesce(p_liga_ids,array[]::uuid[])) item(id)) x;
  if coalesce(cardinality(v_ids),0)=0 then raise exception 'Selecione ao menos uma liga.';end if;
  if cardinality(v_ids)>50 then raise exception 'Selecione no máximo 50 ligas.';end if;
  if exists(select 1 from unnest(v_ids) x(id) where not exists(select 1 from public.ligas l join public.temporadas t on t.id=l.temporada_id where l.id=x.id and l.status='ativa' and t.status='ativa' and t.codigo='brasileirao-2026')) then raise exception 'A seleção contém liga indisponível.';end if;
  select * into strict v_alvo from public.participantes_autorizados where id=p_participante_autorizado_id for update;
  if v_alvo.ativo is false or coalesce(v_alvo.status,'approved')<>'approved' or v_alvo.administrador is true then raise exception 'Participante indisponível para inclusão em ligas.';end if;
  select p.user_id into v_user_id from public.participantes p where lower(p.email)=lower(v_alvo.email) and p.ativo is true limit 1;
  update private.participante_liga_designacoes set estado='cancelada',cancelado_em=now(),atualizado_em=now() where participante_autorizado_id=v_alvo.id and liga_id is null and estado='pendente';
  if v_user_id is null then
    insert into private.participante_liga_designacoes(participante_autorizado_id,liga_id,estado,aprovado_por)
    select v_alvo.id,x.id,'pendente',(select auth.uid()) from unnest(v_ids) x(id)
    on conflict(participante_autorizado_id,liga_id) where liga_id is not null do update set estado='pendente',aprovado_por=excluded.aprovado_por,atualizado_em=now(),aplicado_em=null,cancelado_em=null;
    return query select 0,0,0,cardinality(v_ids);return;
  end if;
  foreach v_liga in array v_ids loop
    select * into v_membro from public.liga_membros where liga_id=v_liga and user_id=v_user_id for update;v_existe:=found;
    if v_existe and v_membro.status='ativo' then v_active:=v_active+1;
    else
      insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em) values(v_liga,v_user_id,'membro','ativo',now(),null,(select auth.uid()),now())
      on conflict(liga_id,user_id) do update set papel='membro',status='ativo',inativado_em=null,atualizado_em=now();
      insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo) values(v_liga,v_user_id,(select auth.uid()),case when v_existe then 'reativado' else 'adicionado' end,v_membro.papel,'membro',v_membro.status,'ativo');
      if v_existe then v_react:=v_react+1;else v_add:=v_add+1;end if;
    end if;
    update private.participante_liga_designacoes set estado='aplicada',aplicado_em=now(),atualizado_em=now() where participante_autorizado_id=v_alvo.id and liga_id=v_liga and estado='pendente';
  end loop;
  return query select v_add,v_react,v_active,0;
end $$;

create or replace function public.salvar_participante_autorizado_com_ligas(p_nome text,p_email text,p_liga_ids uuid[],p_sem_liga boolean default false)
returns table(participante_autorizado_id uuid,designacoes_pendentes integer,associacoes_aplicadas integer,sem_liga boolean)
language plpgsql security definer set search_path='' as $$
declare v_email text:=lower(trim(coalesce(p_email,'')));v_alvo public.participantes_autorizados%rowtype;v_result record;v_perfil boolean;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501';end if;
  if length(trim(coalesce(p_nome,'')))<2 then raise exception 'Informe um nome com pelo menos 2 caracteres.';end if;
  if v_email='' or v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail válido.';end if;
  if exists(select 1 from public.participantes_autorizados pa where lower(pa.email)=v_email and pa.administrador is true) then raise exception 'O gestor central não pode ser alterado por este fluxo.' using errcode='42501';end if;
  if p_sem_liga and coalesce(cardinality(p_liga_ids),0)>0 then raise exception 'Aprovação sem liga não aceita ligas selecionadas.';end if;
  if not p_sem_liga and coalesce(cardinality(p_liga_ids),0)=0 then raise exception 'Selecione ao menos uma liga ou confirme a aprovação sem liga.';end if;
  insert into public.participantes_autorizados(nome,email,ativo,administrador,status,solicitado_em,aprovado_em,aprovado_por,criado_em,atualizado_em)
  values(trim(p_nome),v_email,true,false,'approved',now(),now(),(select auth.uid()),now(),now())
  on conflict((lower(email))) do update set nome=excluded.nome,ativo=true,administrador=false,status='approved',aprovado_em=now(),aprovado_por=excluded.aprovado_por,atualizado_em=now()
  returning * into v_alvo;
  if p_sem_liga then
    update private.participante_liga_designacoes set estado='cancelada',cancelado_em=now(),atualizado_em=now() where participante_autorizado_id=v_alvo.id and estado='pendente';
    select exists(select 1 from public.participantes p where lower(p.email)=v_email and p.ativo is true) into v_perfil;
    insert into private.participante_liga_designacoes(participante_autorizado_id,liga_id,estado,aprovado_por,aplicado_em)
    values(v_alvo.id,null,case when v_perfil then 'aplicada' else 'pendente' end,(select auth.uid()),case when v_perfil then now() else null end)
    on conflict(participante_autorizado_id) where liga_id is null do update set estado=excluded.estado,aprovado_por=excluded.aprovado_por,atualizado_em=now(),aplicado_em=excluded.aplicado_em,cancelado_em=null;
    return query select v_alvo.id,case when v_perfil then 0 else 1 end,0,true;return;
  end if;
  select * into v_result from public.adicionar_ligas_participante_autorizado(v_alvo.id,p_liga_ids);
  return query select v_alvo.id,v_result.pendentes,v_result.adicionadas+v_result.reativadas,false;
end $$;

create or replace function public.listar_situacao_participantes_ligas()
returns table(participante_autorizado_id uuid,user_id uuid,perfil_consolidado boolean,ligas_ativas bigint,liga_nomes text[],designacoes_pendentes bigint,pendencias_arquivadas bigint,sem_liga boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501';end if;
  return query select pa.id,p.user_id,p.user_id is not null,
    (select count(*) from public.liga_membros lm join public.ligas l on l.id=lm.liga_id where lm.user_id=p.user_id and lm.status='ativo' and l.status='ativa'),
    coalesce((select array_agg(l.nome order by l.nome) from public.liga_membros lm join public.ligas l on l.id=lm.liga_id where lm.user_id=p.user_id and lm.status='ativo' and l.status='ativa'),array[]::text[]),
    (select count(*) from private.participante_liga_designacoes d where d.participante_autorizado_id=pa.id and d.estado='pendente' and d.liga_id is not null),
    (select count(*) from private.participante_liga_designacoes d left join public.ligas l on l.id=d.liga_id where d.participante_autorizado_id=pa.id and d.estado='pendente' and d.liga_id is not null and coalesce(l.status,'arquivada')<>'ativa'),
    not exists(select 1 from public.liga_membros lm join public.ligas l on l.id=lm.liga_id where lm.user_id=p.user_id and lm.status='ativo' and l.status='ativa') and exists(select 1 from private.participante_liga_designacoes d where d.participante_autorizado_id=pa.id and d.liga_id is null and d.estado in('pendente','aplicada'))
  from public.participantes_autorizados pa left join public.participantes p on lower(p.email)=lower(pa.email) and p.ativo is true;
end $$;

revoke all on function public.adicionar_ligas_participante_autorizado(uuid,uuid[]),public.salvar_participante_autorizado_com_ligas(text,text,uuid[],boolean),public.listar_situacao_participantes_ligas() from public,anon;
grant execute on function public.adicionar_ligas_participante_autorizado(uuid,uuid[]),public.salvar_participante_autorizado_com_ligas(text,text,uuid[],boolean),public.listar_situacao_participantes_ligas() to authenticated;
commit;
