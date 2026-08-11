-- Detalha ocorrências da recuperação competitiva e permite registrar somente
-- a conferência administrativa, sem alterar jogos, palpites ou snapshots.

begin;

create table private.conferencias_recuperacao (
  chave text primary key,
  id_jogo bigint not null,
  tipo text not null check (tipo in ('jogo_sem_snapshot', 'divergencia_sem_historico', 'impacto_checkpoint')),
  conferido_por uuid not null,
  conferido_em timestamptz not null default now()
);

create index conferencias_recuperacao_jogo_idx
  on private.conferencias_recuperacao (id_jogo);

alter table private.conferencias_recuperacao enable row level security;

revoke all on table private.conferencias_recuperacao from public;
revoke all on table private.conferencias_recuperacao from anon;
revoke all on table private.conferencias_recuperacao from authenticated;
revoke all on table private.conferencias_recuperacao from service_role;

create or replace function private.ocorrencias_protecao_recuperacao()
returns table (
  chave text,
  id_jogo bigint,
  rodada integer,
  time_casa text,
  time_fora text,
  tipo text,
  severidade text,
  explicacao text,
  status_preservado text,
  status_atual text,
  gols_casa_preservado integer,
  gols_fora_preservado integer,
  gols_casa_atual integer,
  gols_fora_atual integer,
  alteracao_registrada boolean,
  palpites_afetados integer,
  checkpoint_consistente boolean,
  pode_conferir boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with divergencias_base as (
    select
      snapshot.id_jogo,
      jogo.rodada,
      jogo.time_casa,
      jogo.time_fora,
      snapshot.status as status_preservado,
      jogo.status as status_atual,
      snapshot.gols_casa as gols_casa_preservado,
      snapshot.gols_fora as gols_fora_preservado,
      jogo.gols_casa as gols_casa_atual,
      jogo.gols_fora as gols_fora_atual,
      exists (
        select 1
          from private.historico_resultados historico
         where historico.id_jogo = jogo.id_jogo
           and historico.status_novo is not distinct from jogo.status
           and historico.gols_casa_novo is not distinct from jogo.gols_casa
           and historico.gols_fora_novo is not distinct from jogo.gols_fora
      ) as alteracao_registrada,
      (
        select count(*)::integer
          from private.palpites_encerrados_snapshot palpite
         where palpite.id_jogo = jogo.id_jogo
           and public.calcular_pontos(
             palpite.gols_casa,
             palpite.gols_fora,
             snapshot.gols_casa,
             snapshot.gols_fora
           ) is distinct from public.calcular_pontos(
             palpite.gols_casa,
             palpite.gols_fora,
             jogo.gols_casa,
             jogo.gols_fora
           )
      ) as palpites_afetados
    from private.jogos_encerrados_snapshot snapshot
    join public.jogos jogo on jogo.id_jogo = snapshot.id_jogo
    where jogo.status is distinct from snapshot.status
       or jogo.gols_casa is distinct from snapshot.gols_casa
       or jogo.gols_fora is distinct from snapshot.gols_fora
  ), divergencias as (
    select
      divergencia.*,
      case
        when checkpoint.id is null then null
        when divergencia.palpites_afetados = 0 then true
        when exists (
          select 1
            from private.historico_resultados historico
           where historico.id_jogo = divergencia.id_jogo
             and historico.status_novo is not distinct from divergencia.status_atual
             and historico.gols_casa_novo is not distinct from divergencia.gols_casa_atual
             and historico.gols_fora_novo is not distinct from divergencia.gols_fora_atual
             and historico.registrado_em <= checkpoint.criado_em
        ) then true
        else false
      end as checkpoint_consistente
    from divergencias_base divergencia
    left join private.checkpoints_competitivos checkpoint
      on checkpoint.tipo = 'rodada'
     and checkpoint.rodada = divergencia.rodada
  ), ocorrencias_divergentes as (
    select
      'divergencia:' || divergencia.id_jogo || ':' || md5(concat_ws('|',
        divergencia.status_preservado,
        divergencia.status_atual,
        divergencia.gols_casa_preservado::text,
        divergencia.gols_fora_preservado::text,
        divergencia.gols_casa_atual::text,
        divergencia.gols_fora_atual::text
      )) as chave,
      divergencia.id_jogo,
      divergencia.rodada,
      divergencia.time_casa,
      divergencia.time_fora,
      case
        when divergencia.checkpoint_consistente is false then 'impacto_checkpoint'
        when divergencia.alteracao_registrada then 'alteracao_registrada'
        else 'divergencia_sem_historico'
      end as tipo,
      case
        when divergencia.checkpoint_consistente is false then 'critica'
        when divergencia.alteracao_registrada then 'informativa'
        else 'critica'
      end as severidade,
      case
        when divergencia.status_preservado is not distinct from divergencia.status_atual
         and divergencia.gols_casa_preservado is not distinct from divergencia.gols_casa_atual
         and divergencia.gols_fora_preservado is distinct from divergencia.gols_fora_atual
          then format('Placar do visitante corrigido de %s para %s após a primeira captura.',
            divergencia.gols_fora_preservado, divergencia.gols_fora_atual)
        when divergencia.status_preservado is not distinct from divergencia.status_atual
         and divergencia.gols_casa_preservado is distinct from divergencia.gols_casa_atual
         and divergencia.gols_fora_preservado is not distinct from divergencia.gols_fora_atual
          then format('Placar do mandante corrigido de %s para %s após a primeira captura.',
            divergencia.gols_casa_preservado, divergencia.gols_casa_atual)
        when divergencia.gols_casa_preservado is distinct from divergencia.gols_casa_atual
          or divergencia.gols_fora_preservado is distinct from divergencia.gols_fora_atual
          then format('Resultado atualizado após o encerramento: %s×%s → %s×%s.',
            divergencia.gols_casa_preservado, divergencia.gols_fora_preservado,
            divergencia.gols_casa_atual, divergencia.gols_fora_atual)
        else format('Status atualizado após a captura: %s → %s.',
          divergencia.status_preservado, divergencia.status_atual)
      end as explicacao,
      divergencia.status_preservado,
      divergencia.status_atual,
      divergencia.gols_casa_preservado,
      divergencia.gols_fora_preservado,
      divergencia.gols_casa_atual,
      divergencia.gols_fora_atual,
      divergencia.alteracao_registrada,
      divergencia.palpites_afetados,
      divergencia.checkpoint_consistente,
      divergencia.checkpoint_consistente is false or not divergencia.alteracao_registrada as pode_conferir
    from divergencias divergencia
  ), jogos_sem_snapshot as (
    select
      'sem_snapshot:' || jogo.id_jogo as chave,
      jogo.id_jogo,
      jogo.rodada,
      jogo.time_casa,
      jogo.time_fora,
      'jogo_sem_snapshot'::text as tipo,
      'atencao'::text as severidade,
      'Jogo encerrado sem cópia de recuperação; a captura precisa ser conferida.'::text as explicacao,
      null::text as status_preservado,
      jogo.status as status_atual,
      null::integer as gols_casa_preservado,
      null::integer as gols_fora_preservado,
      jogo.gols_casa as gols_casa_atual,
      jogo.gols_fora as gols_fora_atual,
      false as alteracao_registrada,
      0::integer as palpites_afetados,
      null::boolean as checkpoint_consistente,
      true as pode_conferir
    from public.jogos jogo
    where jogo.status = 'encerrado'
      and jogo.gols_casa is not null
      and jogo.gols_fora is not null
      and not exists (
        select 1
          from private.jogos_encerrados_snapshot snapshot
         where snapshot.id_jogo = jogo.id_jogo
      )
  )
  select * from ocorrencias_divergentes
  union all
  select * from jogos_sem_snapshot;
$$;

revoke all on function private.ocorrencias_protecao_recuperacao() from public;
revoke all on function private.ocorrencias_protecao_recuperacao() from anon;
revoke all on function private.ocorrencias_protecao_recuperacao() from authenticated;
revoke all on function private.ocorrencias_protecao_recuperacao() from service_role;

create or replace function public.obter_detalhes_protecao_recuperacao()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
      from public.participantes_autorizados participante
     where lower(participante.email) = v_email
       and participante.administrador is true
       and participante.ativo is true
       and participante.status = 'approved'
  ) then
    raise exception 'Acesso restrito a administradores ativos e aprovados.' using errcode = '42501';
  end if;

  with ocorrencias as (
    select
      ocorrencia.*,
      conferencia.conferido_em,
      conferencia.chave is not null as conferida
    from private.ocorrencias_protecao_recuperacao() ocorrencia
    left join private.conferencias_recuperacao conferencia on conferencia.chave = ocorrencia.chave
  )
  select jsonb_build_object(
    'ultima_captura', (select max(capturado_em) from private.jogos_encerrados_snapshot),
    'ultima_origem', (select captura_origem from private.jogos_encerrados_snapshot order by capturado_em desc, id_jogo desc limit 1),
    'ultima_rodada', (select rodada from private.jogos_encerrados_snapshot order by capturado_em desc, id_jogo desc limit 1),
    'jogos_preservados', (select count(*) from private.jogos_encerrados_snapshot),
    'palpites_preservados', (select count(*) from private.palpites_encerrados_snapshot),
    'alteracoes_registradas', (select count(*) from private.historico_resultados),
    'checkpoint_tipo', (select tipo from private.checkpoints_competitivos order by criado_em desc, id desc limit 1),
    'checkpoint_rodada', (select rodada from private.checkpoints_competitivos order by criado_em desc, id desc limit 1),
    'checkpoint_criado_em', (select criado_em from private.checkpoints_competitivos order by criado_em desc, id desc limit 1),
    'pendencias', (select count(*) from ocorrencias where severidade in ('atencao', 'critica') and not conferida),
    'informativas', (select count(*) from ocorrencias where severidade = 'informativa'),
    'conferidas', (select count(*) from ocorrencias where conferida),
    'ocorrencias', coalesce((
      select jsonb_agg(to_jsonb(ocorrencia) order by
        case ocorrencia.severidade when 'critica' then 1 when 'atencao' then 2 else 3 end,
        ocorrencia.rodada desc,
        ocorrencia.id_jogo
      )
      from ocorrencias ocorrencia
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.obter_detalhes_protecao_recuperacao() from public;
revoke all on function public.obter_detalhes_protecao_recuperacao() from anon;
revoke all on function public.obter_detalhes_protecao_recuperacao() from authenticated;
revoke all on function public.obter_detalhes_protecao_recuperacao() from service_role;
grant execute on function public.obter_detalhes_protecao_recuperacao() to authenticated;

create or replace function public.marcar_divergencia_recuperacao_conferida(p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_ocorrencia record;
begin
  if auth.uid() is null or not exists (
    select 1
      from public.participantes_autorizados participante
     where lower(participante.email) = v_email
       and participante.administrador is true
       and participante.ativo is true
       and participante.status = 'approved'
  ) then
    raise exception 'Acesso restrito a administradores ativos e aprovados.' using errcode = '42501';
  end if;

  select * into v_ocorrencia
    from private.ocorrencias_protecao_recuperacao() ocorrencia
   where ocorrencia.chave = p_chave
     and ocorrencia.pode_conferir
   limit 1;

  if not found then
    raise exception 'Ocorrência pendente não encontrada.' using errcode = '22023';
  end if;

  insert into private.conferencias_recuperacao (
    chave,
    id_jogo,
    tipo,
    conferido_por,
    conferido_em
  ) values (
    v_ocorrencia.chave,
    v_ocorrencia.id_jogo,
    v_ocorrencia.tipo,
    auth.uid(),
    now()
  )
  on conflict (chave) do nothing;

  return jsonb_build_object('chave', v_ocorrencia.chave, 'conferida', true);
end;
$$;

revoke all on function public.marcar_divergencia_recuperacao_conferida(text) from public;
revoke all on function public.marcar_divergencia_recuperacao_conferida(text) from anon;
revoke all on function public.marcar_divergencia_recuperacao_conferida(text) from authenticated;
revoke all on function public.marcar_divergencia_recuperacao_conferida(text) from service_role;
grant execute on function public.marcar_divergencia_recuperacao_conferida(text) to authenticated;

comment on table private.conferencias_recuperacao is
  'Registro auditável de conferências administrativas; não altera dados competitivos.';
comment on function public.obter_detalhes_protecao_recuperacao() is
  'Detalhes mínimos e sem dados pessoais das ocorrências de recuperação, restritos a administradores.';
comment on function public.marcar_divergencia_recuperacao_conferida(text) is
  'Registra somente a conferência administrativa de uma ocorrência ainda existente.';

commit;

-- Rollback:
-- revoke all on function public.marcar_divergencia_recuperacao_conferida(text) from authenticated;
-- revoke all on function public.obter_detalhes_protecao_recuperacao() from authenticated;
-- drop function if exists public.marcar_divergencia_recuperacao_conferida(text);
-- drop function if exists public.obter_detalhes_protecao_recuperacao();
-- drop function if exists private.ocorrencias_protecao_recuperacao();
-- drop table if exists private.conferencias_recuperacao;
