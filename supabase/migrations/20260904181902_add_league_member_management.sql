-- L06 — Gestão auditável de membros e funções locais.
begin;

create table private.liga_membros_auditoria (
  id bigint generated always as identity primary key,
  liga_id uuid not null references public.ligas(id) on delete restrict,
  user_id uuid not null,
  autor_user_id uuid,
  acao text not null check (acao in ('adicionado','reativado','inativado','papel_alterado')),
  papel_anterior text,
  papel_novo text,
  status_anterior text,
  status_novo text,
  criado_em timestamptz not null default now()
);

create index liga_membros_auditoria_liga_data_idx
on private.liga_membros_auditoria (liga_id, criado_em desc);

alter table private.liga_membros_auditoria enable row level security;
revoke all on table private.liga_membros_auditoria from public, anon, authenticated;
grant all on table private.liga_membros_auditoria to service_role;

create or replace function private.impedir_mutacao_auditoria_liga()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'O histórico de membros da liga é imutável.' using errcode = '42501';
end;
$$;

create trigger impedir_mutacao_liga_membros_auditoria
before update or delete on private.liga_membros_auditoria
for each row execute function private.impedir_mutacao_auditoria_liga();

create or replace function private.usuario_administrador_liga(p_liga_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.liga_membros lm
    join public.ligas l on l.id=lm.liga_id and l.status='ativa'
    join public.temporadas t on t.id=l.temporada_id and t.status='ativa'
    where lm.liga_id=p_liga_id and lm.user_id=(select auth.uid())
      and lm.status='ativo' and lm.papel='administrador'
  );
$$;

create or replace function public.listar_gestao_membros_liga(p_liga_id uuid)
returns table (user_id uuid,nome text,email text,time_favorito text,papel text,status text,entrou_em timestamptz,inativado_em timestamptz,atualizado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.usuario_administrador_liga(p_liga_id) then
    raise exception 'Administração local da liga obrigatória.' using errcode='42501';
  end if;
  return query select p.user_id,p.nome,p.email,p.time_favorito,lm.papel,lm.status,lm.entrou_em,lm.inativado_em,lm.atualizado_em
  from public.liga_membros lm join public.participantes p on p.user_id=lm.user_id
  where lm.liga_id=p_liga_id order by (lm.status='ativo') desc,p.nome;
end; $$;

create or replace function public.listar_auditoria_membros_liga(p_liga_id uuid)
returns table (id bigint,user_id uuid,nome text,autor_nome text,acao text,papel_anterior text,papel_novo text,status_anterior text,status_novo text,criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.usuario_administrador_liga(p_liga_id) then
    raise exception 'Administração local da liga obrigatória.' using errcode='42501';
  end if;
  return query select a.id,a.user_id,coalesce(p.nome,'Participante removido'),coalesce(autor.nome,'Sistema'),a.acao,a.papel_anterior,a.papel_novo,a.status_anterior,a.status_novo,a.criado_em
  from private.liga_membros_auditoria a
  left join public.participantes p on p.user_id=a.user_id
  left join public.participantes autor on autor.user_id=a.autor_user_id
  where a.liga_id=p_liga_id order by a.criado_em desc limit 100;
end; $$;

create or replace function public.adicionar_membro_liga(p_liga_id uuid,p_email text,p_papel text default 'membro')
returns void language plpgsql security definer set search_path = '' as $$
declare v_alvo uuid; v_antigo public.liga_membros%rowtype; v_acao text;
begin
  if not private.usuario_administrador_liga(p_liga_id) then raise exception 'Administração local da liga obrigatória.' using errcode='42501'; end if;
  if p_papel not in ('membro','administrador') then raise exception 'Função local inválida.'; end if;
  perform 1 from public.ligas where id=p_liga_id for update;
  select p.user_id into v_alvo from public.participantes p join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
  where lower(p.email)=lower(trim(p_email)) and p.ativo is true and pa.ativo is true and coalesce(pa.status,'approved')='approved' limit 1;
  if v_alvo is null then raise exception 'Participante elegível não encontrado.'; end if;
  select * into v_antigo from public.liga_membros where liga_id=p_liga_id and user_id=v_alvo for update;
  if found and v_antigo.status='ativo' then raise exception 'Participante já integra esta liga.'; end if;
  v_acao:=case when found then 'reativado' else 'adicionado' end;
  insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em)
  values(p_liga_id,v_alvo,p_papel,'ativo',now(),null,(select auth.uid()),now())
  on conflict(liga_id,user_id) do update set papel=excluded.papel,status='ativo',inativado_em=null,atualizado_em=now();
  insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
  values(p_liga_id,v_alvo,(select auth.uid()),v_acao,v_antigo.papel,p_papel,v_antigo.status,'ativo');
end; $$;

create or replace function public.alterar_papel_membro_liga(p_liga_id uuid,p_user_id uuid,p_papel text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_atual public.liga_membros%rowtype; v_admins integer;
begin
  if not private.usuario_administrador_liga(p_liga_id) then raise exception 'Administração local da liga obrigatória.' using errcode='42501'; end if;
  if p_papel not in ('membro','administrador') then raise exception 'Função local inválida.'; end if;
  if p_user_id=(select auth.uid()) then raise exception 'Um administrador não pode alterar a própria função.' using errcode='42501'; end if;
  perform 1 from public.ligas where id=p_liga_id for update;
  select * into strict v_atual from public.liga_membros where liga_id=p_liga_id and user_id=p_user_id for update;
  if v_atual.status<>'ativo' then raise exception 'Somente membros ativos podem mudar de função.'; end if;
  if v_atual.papel='administrador' and p_papel='membro' then
    select count(*) into v_admins from public.liga_membros where liga_id=p_liga_id and status='ativo' and papel='administrador';
    if v_admins<=1 then raise exception 'A liga deve manter ao menos um administrador ativo.'; end if;
  end if;
  if v_atual.papel=p_papel then return; end if;
  update public.liga_membros set papel=p_papel,atualizado_em=now() where liga_id=p_liga_id and user_id=p_user_id;
  insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
  values(p_liga_id,p_user_id,(select auth.uid()),'papel_alterado',v_atual.papel,p_papel,v_atual.status,v_atual.status);
end; $$;

create or replace function public.alterar_status_membro_liga(p_liga_id uuid,p_user_id uuid,p_ativo boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_atual public.liga_membros%rowtype; v_novo text:=case when p_ativo then 'ativo' else 'inativo' end; v_admins integer;
begin
  if not private.usuario_administrador_liga(p_liga_id) then raise exception 'Administração local da liga obrigatória.' using errcode='42501'; end if;
  if p_ativo is null then raise exception 'Status local inválido.'; end if;
  if p_user_id=(select auth.uid()) then raise exception 'Um administrador não pode alterar o próprio status.' using errcode='42501'; end if;
  perform 1 from public.ligas where id=p_liga_id for update;
  select * into strict v_atual from public.liga_membros where liga_id=p_liga_id and user_id=p_user_id for update;
  if v_atual.status=v_novo then return; end if;
  if v_atual.papel='administrador' and not p_ativo then
    select count(*) into v_admins from public.liga_membros where liga_id=p_liga_id and status='ativo' and papel='administrador';
    if v_admins<=1 then raise exception 'A liga deve manter ao menos um administrador ativo.'; end if;
  end if;
  update public.liga_membros set status=v_novo,inativado_em=case when p_ativo then null else now() end,atualizado_em=now()
  where liga_id=p_liga_id and user_id=p_user_id;
  insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
  values(p_liga_id,p_user_id,(select auth.uid()),case when p_ativo then 'reativado' else 'inativado' end,v_atual.papel,v_atual.papel,v_atual.status,v_novo);
end; $$;

revoke all on function private.impedir_mutacao_auditoria_liga() from public,anon,authenticated;
revoke all on function private.usuario_administrador_liga(uuid) from public,anon,authenticated;
revoke all on function public.listar_gestao_membros_liga(uuid) from public,anon;
revoke all on function public.listar_auditoria_membros_liga(uuid) from public,anon;
revoke all on function public.adicionar_membro_liga(uuid,text,text) from public,anon;
revoke all on function public.alterar_papel_membro_liga(uuid,uuid,text) from public,anon;
revoke all on function public.alterar_status_membro_liga(uuid,uuid,boolean) from public,anon;
grant execute on function public.listar_gestao_membros_liga(uuid),public.listar_auditoria_membros_liga(uuid),public.adicionar_membro_liga(uuid,text,text),public.alterar_papel_membro_liga(uuid,uuid,text),public.alterar_status_membro_liga(uuid,uuid,boolean) to authenticated;

commit;
