-- Automação Web Push: controle operacional por temporada/rodada/aparelho.
-- Preparada localmente; aplicação remota e ativação exigem autorização.
begin;

create table public.push_automaticos (
  id uuid primary key default gen_random_uuid(),
  temporada integer not null,
  rodada integer not null check (rodada between 0 and 38),
  tipo text not null check (tipo in ('activation','baseline','12h','2h','summary')),
  subscription_id uuid references public.push_subscriptions(id) on delete cascade,
  estado text not null default 'pending' check (estado in ('control','pending','processing','sent','skipped','failed')),
  tentativas integer not null default 0 check (tentativas between 0 and 3),
  worker_id uuid,
  reserva_ate timestamptz,
  proxima_tentativa timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((tipo='activation' and rodada=0 and subscription_id is null and estado='control')
    or (tipo='baseline' and rodada>0 and subscription_id is null and estado='control')
    or (tipo in ('12h','2h','summary') and rodada>0 and subscription_id is not null))
);
create unique index push_automaticos_evento_idx on public.push_automaticos
  (temporada,rodada,tipo,coalesce(subscription_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index push_automaticos_pendentes_idx on public.push_automaticos(proxima_tentativa)
  where estado in ('pending','processing');
alter table public.push_automaticos enable row level security;
revoke all on table public.push_automaticos from public,anon,authenticated;
grant all on table public.push_automaticos to service_role;
comment on table public.push_automaticos is 'Marcadores operacionais Web Push. Não armazena mensagens, endpoints ou chaves. Preservar durante a temporada para evitar reenvio.';

create function private.push_automatico_usuario_elegivel(p_user uuid,p_temporada integer)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists (
    select 1 from public.participantes p
    join public.participantes_autorizados a on lower(trim(a.email))=lower(trim(p.email))
    where p.user_id=p_user and p.ativo is true and a.ativo is true and a.status='approved'
    and exists (
      select 1 from public.liga_membros m
      join public.ligas l on l.id=m.liga_id and l.status='ativa'
      join public.temporadas t on t.id=l.temporada_id and t.status='ativa'
      where m.user_id=p.user_id and m.status='ativo' and t.ano=p_temporada
    )
  );
$$;

create function private.push_automatico_rodada_completa(p_temporada integer,p_rodada integer)
returns boolean language sql stable security invoker set search_path='' as $$
  select count(*)=10 and bool_and(
    lower(coalesce(j.status,'')) ~ '(cancel|anulad)'
    or (lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded|finished)'
      and j.gols_casa is not null and j.gols_fora is not null)
  ) from public.jogos j where j.temporada=p_temporada and j.rodada=p_rodada;
$$;

-- Tudo é selecionado no servidor: nenhuma página REST de 1000 registros é usada.
create function public.preparar_push_automaticos(p_temporada integer)
returns void language plpgsql security invoker set search_path='' as $$
declare v_now timestamptz:=now();
begin
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('push-automaticos-'||p_temporada,0)) then return; end if;
  update public.push_automaticos set estado='failed',worker_id=null,reserva_ate=null,atualizado_em=v_now
    where temporada=p_temporada and estado='processing' and reserva_ate<v_now and tentativas>=3;
  if not exists(select 1 from public.push_automaticos where temporada=p_temporada and tipo='activation') then
    insert into public.push_automaticos(temporada,rodada,tipo,estado) values(p_temporada,0,'activation','control');
    -- Baseline atômica no primeiro processamento habilitado, não na data da migration.
    insert into public.push_automaticos(temporada,rodada,tipo,estado)
      select p_temporada,j.rodada,'baseline','control' from public.jogos j
      where j.temporada=p_temporada
      group by j.rodada having private.push_automatico_rodada_completa(p_temporada,j.rodada);
  end if;

  insert into public.push_automaticos(temporada,rodada,tipo,subscription_id)
  select p_temporada,r.rodada,etapa.tipo,s.id
  from (
    select j.rodada,min(j.inicio) inicio from public.jogos j
    where j.temporada=p_temporada and lower(coalesce(j.status,'')) !~ '(cancel|anulad|adiad|postpon)'
    group by j.rodada
  ) r
  cross join (values ('12h',interval '12 hours'),('2h',interval '2 hours')) etapa(tipo,antecedencia)
  join public.push_subscriptions s on s.ativo is true
  where v_now>=r.inicio-etapa.antecedencia and v_now<=r.inicio-etapa.antecedencia+interval '15 minutes'
    and private.push_automatico_usuario_elegivel(s.user_id,p_temporada)
    and exists (
      select 1 from public.jogos j where j.temporada=p_temporada and j.rodada=r.rodada
        and j.inicio>v_now+interval '30 minutes'
        and lower(coalesce(j.status,'')) !~ '(encerr|finaliz|awarded|finished|cancel|anulad|adiad|postpon)'
        and not exists(select 1 from public.palpites p where p.user_id=s.user_id and p.id_jogo=j.id_jogo)
    )
  on conflict do nothing;

  insert into public.push_automaticos(temporada,rodada,tipo,subscription_id)
  select p_temporada,r.rodada,'summary',s.id
  from (select distinct j.rodada from public.jogos j where j.temporada=p_temporada) r
  join public.push_subscriptions s on s.ativo is true
  where private.push_automatico_rodada_completa(p_temporada,r.rodada)
    and private.push_automatico_usuario_elegivel(s.user_id,p_temporada)
    and not exists(select 1 from public.push_automaticos b where b.temporada=p_temporada and b.rodada=r.rodada and b.tipo='baseline')
    -- Assinaturas novas não recebem resumo de uma rodada cujo envio já começou.
    and not exists(select 1 from public.push_automaticos b where b.temporada=p_temporada and b.rodada=r.rodada and b.tipo='summary' and b.criado_em<s.autorizado_em)
  on conflict do nothing;
end;
$$;

create function public.reservar_push_automaticos(p_temporada integer,p_worker uuid,p_limite integer default 100)
returns table(id uuid,tipo text,rodada integer,subscription_id uuid,tentativas integer)
language sql security invoker set search_path='' as $$
  with candidates as (
    select q.id from public.push_automaticos q
    where q.temporada=p_temporada and q.tipo in ('12h','2h','summary')
      and q.tentativas<3 and q.proxima_tentativa<=now()
      and (q.estado='pending' or (q.estado='processing' and q.reserva_ate<now()))
    order by case when q.tipo='summary' then 1 else 0 end,q.proxima_tentativa,q.id
    limit greatest(1,least(coalesce(p_limite,100),100)) for update skip locked
  )
  update public.push_automaticos q set estado='processing',worker_id=p_worker,
    reserva_ate=now()+interval '2 minutes',tentativas=q.tentativas+1,atualizado_em=now()
  from candidates c where q.id=c.id
  returning q.id,q.tipo,q.rodada,q.subscription_id,q.tentativas;
$$;

-- Revalidação imediatamente antes da entrega: permissão, contexto, prazo e palpites.
create function public.obter_conteudo_push_automatico(p_id uuid,p_worker uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.push_automaticos%rowtype; s public.push_subscriptions%rowtype;
  v_inicio timestamptz; v_due timestamptz; v_close timestamptz;
  v_pending integer; v_points integer; v_exact integer; v_nome text;
begin
  select * into q from public.push_automaticos x where x.id=p_id and x.worker_id=p_worker
    and x.estado='processing' and x.reserva_ate>now();
  if not found then return null; end if;
  select * into s from public.push_subscriptions x where x.id=q.subscription_id and x.ativo is true;
  if not found or not private.push_automatico_usuario_elegivel(s.user_id,q.temporada) then return null; end if;
  if q.tipo='summary' then
    if not private.push_automatico_rodada_completa(q.temporada,q.rodada) then
      return jsonb_build_object('deferUntil',now()+interval '5 minutes');
    end if;
    select coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora)),0)::integer,
      count(*) filter(where p.gols_casa=j.gols_casa and p.gols_fora=j.gols_fora)::integer
    into v_points,v_exact from public.jogos j
    join public.palpites p on p.id_jogo=j.id_jogo and p.user_id=s.user_id
    where j.temporada=q.temporada and j.rodada=q.rodada
      and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
      and j.gols_casa is not null and j.gols_fora is not null;
    return jsonb_build_object('endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
      'points',v_points,'exact',v_exact,'ttl',3600);
  end if;
  select min(j.inicio) into v_inicio from public.jogos j
    where j.temporada=q.temporada and j.rodada=q.rodada
      and lower(coalesce(j.status,'')) !~ '(cancel|anulad|adiad|postpon)';
  v_due:=v_inicio-case when q.tipo='12h' then interval '12 hours' else interval '2 hours' end;
  if v_due is null or now()>v_due+interval '15 minutes' then return null; end if;
  if now()<v_due then return jsonb_build_object('deferUntil',v_due); end if;
  select count(*)::integer,min(j.inicio-interval '30 minutes') into v_pending,v_close
  from public.jogos j where j.temporada=q.temporada and j.rodada=q.rodada
    and j.inicio>now()+interval '30 minutes'
    and lower(coalesce(j.status,'')) !~ '(encerr|finaliz|awarded|finished|cancel|anulad|adiad|postpon)'
    and not exists(select 1 from public.palpites p where p.user_id=s.user_id and p.id_jogo=j.id_jogo);
  if v_pending=0 then return null; end if;
  select p.nome into v_nome from public.participantes p where p.user_id=s.user_id;
  return jsonb_build_object('endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
    'name',v_nome,'pendingOpenPicks',v_pending,'nextCloseAt',v_close,
    'ttl',greatest(0,least(900,extract(epoch from v_close-now())::integer)));
end;
$$;

create function public.concluir_push_automatico(p_id uuid,p_worker uuid,p_resultado text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_subscription uuid; v_due timestamptz;
begin
  if p_resultado not in ('sent','skipped','expired','retry','failed','defer') then raise exception 'Resultado inválido'; end if;
  if p_resultado='defer' then
    select min(j.inicio)-case when q.tipo='12h' then interval '12 hours' else interval '2 hours' end
      into v_due from public.push_automaticos q join public.jogos j on j.temporada=q.temporada and j.rodada=q.rodada
      where q.id=p_id and q.tipo in ('12h','2h') and lower(coalesce(j.status,'')) !~ '(cancel|anulad|adiad|postpon)'
      group by q.tipo;
  end if;
  update public.push_automaticos q set
    estado=case when p_resultado='defer' then 'pending' when p_resultado='retry' and q.tentativas<3 then 'pending'
      when p_resultado='retry' then 'failed' when p_resultado='expired' then 'skipped' else p_resultado end,
    proxima_tentativa=greatest(coalesce(v_due,now()),now()+interval '5 minutes'),
    tentativas=case when p_resultado='defer' then greatest(q.tentativas-1,0) else q.tentativas end,
    worker_id=null,reserva_ate=null,atualizado_em=now()
    where q.id=p_id and q.worker_id=p_worker and q.estado='processing' and q.reserva_ate>now()
    returning q.subscription_id into v_subscription;
  if not found then return false; end if;
  if p_resultado='expired' then
    update public.push_subscriptions set ativo=false,atualizado_em=now() where id=v_subscription;
  end if;
  return true;
end;
$$;

revoke all on function private.push_automatico_usuario_elegivel(uuid,integer) from public,anon,authenticated;
revoke all on function private.push_automatico_rodada_completa(integer,integer) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.push_automatico_usuario_elegivel(uuid,integer),private.push_automatico_rodada_completa(integer,integer) to service_role;
revoke all on function public.preparar_push_automaticos(integer) from public,anon,authenticated;
revoke all on function public.reservar_push_automaticos(integer,uuid,integer) from public,anon,authenticated;
revoke all on function public.obter_conteudo_push_automatico(uuid,uuid) from public,anon,authenticated;
revoke all on function public.concluir_push_automatico(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.preparar_push_automaticos(integer),public.reservar_push_automaticos(integer,uuid,integer),
  public.obter_conteudo_push_automatico(uuid,uuid),public.concluir_push_automatico(uuid,uuid,text) to service_role;
commit;
