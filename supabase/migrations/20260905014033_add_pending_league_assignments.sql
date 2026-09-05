-- L09 — Aprovação global com designações de ligas efetivadas após a consolidação do perfil.
begin;

create table private.participante_liga_designacoes (
  id bigint generated always as identity primary key,
  participante_autorizado_id uuid not null references public.participantes_autorizados(id) on delete cascade,
  liga_id uuid references public.ligas(id) on delete restrict,
  estado text not null default 'pendente' check (estado in ('pendente','aplicada','cancelada')),
  aprovado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aplicado_em timestamptz,
  cancelado_em timestamptz
);

create unique index participante_liga_designacoes_liga_uk
on private.participante_liga_designacoes(participante_autorizado_id,liga_id)
where liga_id is not null;
create unique index participante_liga_designacoes_sem_liga_uk
on private.participante_liga_designacoes(participante_autorizado_id)
where liga_id is null;
create index participante_liga_designacoes_pendentes_idx
on private.participante_liga_designacoes(participante_autorizado_id,estado)
where estado='pendente';
create index participante_liga_designacoes_liga_idx
on private.participante_liga_designacoes(liga_id)
where liga_id is not null;

alter table private.participante_liga_designacoes enable row level security;
revoke all on table private.participante_liga_designacoes from public,anon,authenticated;
grant all on table private.participante_liga_designacoes to service_role;

create or replace function public.listar_designacoes_participantes()
returns table(participante_autorizado_id uuid,liga_id uuid,liga_nome text,estado text,sem_liga boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  return query select d.participante_autorizado_id,d.liga_id,l.nome,d.estado,d.liga_id is null
  from private.participante_liga_designacoes d left join public.ligas l on l.id=d.liga_id
  order by d.criado_em,d.id;
end $$;

create or replace function public.aprovar_participante_com_ligas(p_participante_autorizado_id uuid,p_liga_ids uuid[],p_sem_liga boolean default false)
returns table(designacoes_pendentes integer,sem_liga boolean)
language plpgsql security definer set search_path='' as $$
declare v_ids uuid[]; v_alvo public.participantes_autorizados%rowtype; v_gestor uuid:=(select auth.uid());
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  select array_agg(distinct selected.liga_id) into v_ids from unnest(coalesce(p_liga_ids,array[]::uuid[])) selected(liga_id);
  if p_sem_liga and coalesce(cardinality(v_ids),0)>0 then raise exception 'Aprovação sem liga não aceita ligas selecionadas.'; end if;
  if not p_sem_liga and coalesce(cardinality(v_ids),0)=0 then raise exception 'Selecione ao menos uma liga ou confirme a aprovação sem liga.'; end if;
  if coalesce(cardinality(v_ids),0)>50 then raise exception 'Selecione no máximo 50 ligas.'; end if;
  select * into strict v_alvo from public.participantes_autorizados where id=p_participante_autorizado_id for update;
  if v_alvo.administrador is true then raise exception 'O gestor central não usa designações pendentes.' using errcode='42501'; end if;
  if exists(select 1 from unnest(coalesce(v_ids,array[]::uuid[])) selected(liga_id)
    where not exists(select 1 from public.ligas l join public.temporadas t on t.id=l.temporada_id
      where l.id=selected.liga_id and l.status='ativa' and t.status='ativa' and t.codigo='brasileirao-2026'))
  then raise exception 'A seleção contém liga indisponível.'; end if;

  update public.participantes_autorizados set status='approved',ativo=true,aprovado_em=now(),aprovado_por=v_gestor,atualizado_em=now()
  where id=p_participante_autorizado_id;
  update private.participante_liga_designacoes set estado='cancelada',cancelado_em=now(),atualizado_em=now()
  where participante_autorizado_id=p_participante_autorizado_id and estado='pendente';

  if p_sem_liga then
    insert into private.participante_liga_designacoes(participante_autorizado_id,liga_id,estado,aprovado_por,criado_em,atualizado_em,aplicado_em,cancelado_em)
    values(p_participante_autorizado_id,null,'pendente',v_gestor,now(),now(),null,null)
    on conflict(participante_autorizado_id) where liga_id is null do update
      set estado='pendente',aprovado_por=excluded.aprovado_por,atualizado_em=now(),aplicado_em=null,cancelado_em=null;
  else
    insert into private.participante_liga_designacoes(participante_autorizado_id,liga_id,estado,aprovado_por)
    select p_participante_autorizado_id,selected.liga_id,'pendente',v_gestor from unnest(v_ids) selected(liga_id)
    on conflict(participante_autorizado_id,liga_id) where liga_id is not null do update
      set estado='pendente',aprovado_por=excluded.aprovado_por,atualizado_em=now(),aplicado_em=null,cancelado_em=null;
  end if;
  return query select coalesce(cardinality(v_ids),0),p_sem_liga;
end $$;

create or replace function public.cancelar_designacoes_pendentes_participante(p_participante_autorizado_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_total integer;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  update private.participante_liga_designacoes set estado='cancelada',cancelado_em=now(),atualizado_em=now()
  where participante_autorizado_id=p_participante_autorizado_id and estado='pendente';
  get diagnostics v_total=row_count;
  return v_total;
end $$;

create or replace function public.processar_minhas_designacoes_liga()
returns table(aplicadas integer,reativadas integer,ja_ativas integer,pendentes integer,sem_liga boolean)
language plpgsql security definer set search_path='' as $$
declare v_email text:=lower(coalesce((select auth.jwt()->>'email'),'')); v_autorizacao public.participantes_autorizados%rowtype;
  v_item record; v_membro public.liga_membros%rowtype; v_existed boolean; v_add integer:=0; v_react integer:=0; v_active integer:=0; v_pending integer:=0; v_sem boolean:=false;
begin
  if (select auth.uid()) is null or v_email='' then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  select * into strict v_autorizacao from public.participantes_autorizados
  where lower(email)=v_email and ativo is true and coalesce(status,'approved')='approved' for update;
  if not exists(select 1 from public.participantes p where p.user_id=(select auth.uid()) and lower(p.email)=v_email and p.ativo is true)
  then raise exception 'Perfil competitivo ainda não consolidado.'; end if;

  for v_item in select d.* from private.participante_liga_designacoes d
    where d.participante_autorizado_id=v_autorizacao.id and d.estado='pendente' order by d.id for update
  loop
    if v_item.liga_id is null then
      update private.participante_liga_designacoes set estado='aplicada',aplicado_em=now(),atualizado_em=now() where id=v_item.id;
      v_sem:=true; continue;
    end if;
    if not exists(select 1 from public.ligas l join public.temporadas t on t.id=l.temporada_id where l.id=v_item.liga_id and l.status='ativa' and t.status='ativa') then
      v_pending:=v_pending+1; continue;
    end if;
    select * into v_membro from public.liga_membros where liga_id=v_item.liga_id and user_id=(select auth.uid()) for update;
    v_existed:=found;
    if v_existed and v_membro.status='ativo' then
      v_active:=v_active+1;
    else
      insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em)
      values(v_item.liga_id,(select auth.uid()),'membro','ativo',now(),null,v_item.aprovado_por,now())
      on conflict(liga_id,user_id) do update set papel='membro',status='ativo',inativado_em=null,atualizado_em=now();
      insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
      values(v_item.liga_id,(select auth.uid()),v_item.aprovado_por,case when v_existed then 'reativado' else 'adicionado' end,v_membro.papel,'membro',v_membro.status,'ativo');
      if v_existed then v_react:=v_react+1; else v_add:=v_add+1; end if;
    end if;
    update private.participante_liga_designacoes set estado='aplicada',aplicado_em=now(),atualizado_em=now() where id=v_item.id;
  end loop;
  return query select v_add,v_react,v_active,v_pending,v_sem;
end $$;

revoke all on function public.listar_designacoes_participantes(),public.aprovar_participante_com_ligas(uuid,uuid[],boolean),public.cancelar_designacoes_pendentes_participante(uuid),public.processar_minhas_designacoes_liga() from public,anon;
grant execute on function public.listar_designacoes_participantes(),public.aprovar_participante_com_ligas(uuid,uuid[],boolean),public.cancelar_designacoes_pendentes_participante(uuid),public.processar_minhas_designacoes_liga() to authenticated;

commit;
