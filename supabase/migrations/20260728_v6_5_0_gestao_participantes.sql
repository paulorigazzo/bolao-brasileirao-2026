-- Bolão Brasileirão 2026 — v6.5.0
-- Gestão de participantes, edição de perfil e cadastro com aprovação do ADM.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

begin;

alter table public.participantes
  add column if not exists celular text;

alter table public.participantes_autorizados
  add column if not exists celular text,
  add column if not exists status text,
  add column if not exists solicitado_em timestamptz,
  add column if not exists aprovado_em timestamptz,
  add column if not exists aprovado_por uuid;

update public.participantes_autorizados
set status = case when ativo is false then 'inactive' else 'approved' end
where status is null;

update public.participantes_autorizados
set solicitado_em = coalesce(solicitado_em, criado_em, now())
where solicitado_em is null;

alter table public.participantes_autorizados
  alter column status set default 'approved';

alter table public.participantes_autorizados
  drop constraint if exists participantes_autorizados_status_check;

alter table public.participantes_autorizados
  add constraint participantes_autorizados_status_check
  check (status in ('pending','approved','rejected','inactive'));

create or replace function public.solicitar_participacao(
  p_nome text,
  p_celular text default null
)
returns public.participantes_autorizados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_result public.participantes_autorizados;
begin
  if auth.uid() is null or v_email = '' then
    raise exception 'É necessário entrar com uma conta Google.';
  end if;

  if length(trim(coalesce(p_nome,''))) < 2 then
    raise exception 'Informe um nome válido.';
  end if;

  insert into public.participantes_autorizados
    (nome, email, celular, ativo, administrador, status, solicitado_em, criado_em, atualizado_em)
  values
    (trim(p_nome), v_email, nullif(regexp_replace(coalesce(p_celular,''), '\\D', '', 'g'), ''), false, false, 'pending', now(), now(), now())
  on conflict (email) do update
    set nome = excluded.nome,
        celular = coalesce(excluded.celular, public.participantes_autorizados.celular),
        solicitado_em = case
          when public.participantes_autorizados.status in ('rejected','inactive') then now()
          else coalesce(public.participantes_autorizados.solicitado_em, now())
        end,
        status = case
          when public.participantes_autorizados.status = 'approved' then 'approved'
          else 'pending'
        end,
        ativo = case
          when public.participantes_autorizados.status = 'approved' then true
          else false
        end,
        atualizado_em = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.atualizar_meu_perfil(
  p_nome text,
  p_celular text default null
)
returns public.participantes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_phone text := nullif(regexp_replace(coalesce(p_celular,''), '\\D', '', 'g'), '');
  v_result public.participantes;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;

  if length(trim(coalesce(p_nome,''))) < 2 then
    raise exception 'Informe um nome com pelo menos 2 caracteres.';
  end if;

  if v_phone is not null and length(v_phone) not between 12 and 13 then
    raise exception 'Informe o celular com DDD.';
  end if;

  select status into v_status
  from public.participantes_autorizados
  where lower(email) = v_email;

  if coalesce(v_status,'approved') <> 'approved' then
    raise exception 'Seu cadastro ainda não está aprovado.';
  end if;

  update public.participantes
  set nome = trim(p_nome),
      celular = v_phone
  where user_id = auth.uid()
  returning * into v_result;

  if v_result.user_id is null then
    insert into public.participantes (user_id, nome, email, celular)
    values (auth.uid(), trim(p_nome), v_email, v_phone)
    returning * into v_result;
  end if;

  update public.participantes_autorizados
  set nome = trim(p_nome),
      celular = v_phone,
      atualizado_em = now()
  where lower(email) = v_email;

  -- O nome é apenas uma informação de exibição. A identidade real continua sendo user_id.
  update public.palpites
  set usuario = trim(p_nome)
  where user_id = auth.uid();

  return v_result;
end;
$$;

create or replace function public.decidir_solicitacao_participacao(
  p_id uuid,
  p_decisao text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  select exists(
    select 1
    from public.participantes_autorizados
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and administrador is true
      and ativo is true
      and coalesce(status,'approved') = 'approved'
  ) into v_admin;

  if not v_admin then
    raise exception 'Apenas administradores podem analisar solicitações.';
  end if;

  if p_decisao not in ('approve','reject') then
    raise exception 'Decisão inválida.';
  end if;

  update public.participantes_autorizados
  set status = case when p_decisao = 'approve' then 'approved' else 'rejected' end,
      ativo = (p_decisao = 'approve'),
      aprovado_em = case when p_decisao = 'approve' then now() else null end,
      aprovado_por = auth.uid(),
      atualizado_em = now()
  where id = p_id;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;
end;
$$;

grant execute on function public.solicitar_participacao(text,text) to authenticated;
grant execute on function public.atualizar_meu_perfil(text,text) to authenticated;
grant execute on function public.decidir_solicitacao_participacao(uuid,text) to authenticated;

create or replace function public.eh_administrador_atual()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.participantes_autorizados
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and administrador is true
      and ativo is true
      and coalesce(status,'approved') = 'approved'
  );
$$;

grant execute on function public.eh_administrador_atual() to authenticated;

alter table public.participantes_autorizados enable row level security;

drop policy if exists "v650_usuario_consulta_proprio_cadastro" on public.participantes_autorizados;
create policy "v650_usuario_consulta_proprio_cadastro"
on public.participantes_autorizados
for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  or public.eh_administrador_atual()
);

commit;
