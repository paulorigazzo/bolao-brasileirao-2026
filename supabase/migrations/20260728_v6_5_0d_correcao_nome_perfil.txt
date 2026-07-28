-- Bolão Brasileirão 2026 — v6.5.0d
-- Hotfix da alteração de nome sem modificar palpites já encerrados.
-- Execute no SQL Editor do Supabase antes de publicar a v6.5.0d.

begin;

alter table public.participantes
  add column if not exists celular text;

alter table public.participantes_autorizados
  add column if not exists celular text;

create or replace function public.atualizar_meu_perfil_v2(
  p_nome text,
  p_celular text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name text := trim(coalesce(p_nome, ''));
  v_phone text := nullif(regexp_replace(coalesce(p_celular, ''), '[^0-9]', '', 'g'), '');
  v_status text;
  v_result public.participantes;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Sessão inválida. Entre novamente com sua conta Google.';
  end if;

  if length(v_name) < 2 then
    raise exception 'Informe um nome com pelo menos 2 caracteres.';
  end if;

  if v_phone is not null and length(v_phone) not between 12 and 13 then
    raise exception 'Informe o celular com DDD.';
  end if;

  select coalesce(status, case when ativo then 'approved' else 'inactive' end)
    into v_status
  from public.participantes_autorizados
  where lower(email) = v_email
  limit 1;

  if coalesce(v_status, 'approved') <> 'approved' then
    raise exception 'Seu cadastro ainda não está aprovado.';
  end if;

  insert into public.participantes (user_id, nome, email, celular)
  values (v_uid, v_name, v_email, v_phone)
  on conflict (user_id) do update
    set nome = excluded.nome,
        email = excluded.email,
        celular = excluded.celular
  returning * into v_result;

  update public.participantes_autorizados
     set nome = v_name,
         celular = v_phone,
         atualizado_em = now()
   where lower(email) = v_email;

  -- O nome histórico em palpites não é regravado. A aplicação resolve o nome
  -- atual pelo user_id, evitando acionar a proteção de prazo dos palpites.

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.atualizar_meu_perfil_v2(text,text) to authenticated;

commit;
