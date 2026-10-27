-- Controle separado: nunca entra nas contagens/envios aos participantes.
begin;

alter table public.push_automaticos add column envio_tentado_em timestamptz;
create table public.push_consolidados_adm (
  id uuid primary key default gen_random_uuid(),
  temporada integer not null,
  rodada integer not null check (rodada between 0 and 38),
  tipo text not null check (tipo in ('activation','12h','2h','summary')),
  evento_id uuid references public.push_consolidados_adm(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete cascade,
  estado text not null default 'pending' check (estado in ('control','pending','processing','sent','skipped','failed')),
  participantes integer not null default 0 check (participantes>=0),
  aceitos integer not null default 0 check (aceitos>=0),
  falhas integer not null default 0 check (falhas>=0),
  tentados integer not null default 0 check (tentados>=0),
  tentativas integer not null default 0 check (tentativas between 0 and 3),
  worker_id uuid,
  reserva_ate timestamptz,
  proxima_tentativa timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((subscription_id is null and evento_id is null and estado='control'
      and ((tipo='activation' and rodada=0) or (tipo<>'activation' and rodada>0)))
    or (subscription_id is not null and evento_id is not null and tipo<>'activation' and rodada>0 and estado<>'control'))
);
create unique index push_consolidados_adm_evento_idx on public.push_consolidados_adm(temporada,rodada,tipo)
  where subscription_id is null;
create unique index push_consolidados_adm_aparelho_idx on public.push_consolidados_adm(evento_id,subscription_id)
  where subscription_id is not null;
create index push_consolidados_adm_fila_idx on public.push_consolidados_adm(proxima_tentativa)
  where estado in ('pending','processing');
alter table public.push_consolidados_adm enable row level security;
revoke all on table public.push_consolidados_adm from public,anon,authenticated;
grant all on table public.push_consolidados_adm to service_role;
comment on table public.push_consolidados_adm is 'Controle operacional de consolidados ao ADM, independente dos participantes. Sem mensagens, endpoints ou chaves. Preservar na temporada para impedir reenvios.';

create function private.push_consolidado_adm_elegivel(p_user uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.participantes p
    join public.participantes_autorizados a on lower(trim(a.email))=lower(trim(p.email))
    where p.user_id=p_user and p.ativo is true and a.ativo is true
      and coalesce(a.status,'approved')='approved' and a.administrador is true);
$$;

-- A ativação precede a criação de trabalhos novos, na mesma transação.
-- Nenhuma função original é substituída; o rollback do código continua compatível.
create function public.preparar_push_automaticos_com_adm(p_temporada integer)
returns void language plpgsql security invoker set search_path='' as $$
begin
  insert into public.push_consolidados_adm(temporada,rodada,tipo,estado)
    values(p_temporada,0,'activation','control') on conflict do nothing;
  perform public.preparar_push_automaticos(p_temporada);
end;
$$;

-- Registra tentativa real de transporte; reserva, adiamento e descarte não são tentativa.
create function public.concluir_push_automatico_com_adm(p_id uuid,p_worker uuid,p_resultado text,p_tentado boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not public.concluir_push_automatico(p_id,p_worker,p_resultado) then return false; end if;
  if p_tentado then
    update public.push_automaticos set envio_tentado_em=coalesce(envio_tentado_em,now()) where id=p_id;
  end if;
  return true;
end;
$$;

create function public.reservar_consolidados_push_adm(p_temporada integer,p_worker uuid,p_limite integer default 100)
returns table(id uuid,tipo text,rodada integer)
language plpgsql security invoker set search_path='' as $$
declare v_ativacao timestamptz; r record; v_evento uuid;
begin
  -- Um único preparador consolida o conjunto; workers distintos reservam aparelhos distintos.
  if pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('push-consolidados-adm-'||p_temporada,0)) then
    select c.criado_em into v_ativacao from public.push_consolidados_adm c
      where c.temporada=p_temporada and c.tipo='activation';
    for r in
      select q.rodada,q.tipo,
        count(distinct s.user_id) filter(where q.estado='sent')::integer participantes,
        count(*) filter(where q.estado='sent')::integer aceitos,
        count(*) filter(where q.envio_tentado_em is not null and q.estado in ('failed','skipped'))::integer falhas,
        count(*) filter(where q.envio_tentado_em is not null)::integer tentados
      from public.push_automaticos q
      left join public.push_subscriptions s on s.id=q.subscription_id
      where q.temporada=p_temporada and q.tipo in ('12h','2h','summary')
      group by q.rodada,q.tipo
      having min(q.criado_em)>=v_ativacao
        and bool_and(q.estado in ('sent','skipped','failed'))
        and bool_or(q.envio_tentado_em is not null)
        -- Não fecha o consolidado enquanto a janela ainda pode admitir novos lembretes.
        and (q.tipo='summary' or now()>coalesce((select min(j.inicio)
          from public.jogos j where j.temporada=p_temporada and j.rodada=q.rodada
            and lower(coalesce(j.status,'')) !~ '(cancel|anulad|adiad|postpon)')
          -case when q.tipo='12h' then interval '12 hours' else interval '2 hours' end,min(q.criado_em))+interval '15 minutes')
    loop
      v_evento:=null;
      insert into public.push_consolidados_adm(temporada,rodada,tipo,estado,participantes,aceitos,falhas,tentados)
        values(p_temporada,r.rodada,r.tipo,'control',r.participantes,r.aceitos,r.falhas,r.tentados)
        on conflict do nothing returning public.push_consolidados_adm.id into v_evento;
      if v_evento is not null then
        insert into public.push_consolidados_adm(temporada,rodada,tipo,evento_id,subscription_id)
          select p_temporada,r.rodada,r.tipo,v_evento,s.id from public.push_subscriptions s
          where s.ativo is true and private.push_consolidado_adm_elegivel(s.user_id)
          on conflict do nothing;
      end if;
    end loop;
    update public.push_consolidados_adm c set estado='failed',worker_id=null,reserva_ate=null,atualizado_em=now()
      where c.temporada=p_temporada and c.estado='processing' and c.reserva_ate<now() and c.tentativas>=3;
  end if;
  return query with candidates as (
    select c.id from public.push_consolidados_adm c
    where c.temporada=p_temporada and c.subscription_id is not null and c.tentativas<3
      and c.proxima_tentativa<=now()
      and (c.estado='pending' or (c.estado='processing' and c.reserva_ate<now()))
    order by c.proxima_tentativa,c.id limit greatest(1,least(coalesce(p_limite,100),100)) for update skip locked
  ) update public.push_consolidados_adm c set estado='processing',worker_id=p_worker,
      reserva_ate=now()+interval '2 minutes',tentativas=c.tentativas+1,atualizado_em=now()
    from candidates x where c.id=x.id returning c.id,c.tipo,c.rodada;
end;
$$;

create function public.obter_conteudo_consolidado_adm(p_id uuid,p_worker uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.push_consolidados_adm%rowtype; e public.push_consolidados_adm%rowtype;
  s public.push_subscriptions%rowtype; v_ttl integer;
begin
  select * into q from public.push_consolidados_adm c where c.id=p_id and c.worker_id=p_worker
    and c.estado='processing' and c.reserva_ate>now();
  if not found then return null; end if;
  select * into s from public.push_subscriptions x where x.id=q.subscription_id and x.ativo is true;
  if not found or not private.push_consolidado_adm_elegivel(s.user_id) then return null; end if;
  select * into e from public.push_consolidados_adm c where c.id=q.evento_id and c.estado='control';
  if not found then return null; end if;
  v_ttl:=greatest(0,least(3600,extract(epoch from e.criado_em+interval '1 hour'-now())::integer));
  if v_ttl<=0 then return null; end if;
  return jsonb_build_object('endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,'ttl',v_ttl,
    'participants',e.participantes,'accepted',e.aceitos,'failed',e.falhas,'attempted',e.tentados);
end;
$$;

create function public.concluir_consolidado_push_adm(p_id uuid,p_worker uuid,p_resultado text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_subscription uuid;
begin
  if p_resultado not in ('sent','skipped','expired','retry','failed') then raise exception 'Resultado inválido'; end if;
  update public.push_consolidados_adm c set
    estado=case when p_resultado='retry' and c.tentativas<3 then 'pending' when p_resultado='retry' then 'failed'
      when p_resultado='expired' then 'skipped' else p_resultado end,
    proxima_tentativa=now()+interval '5 minutes',worker_id=null,reserva_ate=null,atualizado_em=now()
    where c.id=p_id and c.worker_id=p_worker and c.estado='processing' and c.reserva_ate>now()
    returning c.subscription_id into v_subscription;
  if not found then return false; end if;
  if p_resultado='expired' then
    update public.push_subscriptions set ativo=false,atualizado_em=now() where id=v_subscription;
  end if;
  return true;
end;
$$;

revoke all on function private.push_consolidado_adm_elegivel(uuid) from public,anon,authenticated;
grant execute on function private.push_consolidado_adm_elegivel(uuid) to service_role;
revoke all on function public.preparar_push_automaticos_com_adm(integer),
  public.concluir_push_automatico_com_adm(uuid,uuid,text,boolean),
  public.reservar_consolidados_push_adm(integer,uuid,integer),
  public.obter_conteudo_consolidado_adm(uuid,uuid),
  public.concluir_consolidado_push_adm(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.preparar_push_automaticos_com_adm(integer),
  public.concluir_push_automatico_com_adm(uuid,uuid,text,boolean),
  public.reservar_consolidados_push_adm(integer,uuid,integer),
  public.obter_conteudo_consolidado_adm(uuid,uuid),
  public.concluir_consolidado_push_adm(uuid,uuid,text) to service_role;
commit;
