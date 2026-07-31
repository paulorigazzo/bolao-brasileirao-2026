-- Bolão Brasileirão 2026 — v6.8.0
-- Cadastro consolidado com nome, celular opcional e time favorito opcional.
-- Migração aditiva: as funções anteriores permanecem disponíveis para rollback.

begin;

alter table public.participantes_autorizados
  add column if not exists time_favorito text;

create or replace function public.solicitar_participacao_v2(
  p_nome text,
  p_celular text default null,
  p_time_favorito text default null
)
returns public.participantes_autorizados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_phone text := nullif(regexp_replace(coalesce(p_celular, ''), '[^0-9]', '', 'g'), '');
  v_team text := nullif(trim(coalesce(p_time_favorito, '')), '');
  v_result public.participantes_autorizados;
begin
  if auth.uid() is null or v_email = '' then
    raise exception 'É necessário entrar com uma conta Google.';
  end if;

  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Informe um nome com pelo menos 2 caracteres.';
  end if;

  if v_phone is not null and length(v_phone) not between 12 and 13 then
    raise exception 'Confira o DDD e o número do celular.';
  end if;

  if v_team is not null and length(v_team) > 80 then
    raise exception 'Time favorito inválido.';
  end if;

  insert into public.participantes_autorizados
    (nome, email, celular, time_favorito, ativo, administrador, status, solicitado_em, criado_em, atualizado_em)
  values
    (trim(p_nome), v_email, v_phone, v_team, false, false, 'pending', now(), now(), now())
  on conflict (email) do update
    set nome = excluded.nome,
        celular = excluded.celular,
        time_favorito = excluded.time_favorito,
        solicitado_em = case
          when public.participantes_autorizados.status in ('rejected', 'inactive') then now()
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

create or replace function public.registrar_meu_perfil_consolidado()
returns public.participantes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_authorization public.participantes_autorizados%rowtype;
  v_result public.participantes;
begin
  if auth.uid() is null or v_email = '' then
    raise exception 'Sessão inválida. Entre novamente com sua conta Google.';
  end if;

  select *
  into v_authorization
  from public.participantes_autorizados
  where lower(email) = v_email
  limit 1;

  if v_authorization.id is null
     or coalesce(v_authorization.status, 'approved') <> 'approved'
     or v_authorization.ativo is false then
    raise exception 'Seu cadastro ainda não está aprovado.';
  end if;

  insert into public.participantes (user_id, nome, email, celular, time_favorito)
  values (
    auth.uid(),
    trim(v_authorization.nome),
    v_email,
    v_authorization.celular,
    v_authorization.time_favorito
  )
  on conflict (user_id) do update
    set nome = excluded.nome,
        email = excluded.email,
        celular = excluded.celular,
        time_favorito = excluded.time_favorito
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.solicitar_participacao_v2(text, text, text) to authenticated;
grant execute on function public.registrar_meu_perfil_consolidado() to authenticated;

commit;

-- Rollback de aplicação:
-- 1. reverta o frontend para a versão anterior;
-- 2. as funções v2 e a coluna aditiva podem permanecer sem afetar o fluxo legado.
-- Se a remoção for realmente necessária e não houver dados dependentes:
-- drop function if exists public.registrar_meu_perfil_consolidado();
-- drop function if exists public.solicitar_participacao_v2(text, text, text);
-- alter table public.participantes_autorizados drop column if exists time_favorito;
