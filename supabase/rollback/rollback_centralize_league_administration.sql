-- Rollback da L07. Preserva ligas e membros criados e restaura a autorização local da L06.
begin;
drop function if exists public.listar_auditoria_ligas();
drop function if exists public.listar_ligas_administracao();
drop function if exists public.alterar_status_liga(uuid,boolean);
drop function if exists public.renomear_liga(uuid,text);
drop function if exists public.criar_liga(text);
drop function if exists public.sou_gestor_central_ligas();
drop table if exists private.ligas_auditoria;

create or replace function private.usuario_administrador_liga(p_liga_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(
    select 1 from public.liga_membros lm join public.ligas l on l.id=lm.liga_id and l.status='ativa'
    join public.temporadas t on t.id=l.temporada_id and t.status='ativa'
    where lm.liga_id=p_liga_id and lm.user_id=(select auth.uid()) and lm.status='ativo' and lm.papel='administrador');
$$;
drop function if exists private.usuario_gestor_central_ligas();

create or replace function public.adicionar_membro_liga(p_liga_id uuid,p_email text,p_papel text default 'membro')
returns void language plpgsql security definer set search_path='' as $$
declare v_alvo uuid;v_antigo public.liga_membros%rowtype;v_acao text;
begin
 if not private.usuario_administrador_liga(p_liga_id) then raise exception 'Administração local da liga obrigatória.' using errcode='42501';end if;
 if p_papel not in('membro','administrador') then raise exception 'Função local inválida.';end if;
 perform 1 from public.ligas where id=p_liga_id for update;
 select p.user_id into v_alvo from public.participantes p join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
 where lower(p.email)=lower(trim(p_email)) and p.ativo is true and pa.ativo is true and coalesce(pa.status,'approved')='approved' limit 1;
 if v_alvo is null then raise exception 'Participante elegível não encontrado.';end if;
 select * into v_antigo from public.liga_membros where liga_id=p_liga_id and user_id=v_alvo for update;
 if found and v_antigo.status='ativo' then raise exception 'Participante já integra esta liga.';end if;
 v_acao:=case when found then 'reativado' else 'adicionado' end;
 insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em)
 values(p_liga_id,v_alvo,p_papel,'ativo',now(),null,(select auth.uid()),now())
 on conflict(liga_id,user_id) do update set papel=excluded.papel,status='ativo',inativado_em=null,atualizado_em=now();
 insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
 values(p_liga_id,v_alvo,(select auth.uid()),v_acao,v_antigo.papel,p_papel,v_antigo.status,'ativo');
end $$;

create or replace function public.alterar_status_membro_liga(p_liga_id uuid,p_user_id uuid,p_ativo boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_atual public.liga_membros%rowtype;v_novo text:=case when p_ativo then 'ativo' else 'inativo' end;v_admins integer;
begin
 if not private.usuario_administrador_liga(p_liga_id) then raise exception 'Administração local da liga obrigatória.' using errcode='42501';end if;
 if p_ativo is null then raise exception 'Status local inválido.';end if;
 if p_user_id=(select auth.uid()) then raise exception 'Um administrador não pode alterar o próprio status.' using errcode='42501';end if;
 perform 1 from public.ligas where id=p_liga_id for update;
 select * into strict v_atual from public.liga_membros where liga_id=p_liga_id and user_id=p_user_id for update;
 if v_atual.status=v_novo then return;end if;
 if v_atual.papel='administrador' and not p_ativo then
  select count(*) into v_admins from public.liga_membros where liga_id=p_liga_id and status='ativo' and papel='administrador';
  if v_admins<=1 then raise exception 'A liga deve manter ao menos um administrador ativo.';end if;
 end if;
 update public.liga_membros set status=v_novo,inativado_em=case when p_ativo then null else now() end,atualizado_em=now() where liga_id=p_liga_id and user_id=p_user_id;
 insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
 values(p_liga_id,p_user_id,(select auth.uid()),case when p_ativo then 'reativado' else 'inativado' end,v_atual.papel,v_atual.papel,v_atual.status,v_novo);
end $$;

revoke all on function private.usuario_administrador_liga(uuid) from public,anon,authenticated;
grant execute on function public.adicionar_membro_liga(uuid,text,text),public.alterar_papel_membro_liga(uuid,uuid,text),public.alterar_status_membro_liga(uuid,uuid,boolean) to authenticated;
commit;
