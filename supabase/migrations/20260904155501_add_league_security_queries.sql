-- L03 — Segurança e consultas contextualizadas por liga.
-- Mantém palpites únicos por participante/jogo e não ativa a nova leitura no app.

begin;

create schema if not exists private;

create index if not exists liga_membros_ativos_usuario_liga_idx
on public.liga_membros (user_id, liga_id)
where status = 'ativo';

create or replace function private.usuario_membro_ativo(p_liga_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.liga_membros lm
      join public.ligas l on l.id = lm.liga_id and l.status = 'ativa'
      join public.temporadas t on t.id = l.temporada_id and t.status = 'ativa'
      where lm.liga_id = p_liga_id
        and lm.user_id = (select auth.uid())
        and lm.status = 'ativo'
    );
$$;

create or replace function private.usuarios_compartilham_liga(p_outro_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.liga_membros eu
      join public.liga_membros outro
        on outro.liga_id = eu.liga_id
       and outro.user_id = p_outro_user_id
       and outro.status = 'ativo'
      join public.ligas l on l.id = eu.liga_id and l.status = 'ativa'
      join public.temporadas t on t.id = l.temporada_id and t.status = 'ativa'
      where eu.user_id = (select auth.uid())
        and eu.status = 'ativo'
    );
$$;

revoke all on function private.usuario_membro_ativo(uuid) from public, anon;
revoke all on function private.usuarios_compartilham_liga(uuid) from public, anon;
grant execute on function private.usuario_membro_ativo(uuid) to authenticated;
grant execute on function private.usuarios_compartilham_liga(uuid) to authenticated;

grant select on table public.temporadas, public.ligas, public.liga_membros to authenticated;

drop policy if exists "membros consultam temporadas de suas ligas" on public.temporadas;
create policy "membros consultam temporadas de suas ligas"
on public.temporadas for select to authenticated
using (
  exists (
    select 1 from public.ligas l
    where l.temporada_id = temporadas.id
      and (select private.usuario_membro_ativo(l.id))
  )
);

drop policy if exists "membros consultam suas ligas" on public.ligas;
create policy "membros consultam suas ligas"
on public.ligas for select to authenticated
using ((select private.usuario_membro_ativo(id)));

drop policy if exists "membros consultam membros da mesma liga" on public.liga_membros;
create policy "membros consultam membros da mesma liga"
on public.liga_membros for select to authenticated
using ((select private.usuario_membro_ativo(liga_id)));

-- Remove políticas permissivas redundantes que anulavam prazo ou isolamento.
drop policy if exists "Participantes consultam palpites encerrados" on public.palpites;
drop policy if exists "palpites próprios leitura" on public.palpites;
drop policy if exists "participantes leem palpites apos fechamento" on public.palpites;
drop policy if exists "usuario le seus palpites" on public.palpites;
drop policy if exists "palpites próprios inserção" on public.palpites;
drop policy if exists "palpites próprios atualização" on public.palpites;

create policy "usuario le seu palpite compartilhado"
on public.palpites for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    (select private.usuarios_compartilham_liga(user_id))
    and exists (
      select 1 from public.jogos j
      where j.id_jogo = palpites.id_jogo
        and lower(coalesce(j.status, '')) ~ '(encerr|finaliz|awarded|finished)'
        and lower(coalesce(j.status, '')) !~ '(cancel|anulad)'
        and j.gols_casa is not null
        and j.gols_fora is not null
    )
  )
);

drop policy if exists "participante vê próprio cadastro" on public.participantes;
drop policy if exists "participantes podem ler participantes" on public.participantes;
create policy "participante consulta perfil proprio ou compartilhado"
on public.participantes for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.usuarios_compartilham_liga(user_id))
);

drop policy if exists "autorizados leitura autenticados" on public.participantes_autorizados;
drop policy if exists "participante consulta a propria autorizacao" on public.participantes_autorizados;
drop policy if exists "v650_usuario_consulta_proprio_cadastro" on public.participantes_autorizados;
create policy "participante consulta propria autorizacao ou admin global"
on public.participantes_autorizados for select to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  or (select public.eh_administrador_atual())
);

revoke execute on function public.eh_administrador_atual() from public, anon;
grant execute on function public.eh_administrador_atual() to authenticated;

create or replace function public.contagem_palpites_visivel()
returns table (usuario text, quantidade integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;
  return query
  select p.nome, count(pa.id)::integer
  from public.participantes p
  left join public.palpites pa on pa.user_id = p.user_id
  where p.ativo is true
    and private.usuarios_compartilham_liga(p.user_id)
  group by p.user_id, p.nome
  order by p.nome;
end;
$$;

create or replace function public.progresso_palpites_adm_visivel()
returns table (user_id uuid, usuario text, id_jogo bigint, atualizado_em timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.eh_administrador_atual() then
    raise exception 'Administrador global obrigatório.' using errcode = '42501';
  end if;
  return query
  select p.user_id, p.usuario, p.id_jogo, coalesce(p.atualizado_em,p.criado_em,now())
  from public.palpites p;
end;
$$;

create or replace view public.contagem_palpites_participantes
with (security_invoker = true)
as select * from public.contagem_palpites_visivel();

create or replace view public.progresso_palpites_adm
with (security_invoker = true)
as select * from public.progresso_palpites_adm_visivel();

revoke all on function public.contagem_palpites_visivel() from public, anon;
revoke all on function public.progresso_palpites_adm_visivel() from public, anon;
grant execute on function public.contagem_palpites_visivel() to authenticated;
grant execute on function public.progresso_palpites_adm_visivel() to authenticated;
revoke all on public.contagem_palpites_participantes, public.progresso_palpites_adm from anon;
grant select on public.contagem_palpites_participantes, public.progresso_palpites_adm to authenticated;

create or replace function public.listar_minhas_ligas()
returns table (
  liga_id uuid,
  liga_codigo text,
  liga_nome text,
  liga_tipo text,
  papel text,
  temporada_id uuid,
  temporada_codigo text,
  temporada_nome text,
  temporada_ano integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.id, l.codigo, l.nome, l.tipo, lm.papel,
    t.id, t.codigo, t.nome, t.ano
  from public.liga_membros lm
  join public.ligas l on l.id = lm.liga_id
  join public.temporadas t on t.id = l.temporada_id
  where lm.user_id = (select auth.uid())
    and lm.status = 'ativo'
    and l.status = 'ativa'
    and t.status = 'ativa'
  order by (l.tipo = 'standard') desc, l.nome;
$$;

create or replace function public.listar_membros_liga(p_liga_id uuid)
returns table (
  user_id uuid,
  nome text,
  time_favorito text,
  papel text,
  entrou_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;
  return query
  select p.user_id, p.nome, p.time_favorito, lm.papel, lm.entrou_em
  from public.liga_membros lm
  join public.participantes p on p.user_id = lm.user_id and p.ativo is true
  where lm.liga_id = p_liga_id and lm.status = 'ativo'
  order by p.nome;
end;
$$;

create or replace function public.obter_palpites_encerrados_liga(p_liga_id uuid)
returns table (id_jogo bigint, user_id uuid, usuario text, gols_casa integer, gols_fora integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;
  return query
  select p.id_jogo, p.user_id, p.usuario, p.gols_casa, p.gols_fora
  from public.palpites p
  join public.jogos j on j.id_jogo = p.id_jogo
  join public.liga_membros lm on lm.user_id = p.user_id
    and lm.liga_id = p_liga_id and lm.status = 'ativo'
  join public.ligas l on l.id = lm.liga_id
  join public.temporadas t on t.id = l.temporada_id
  where j.temporada = t.ano
    and lower(coalesce(j.status, '')) ~ '(encerr|finaliz|awarded|finished)'
    and lower(coalesce(j.status, '')) !~ '(cancel|anulad)'
    and j.gols_casa is not null and j.gols_fora is not null;
end;
$$;

create or replace function public.obter_contagem_palpites_liga(p_liga_id uuid)
returns table (user_id uuid, usuario text, quantidade integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;
  return query
  select lm.user_id, p.nome, count(j.id_jogo)::integer
  from public.liga_membros lm
  join public.participantes p on p.user_id = lm.user_id and p.ativo is true
  join public.ligas l on l.id = lm.liga_id
  join public.temporadas t on t.id = l.temporada_id
  left join public.palpites pa on pa.user_id = lm.user_id
  left join public.jogos j on j.id_jogo = pa.id_jogo and j.temporada = t.ano
  where lm.liga_id = p_liga_id and lm.status = 'ativo'
  group by lm.user_id, p.nome
  order by p.nome;
end;
$$;

create or replace function public.obter_ranking_liga(p_liga_id uuid)
returns table (
  posicao bigint, user_id uuid, nome text, pontos integer,
  exatos integer, palpites integer, avaliados integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;
  return query
  with totais as (
    select lm.user_id, participante.nome,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora))
        filter (where lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded|finished)'
          and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
          and j.gols_casa is not null and j.gols_fora is not null), 0)::integer as pontos,
      count(*) filter (where lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded|finished)'
        and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
        and p.gols_casa = j.gols_casa and p.gols_fora = j.gols_fora)::integer as exatos,
      count(j.id_jogo)::integer as palpites,
      count(*) filter (where lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded|finished)'
        and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
        and j.gols_casa is not null and j.gols_fora is not null)::integer as avaliados
    from public.liga_membros lm
    join public.participantes participante on participante.user_id = lm.user_id and participante.ativo is true
    join public.ligas l on l.id = lm.liga_id
    join public.temporadas t on t.id = l.temporada_id
    left join public.palpites p on p.user_id = lm.user_id
    left join public.jogos j on j.id_jogo = p.id_jogo and j.temporada = t.ano
    where lm.liga_id = p_liga_id and lm.status = 'ativo'
    group by lm.user_id, participante.nome
  )
  select row_number() over(order by t.pontos desc,t.exatos desc,t.nome),
    t.user_id,t.nome,t.pontos,t.exatos,t.palpites,t.avaliados
  from totais t
  order by t.pontos desc,t.exatos desc,t.nome;
end;
$$;

create or replace function public.obter_ranking_provisorio_liga(p_liga_id uuid, p_rodada integer)
returns table (
  posicao bigint, user_id uuid, nome text,
  pontos_oficiais integer, exatos_oficiais integer,
  pontos_provisorios integer, exatos_provisorios integer,
  total_projetado integer, exatos_projetados integer,
  rodada integer, jogos_encerrados integer, jogos_ao_vivo integer,
  jogos_suspensos integer, jogos_adiados integer, jogos_futuros integer,
  jogos_cancelados integer, atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.usuario_membro_ativo(p_liga_id) then
    raise exception 'Associação ativa à liga obrigatória.' using errcode = '42501';
  end if;
  if p_rodada is null or p_rodada < 1 or p_rodada > 38 then
    raise exception 'Rodada inválida.' using errcode = '22023';
  end if;
  return query
  with contexto as (
    select t.ano from public.ligas l join public.temporadas t on t.id=l.temporada_id
    where l.id=p_liga_id
  ), membros as (
    select lm.user_id,p.nome from public.liga_membros lm
    join public.participantes p on p.user_id=lm.user_id and p.ativo is true
    where lm.liga_id=p_liga_id and lm.status='ativo'
  ), jogos_classificados as (
    select j.*,
      case
        when lower(coalesce(j.status,'')) ~ '(cancel|anulad)' then 'cancelled'
        when lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded|finished)' then 'finished'
        when lower(coalesce(j.status,'')) ~ '(suspend|suspens)' then 'suspended'
        when lower(coalesce(j.status,'')) ~ '(adiad|postpon)' then 'postponed'
        when lower(coalesce(j.status,'')) ~ '(vivo|andamento|intervalo|1-tempo|2-tempo|in[_-]play|half[_-]time|paused)' then 'live'
        else 'future' end as estado
    from public.jogos j, contexto c where j.temporada=c.ano
  ), totais as (
    select m.user_id,m.nome,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora))
        filter(where j.estado='finished' and j.gols_casa is not null and j.gols_fora is not null),0)::integer as oficiais,
      count(*) filter(where j.estado='finished' and p.gols_casa=j.gols_casa and p.gols_fora=j.gols_fora)::integer as exatos_oficiais,
      coalesce(sum(public.calcular_pontos(p.gols_casa,p.gols_fora,j.gols_casa,j.gols_fora))
        filter(where j.rodada=p_rodada and j.estado in ('live','suspended') and j.gols_casa is not null and j.gols_fora is not null),0)::integer as provisorios,
      count(*) filter(where j.rodada=p_rodada and j.estado in ('live','suspended') and p.gols_casa=j.gols_casa and p.gols_fora=j.gols_fora)::integer as exatos_provisorios
    from membros m left join public.palpites p on p.user_id=m.user_id
    left join jogos_classificados j on j.id_jogo=p.id_jogo
    group by m.user_id,m.nome
  ), resumo as (
    select count(*) filter(where estado='finished')::integer encerrados,
      count(*) filter(where estado='live')::integer ao_vivo,
      count(*) filter(where estado='suspended')::integer suspensos,
      count(*) filter(where estado='postponed')::integer adiados,
      count(*) filter(where estado='future')::integer futuros,
      count(*) filter(where estado='cancelled')::integer cancelados,
      max(coalesce(sincronizado_em,atualizado_em)) atualizado
    from jogos_classificados where rodada=p_rodada
  ), resultado as (
    select t.*, (t.oficiais+t.provisorios)::integer total,
      (t.exatos_oficiais+t.exatos_provisorios)::integer exatos
    from totais t
  )
  select row_number() over(order by r.total desc,r.exatos desc,r.nome),
    r.user_id,r.nome,r.oficiais,r.exatos_oficiais,r.provisorios,r.exatos_provisorios,
    r.total,r.exatos,p_rodada,s.encerrados,s.ao_vivo,s.suspensos,s.adiados,
    s.futuros,s.cancelados,s.atualizado
  from resultado r cross join resumo s
  order by r.total desc,r.exatos desc,r.nome;
end;
$$;

revoke all on function public.listar_minhas_ligas() from public, anon;
revoke all on function public.listar_membros_liga(uuid) from public, anon;
revoke all on function public.obter_palpites_encerrados_liga(uuid) from public, anon;
revoke all on function public.obter_contagem_palpites_liga(uuid) from public, anon;
revoke all on function public.obter_ranking_liga(uuid) from public, anon;
revoke all on function public.obter_ranking_provisorio_liga(uuid,integer) from public, anon;

grant execute on function public.listar_minhas_ligas() to authenticated;
grant execute on function public.listar_membros_liga(uuid) to authenticated;
grant execute on function public.obter_palpites_encerrados_liga(uuid) to authenticated;
grant execute on function public.obter_contagem_palpites_liga(uuid) to authenticated;
grant execute on function public.obter_ranking_liga(uuid) to authenticated;
grant execute on function public.obter_ranking_provisorio_liga(uuid,integer) to authenticated;

commit;
