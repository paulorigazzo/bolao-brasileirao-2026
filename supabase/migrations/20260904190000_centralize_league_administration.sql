-- L07 — Ativação por liga e administração centralizada.
begin;

do $$
declare
  v_gestor uuid;
  v_quantidade integer;
begin
  select l.criado_por into v_gestor
  from public.ligas l
  join public.temporadas t on t.id=l.temporada_id
  where l.tipo='standard' and t.codigo='brasileirao-2026';

  select count(*) into v_quantidade
  from public.participantes p
  join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
  where p.user_id=v_gestor and p.ativo is true and pa.ativo is true
    and coalesce(pa.status,'approved')='approved' and pa.administrador is true;

  if v_gestor is null or v_quantidade<>1 then
    raise exception 'A Liga Standard deve possuir exatamente um gestor central ativo, aprovado e administrador.';
  end if;
end $$;

create table private.ligas_auditoria (
  id bigint generated always as identity primary key,
  liga_id uuid not null references public.ligas(id) on delete restrict,
  autor_user_id uuid,
  acao text not null check (acao in ('criada','renomeada','arquivada','reativada')),
  nome_anterior text,
  nome_novo text,
  status_anterior text,
  status_novo text,
  criado_em timestamptz not null default now()
);
create index ligas_auditoria_liga_data_idx on private.ligas_auditoria(liga_id,criado_em desc);
alter table private.ligas_auditoria enable row level security;
revoke all on table private.ligas_auditoria from public,anon,authenticated;
grant all on table private.ligas_auditoria to service_role;

create trigger impedir_mutacao_ligas_auditoria
before update or delete on private.ligas_auditoria
for each row execute function private.impedir_mutacao_auditoria_liga();

create or replace function private.usuario_gestor_central_ligas()
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.ligas l
    join public.temporadas t on t.id=l.temporada_id
    join public.participantes p on p.user_id=l.criado_por
    join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
    where l.tipo='standard' and t.codigo='brasileirao-2026'
      and l.criado_por=(select auth.uid()) and p.ativo is true and pa.ativo is true
      and coalesce(pa.status,'approved')='approved' and pa.administrador is true
  );
$$;
revoke all on function private.usuario_gestor_central_ligas() from public,anon,authenticated;

create or replace function public.sou_gestor_central_ligas()
returns boolean language sql stable security definer set search_path='' as $$
  select private.usuario_gestor_central_ligas();
$$;

-- Garante o contrato de um único administrador em todas as ligas existentes.
with gestor as (
  select l.criado_por as user_id from public.ligas l
  join public.temporadas t on t.id=l.temporada_id
  where l.tipo='standard' and t.codigo='brasileirao-2026'
), alterados as (
  update public.liga_membros lm set papel='membro',atualizado_em=now()
  where lm.papel='administrador' and lm.user_id<>(select user_id from gestor)
  returning lm.liga_id,lm.user_id,lm.status
)
insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
select a.liga_id,a.user_id,(select user_id from gestor),'papel_alterado','administrador','membro',a.status,a.status from alterados a;

with gestor as (
  select l.criado_por as user_id from public.ligas l
  join public.temporadas t on t.id=l.temporada_id
  where l.tipo='standard' and t.codigo='brasileirao-2026'
)
insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em)
select l.id,g.user_id,'administrador','ativo',now(),null,g.user_id,now()
from public.ligas l cross join gestor g
on conflict(liga_id,user_id) do update set papel='administrador',status='ativo',inativado_em=null,atualizado_em=now();

create or replace function public.criar_liga(p_nome text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_gestor uuid:=(select auth.uid()); v_temporada uuid;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  if length(trim(coalesce(p_nome,''))) not between 2 and 100 then raise exception 'O nome da liga deve ter entre 2 e 100 caracteres.'; end if;
  select id into strict v_temporada from public.temporadas where codigo='brasileirao-2026' and status='ativa' for share;
  insert into public.ligas(id,temporada_id,codigo,nome,tipo,status,criado_por)
  values(v_id,v_temporada,'privada-'||replace(v_id::text,'-',''),trim(p_nome),'privada','ativa',v_gestor);
  insert into public.liga_membros(liga_id,user_id,papel,status,adicionado_por)
  values(v_id,v_gestor,'administrador','ativo',v_gestor);
  insert into private.ligas_auditoria(liga_id,autor_user_id,acao,nome_novo,status_novo)
  values(v_id,v_gestor,'criada',trim(p_nome),'ativa');
  return v_id;
end $$;

create or replace function public.renomear_liga(p_liga_id uuid,p_nome text)
returns void language plpgsql security definer set search_path='' as $$
declare v_liga public.ligas%rowtype;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  if length(trim(coalesce(p_nome,''))) not between 2 and 100 then raise exception 'O nome da liga deve ter entre 2 e 100 caracteres.'; end if;
  select * into strict v_liga from public.ligas where id=p_liga_id for update;
  if v_liga.tipo='standard' then raise exception 'A Liga Standard não pode ser renomeada.' using errcode='42501'; end if;
  if v_liga.nome=trim(p_nome) then return; end if;
  update public.ligas set nome=trim(p_nome),atualizado_em=now() where id=p_liga_id;
  insert into private.ligas_auditoria(liga_id,autor_user_id,acao,nome_anterior,nome_novo,status_anterior,status_novo)
  values(p_liga_id,(select auth.uid()),'renomeada',v_liga.nome,trim(p_nome),v_liga.status,v_liga.status);
end $$;

create or replace function public.alterar_status_liga(p_liga_id uuid,p_ativa boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_liga public.ligas%rowtype; v_status text:=case when p_ativa then 'ativa' else 'arquivada' end;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  if p_ativa is null then raise exception 'Status da liga inválido.'; end if;
  select * into strict v_liga from public.ligas where id=p_liga_id for update;
  if v_liga.tipo='standard' then raise exception 'A Liga Standard não pode ser arquivada.' using errcode='42501'; end if;
  if v_liga.status=v_status then return; end if;
  update public.ligas set status=v_status,atualizado_em=now() where id=p_liga_id;
  insert into private.ligas_auditoria(liga_id,autor_user_id,acao,nome_anterior,nome_novo,status_anterior,status_novo)
  values(p_liga_id,(select auth.uid()),case when p_ativa then 'reativada' else 'arquivada' end,v_liga.nome,v_liga.nome,v_liga.status,v_status);
end $$;

create or replace function public.listar_ligas_administracao()
returns table(liga_id uuid,liga_nome text,liga_tipo text,liga_status text,membros_ativos bigint,criado_em timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  return query select l.id,l.nome,l.tipo,l.status,count(lm.user_id) filter(where lm.status='ativo'),l.criado_em
  from public.ligas l left join public.liga_membros lm on lm.liga_id=l.id
  join public.temporadas t on t.id=l.temporada_id
  where t.codigo='brasileirao-2026' group by l.id order by (l.tipo='standard') desc,l.nome;
end $$;

create or replace function public.listar_auditoria_ligas()
returns table(id bigint,liga_id uuid,liga_nome text,autor_nome text,acao text,nome_anterior text,nome_novo text,status_anterior text,status_novo text,criado_em timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  return query select a.id,a.liga_id,l.nome,coalesce(p.nome,'Sistema'),a.acao,a.nome_anterior,a.nome_novo,a.status_anterior,a.status_novo,a.criado_em
  from private.ligas_auditoria a join public.ligas l on l.id=a.liga_id
  left join public.participantes p on p.user_id=a.autor_user_id order by a.criado_em desc limit 100;
end $$;

-- A gestão de membros passa a ser central, e a atribuição de administradores deixa de ser pública.
create or replace function private.usuario_administrador_liga(p_liga_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.usuario_gestor_central_ligas() and exists(select 1 from public.ligas where id=p_liga_id);
$$;

create or replace function public.adicionar_membro_liga(p_liga_id uuid,p_email text,p_papel text default 'membro')
returns void language plpgsql security definer set search_path='' as $$
declare v_alvo uuid; v_antigo public.liga_membros%rowtype; v_acao text;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  if p_papel<>'membro' then raise exception 'Somente a função de membro pode ser atribuída.' using errcode='42501'; end if;
  perform 1 from public.ligas where id=p_liga_id for update;
  if not found then raise exception 'Liga não encontrada.'; end if;
  select p.user_id into v_alvo from public.participantes p join public.participantes_autorizados pa on lower(pa.email)=lower(p.email)
  where lower(p.email)=lower(trim(p_email)) and p.ativo is true and pa.ativo is true and coalesce(pa.status,'approved')='approved' limit 1;
  if v_alvo is null then raise exception 'Participante elegível não encontrado.'; end if;
  if v_alvo=(select auth.uid()) then raise exception 'O gestor central já administra todas as ligas.'; end if;
  select * into v_antigo from public.liga_membros where liga_id=p_liga_id and user_id=v_alvo for update;
  if found and v_antigo.status='ativo' then raise exception 'Participante já integra esta liga.'; end if;
  v_acao:=case when found then 'reativado' else 'adicionado' end;
  insert into public.liga_membros(liga_id,user_id,papel,status,entrou_em,inativado_em,adicionado_por,atualizado_em)
  values(p_liga_id,v_alvo,'membro','ativo',now(),null,(select auth.uid()),now())
  on conflict(liga_id,user_id) do update set papel='membro',status='ativo',inativado_em=null,atualizado_em=now();
  insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
  values(p_liga_id,v_alvo,(select auth.uid()),v_acao,v_antigo.papel,'membro',v_antigo.status,'ativo');
end $$;

create or replace function public.alterar_status_membro_liga(p_liga_id uuid,p_user_id uuid,p_ativo boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_atual public.liga_membros%rowtype; v_novo text:=case when p_ativo then 'ativo' else 'inativo' end;
begin
  if not private.usuario_gestor_central_ligas() then raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501'; end if;
  if p_ativo is null then raise exception 'Status local inválido.'; end if;
  if p_user_id=(select auth.uid()) then raise exception 'O gestor central não pode alterar a própria associação.' using errcode='42501'; end if;
  perform 1 from public.ligas where id=p_liga_id for update;
  select * into strict v_atual from public.liga_membros where liga_id=p_liga_id and user_id=p_user_id for update;
  if v_atual.papel='administrador' then raise exception 'A administração central não pode ser alterada.' using errcode='42501'; end if;
  if v_atual.status=v_novo then return; end if;
  update public.liga_membros set status=v_novo,inativado_em=case when p_ativo then null else now() end,atualizado_em=now() where liga_id=p_liga_id and user_id=p_user_id;
  insert into private.liga_membros_auditoria(liga_id,user_id,autor_user_id,acao,papel_anterior,papel_novo,status_anterior,status_novo)
  values(p_liga_id,p_user_id,(select auth.uid()),case when p_ativo then 'reativado' else 'inativado' end,v_atual.papel,v_atual.papel,v_atual.status,v_novo);
end $$;

revoke all on function public.sou_gestor_central_ligas(),public.criar_liga(text),public.renomear_liga(uuid,text),public.alterar_status_liga(uuid,boolean),public.listar_ligas_administracao(),public.listar_auditoria_ligas() from public,anon;
grant execute on function public.sou_gestor_central_ligas(),public.criar_liga(text),public.renomear_liga(uuid,text),public.alterar_status_liga(uuid,boolean),public.listar_ligas_administracao(),public.listar_auditoria_ligas() to authenticated;
revoke execute on function public.alterar_papel_membro_liga(uuid,uuid,text) from public,anon,authenticated;

commit;
