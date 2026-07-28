begin;

-- v6.5.1 — exclusão permanente dos dados de um participante no bolão.
-- A conta do Google/Supabase Auth não é removida; somente os dados do aplicativo.

create or replace function public.deletar_participante_bolao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_target public.participantes_autorizados%rowtype;
  v_target_user_id uuid;
  v_current_email text := lower(coalesce(auth.jwt() ->> 'email',''));
begin
  select exists(
    select 1
    from public.participantes_autorizados
    where lower(email) = v_current_email
      and administrador is true
      and ativo is true
      and coalesce(status,'approved') = 'approved'
  ) into v_admin;

  if not v_admin then
    raise exception 'Apenas administradores podem excluir participantes.';
  end if;

  select * into v_target
  from public.participantes_autorizados
  where id = p_id
  for update;

  if not found then
    raise exception 'Participante não encontrado.';
  end if;

  if lower(v_target.email) = v_current_email then
    raise exception 'O administrador não pode excluir o próprio cadastro.';
  end if;

  if v_target.administrador is true then
    raise exception 'Outro administrador não pode ser excluído por esta tela.';
  end if;

  select user_id into v_target_user_id
  from public.participantes
  where lower(email) = lower(v_target.email)
  limit 1;

  -- Remove primeiro os dados dependentes. A identidade é user_id; o fallback por
  -- nome/e-mail cobre cadastros antigos que ainda não possuam user_id preenchido.
  if v_target_user_id is not null then
    delete from public.palpites where user_id = v_target_user_id;
  end if;

  delete from public.palpites
  where user_id is null
    and lower(usuario) = lower(v_target.nome);

  delete from public.participantes
  where (v_target_user_id is not null and user_id = v_target_user_id)
     or lower(email) = lower(v_target.email);

  delete from public.participantes_autorizados where id = p_id;
end;
$$;

grant execute on function public.deletar_participante_bolao(uuid) to authenticated;

commit;
