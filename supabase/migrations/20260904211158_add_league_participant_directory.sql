-- L08 — Diretório protegido e inclusão atômica de participantes em ligas.
begin;

create or replace function public.listar_diretorio_participantes_liga(p_liga_id uuid,p_busca text default null)
returns table(user_id uuid,nome text,email_mascarado text,celular_mascarado text,ligas_ativas bigint,status_na_liga text)
language plpgsql stable security definer set search_path='' as $$
declare v_busca text:=lower(trim(coalesce(p_busca,''))); v_digitos text:=regexp_replace(coalesce(p_busca,''),'[^0-9]','','g');
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  if not exists(select 1 from public.ligas where id=p_liga_id and status='ativa') then raise exception 'Liga ativa não encontrada.'; end if;
  return query
  select p.user_id,p.nome,
    left(p.email,2)||'***@'||split_part(p.email,'@',2),
    case when length(regexp_replace(coalesce(pa.celular,p.celular,''),'[^0-9]','','g'))<4 then 'Não informado' else '(**) *****-'||right(regexp_replace(coalesce(pa.celular,p.celular,''),'[^0-9]','','g'),4) end,
    (select count(*) from public.liga_membros lm2 join public.ligas l2 on l2.id=lm2.liga_id where lm2.user_id=p.user_id and lm2.status='ativo' and l2.status='ativa'),
    coalesce((select lm.status from public.liga_membros lm where lm.liga_id=p_liga_id and lm.user_id=p.user_id),'disponivel')
  from public.participantes p
  join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
  where p.ativo is true and pa.ativo is true and coalesce(pa.status,'approved')='approved'
    and p.user_id<>(select auth.uid())
    and (v_busca='' or translate(lower(p.nome||' '||p.email),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc') like '%'||translate(v_busca,'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')||'%'
      or (length(v_digitos)>=3 and regexp_replace(coalesce(pa.celular,p.celular,''),'[^0-9]','','g') like '%'||v_digitos||'%'))
  order by (exists(select 1 from public.liga_membros lm where lm.liga_id=p_liga_id and lm.user_id=p.user_id and lm.status='ativo')) asc,p.nome
  limit 100;
end $$;

create or replace function public.adicionar_membros_liga_em_lote(p_liga_id uuid,p_user_ids uuid[])
returns table(adicionados integer,reativados integer,ja_ativos integer)
language plpgsql security definer set search_path='' as $$
declare v_ids uuid[]; v_id uuid; v_atual public.liga_membros%rowtype; v_existed boolean; v_add integer:=0; v_react integer:=0; v_active integer:=0;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  select array_agg(distinct id) into v_ids from unnest(coalesce(p_user_ids,array[]::uuid[])) id;
  if coalesce(cardinality(v_ids),0)=0 or cardinality(v_ids)>50 then raise exception 'Selecione entre 1 e 50 participantes.'; end if;
  perform 1 from public.ligas where id=p_liga_id and status='ativa' for update;
  if not found then raise exception 'Liga ativa não encontrada.'; end if;
  if exists(select 1 from unnest(v_ids) id where id=(select auth.uid()) or not exists(
    select 1 from public.participantes p join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
    where p.user_id=id and p.ativo is true and pa.ativo is true and coalesce(pa.status,'approved')='approved'
  )) then raise exception 'A seleção contém participante inelegível.'; end if;
  foreach v_id in array v_ids loop
    select * into v_atual from public.liga_membros where liga_id=p_liga_id and user_id=v_id for update;
    v_existed:=found;
    if found and v_atual.status='ativo' then v_active:=v_active+1; continue; end if;
    insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em)
    values(p_liga_id,v_id,'membro','ativo',now(),null,(select auth.uid()),now())
    on conflict(liga_id,user_id) do update set papel='membro',status='ativo',inativado_em=null,atualizado_em=now();
    insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
    values(p_liga_id,v_id,(select auth.uid()),case when v_existed then 'reativado' else 'adicionado' end,v_atual.papel,'membro',v_atual.status,'ativo');
    if v_existed then v_react:=v_react+1; else v_add:=v_add+1; end if;
  end loop;
  return query select v_add,v_react,v_active;
end $$;

revoke all on function public.listar_diretorio_participantes_liga(uuid,text),public.adicionar_membros_liga_em_lote(uuid,uuid[]) from public,anon;
grant execute on function public.listar_diretorio_participantes_liga(uuid,text),public.adicionar_membros_liga_em_lote(uuid,uuid[]) to authenticated;

commit;
