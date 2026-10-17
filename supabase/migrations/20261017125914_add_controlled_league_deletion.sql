-- Exclusão controlada de ligas privadas arquivadas.
begin;

-- Capacidade interna transitória, sem escrita para papéis da API.
create table private.liga_exclusao_contexto (
  transacao bigint not null,
  processo integer not null,
  liga_id uuid not null,
  autor_user_id uuid not null,
  primary key (transacao,processo,liga_id)
);
alter table private.liga_exclusao_contexto enable row level security;
revoke all on table private.liga_exclusao_contexto from public,anon,authenticated,service_role;

create or replace function private.resumo_exclusao_liga(p_liga_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with registros as (
    select 'liga' as origem,to_jsonb(l) as valor from public.ligas l where l.id=p_liga_id
    union all select 'membro',to_jsonb(m) from public.liga_membros m where m.liga_id=p_liga_id
    union all select 'historico_liga',to_jsonb(a) from private.ligas_auditoria a where a.liga_id=p_liga_id
    union all select 'historico_membro',to_jsonb(a) from private.liga_membros_auditoria a where a.liga_id=p_liga_id
    union all select 'designacao',to_jsonb(d) from private.participante_liga_designacoes d where d.liga_id=p_liga_id
  )
  select jsonb_build_object(
    'liga_id',l.id,'nome',l.nome,
    'membros',(select count(*) from public.liga_membros m where m.liga_id=l.id),
    'historico_liga',(select count(*) from private.ligas_auditoria a where a.liga_id=l.id),
    'historico_membros',(select count(*) from private.liga_membros_auditoria a where a.liga_id=l.id),
    'designacoes_resolvidas',(select count(*) from private.participante_liga_designacoes d where d.liga_id=l.id and d.estado<>'pendente'),
    'pendencias',(select count(*) from private.participante_liga_designacoes d where d.liga_id=l.id and d.estado='pendente'),
    'revisao',(select md5(coalesce(jsonb_agg(jsonb_build_array(origem,valor) order by origem,valor)::text,'')) from registros)
  ) from public.ligas l where l.id=p_liga_id;
$$;
revoke all on function private.resumo_exclusao_liga(uuid) from public,anon,authenticated,service_role;

create or replace function public.preparar_exclusao_liga(p_liga_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_liga public.ligas%rowtype;
begin
  if (select auth.uid()) is null or not private.usuario_gestor_central_ligas() then
    raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501';
  end if;
  select l.* into v_liga from public.ligas l join public.temporadas t on t.id=l.temporada_id
    where l.id=p_liga_id and t.codigo='brasileirao-2026';
  if not found then raise exception 'Liga não encontrada. Atualize a lista.'; end if;
  if v_liga.tipo<>'privada' or v_liga.status<>'arquivada' then
    raise exception 'Somente ligas privadas arquivadas podem ser excluídas.' using errcode='42501';
  end if;
  return private.resumo_exclusao_liga(p_liga_id);
end $$;

-- Mantém os dois gatilhos habilitados, inclusive durante a exclusão.
create or replace function private.impedir_mutacao_auditoria_liga()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' and tg_table_schema='private'
     and tg_table_name in ('ligas_auditoria','liga_membros_auditoria')
     and exists(select 1 from private.liga_exclusao_contexto c
       join public.ligas l on l.id=c.liga_id
       where c.transacao=txid_current() and c.processo=pg_backend_pid()
         and c.liga_id=old.liga_id and c.autor_user_id=(select auth.uid())
         and l.tipo='privada' and l.status='arquivada') then
    return old;
  end if;
  raise exception 'O histórico de membros da liga é imutável.' using errcode='42501';
end $$;

create or replace function public.excluir_liga(p_liga_id uuid,p_nome_confirmacao text,p_revisao text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_liga public.ligas%rowtype; v_resumo jsonb;
begin
  if (select auth.uid()) is null or not private.usuario_gestor_central_ligas() then
    raise exception 'Acesso restrito ao gestor central de ligas.' using errcode='42501';
  end if;
  -- Serializa com reativação/renomeação e impede novos vínculos via FK.
  select * into v_liga from public.ligas where id=p_liga_id for update;
  if not found then raise exception 'Liga não encontrada. Atualize a lista.'; end if;
  perform 1 from public.liga_membros where liga_id=p_liga_id for update;
  perform 1 from private.participante_liga_designacoes where liga_id=p_liga_id for update;
  perform 1 from private.ligas_auditoria where liga_id=p_liga_id for update;
  perform 1 from private.liga_membros_auditoria where liga_id=p_liga_id for update;
  v_resumo:=public.preparar_exclusao_liga(p_liga_id);
  if p_nome_confirmacao is distinct from v_liga.nome then
    raise exception 'Digite exatamente o nome da liga para confirmar.';
  end if;
  if (v_resumo->>'pendencias')::bigint>0 then
    raise exception 'Há designações pendentes. Cancele ou resolva as pendências antes de excluir a liga.';
  end if;
  if p_revisao is distinct from v_resumo->>'revisao' then
    raise exception 'A liga foi alterada. Reabra a confirmação e confira os dados atualizados.';
  end if;
  insert into private.liga_exclusao_contexto values(txid_current(),pg_backend_pid(),p_liga_id,(select auth.uid()));
  delete from private.ligas_auditoria where liga_id=p_liga_id;
  delete from private.liga_membros_auditoria where liga_id=p_liga_id;
  delete from private.participante_liga_designacoes where liga_id=p_liga_id and estado<>'pendente';
  delete from public.liga_membros where liga_id=p_liga_id;
  delete from public.ligas where id=p_liga_id;
  delete from private.liga_exclusao_contexto where transacao=txid_current() and processo=pg_backend_pid() and liga_id=p_liga_id;
  return p_liga_id;
end $$;
revoke all on function public.preparar_exclusao_liga(uuid) from public,anon,service_role;
revoke all on function public.excluir_liga(uuid,text,text) from public,anon,service_role;
grant execute on function public.preparar_exclusao_liga(uuid) to authenticated;
grant execute on function public.excluir_liga(uuid,text,text) to authenticated;
commit;
