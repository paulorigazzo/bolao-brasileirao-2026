-- Bolão Brasileirão 2026 — v6.7.1
-- Limite configurável de participantes ativos e feedback de aprovação.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

begin;

create table if not exists public.configuracoes_bolao (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);

insert into public.configuracoes_bolao (chave, valor)
values ('max_participantes_ativos', to_jsonb(10))
on conflict (chave) do nothing;

alter table public.configuracoes_bolao enable row level security;

-- A leitura é feita por RPC; a tabela permanece fechada para acesso direto.
drop policy if exists "v671_configuracoes_sem_acesso_direto" on public.configuracoes_bolao;
create policy "v671_configuracoes_sem_acesso_direto"
on public.configuracoes_bolao
for all
to authenticated
using (false)
with check (false);

create or replace function public.obter_limite_participantes_ativos()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select greatest(1, least(100, coalesce((
    select (valor #>> '{}')::integer
    from public.configuracoes_bolao
    where chave = 'max_participantes_ativos'
  ), 10)));
$$;

grant execute on function public.obter_limite_participantes_ativos() to authenticated;

create or replace function public.definir_limite_participantes_ativos(p_limite integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_ativos integer;
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
    raise exception 'Apenas administradores podem alterar o limite de participantes.';
  end if;

  if p_limite is null or p_limite < 1 or p_limite > 100 then
    raise exception 'Informe um limite entre 1 e 100 participantes.';
  end if;

  select count(*) into v_ativos
  from public.participantes_autorizados
  where ativo is true
    and coalesce(status,'approved') = 'approved';

  if p_limite < v_ativos then
    raise exception 'O limite não pode ser menor que os % participantes ativos atuais.', v_ativos;
  end if;

  insert into public.configuracoes_bolao (chave, valor, atualizado_em, atualizado_por)
  values ('max_participantes_ativos', to_jsonb(p_limite), now(), auth.uid())
  on conflict (chave) do update
    set valor = excluded.valor,
        atualizado_em = excluded.atualizado_em,
        atualizado_por = excluded.atualizado_por;

  return p_limite;
end;
$$;

grant execute on function public.definir_limite_participantes_ativos(integer) to authenticated;

-- Remove somente triggers legados desta tabela cuja função contém a mensagem
-- exata do antigo limite fixo. Outros triggers não são alterados.
do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where n.nspname = 'public'
      and c.relname = 'participantes_autorizados'
      and not t.tgisinternal
      and p.prosrc ilike '%O bolão aceita no máximo 10 participantes ativos%'
  loop
    execute format('drop trigger if exists %I on public.participantes_autorizados', r.tgname);
  end loop;
end $$;

create or replace function public.validar_limite_participantes_ativos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limite integer;
  v_ativos integer;
  v_era_ativo boolean := false;
  v_sera_ativo boolean := false;
begin
  v_sera_ativo := new.ativo is true and coalesce(new.status,'approved') = 'approved';
  if tg_op = 'UPDATE' then
    v_era_ativo := old.ativo is true and coalesce(old.status,'approved') = 'approved';
  end if;

  if v_sera_ativo and not v_era_ativo then
    -- Serializa aprovações/reativações concorrentes para não ultrapassar o limite.
    perform pg_advisory_xact_lock(hashtext('bolao:max_participantes_ativos'));
    v_limite := public.obter_limite_participantes_ativos();

    select count(*) into v_ativos
    from public.participantes_autorizados
    where ativo is true
      and coalesce(status,'approved') = 'approved'
      and (tg_op <> 'UPDATE' or id <> new.id);

    if v_ativos >= v_limite then
      raise exception 'O bolão atingiu o limite configurado de % participantes ativos.', v_limite;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists v671_validar_limite_participantes_ativos on public.participantes_autorizados;
create trigger v671_validar_limite_participantes_ativos
before insert or update of ativo, status
on public.participantes_autorizados
for each row
execute function public.validar_limite_participantes_ativos();

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

grant execute on function public.decidir_solicitacao_participacao(uuid,text) to authenticated;

commit;

notify pgrst, 'reload schema';
