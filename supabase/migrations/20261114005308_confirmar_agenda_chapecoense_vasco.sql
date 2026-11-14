-- Confirma somente os metadados de agenda da partida 554942.
-- CBF: IMT 310BSA/26, de 29/10/2026. Rodada 21, jogo 210.
begin;

select pg_advisory_xact_lock(hashtext('bolao_2026_confirmar_agenda_r21'));

do $confirmacao$
declare
  jogo_antes public.jogos%rowtype;
  jogo_depois public.jogos%rowtype;
  inicio_oficial constant timestamptz := '2026-11-14 23:30:00+00';
  campos_agenda constant text[] := array[
    'situacao_agendamento', 'fonte_agendamento', 'agendamento_confirmado_em'
  ];
begin
  select * into strict jogo_antes
  from public.jogos
  where id_jogo = 554942
  for update;

  if jogo_antes.rodada is distinct from 21
     or jogo_antes.api_football_id is distinct from 1492312
     or jogo_antes.inicio is distinct from inicio_oficial
     or jogo_antes.status is distinct from 'agendado'
     or jogo_antes.situacao_agendamento is distinct from 'provisorio'
     or jogo_antes.fonte_agendamento is distinct from 'api-football'
     or jogo_antes.agendamento_confirmado_em is not null
     or jogo_antes.gols_casa is not null
     or jogo_antes.gols_fora is not null
     or now() >= inicio_oficial then
    raise exception 'r21_chapecoense_vasco_estado_divergente';
  end if;

  insert into public.jogos_agendamento_observacoes (
    id_jogo, fonte, inicio_observado, status_observado,
    situacao_agendamento, evidencia_url, hash_evidencia, detalhes
  ) values (
    554942, 'cbf', inicio_oficial, 'agendado', 'confirmado',
    'https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/serie-a/2026/chapecoense-x-vasco-da-gama-saf/832099?view=alteracoes',
    encode(sha256(convert_to('554942|cbf|2026-11-14T23:30:00Z|confirmado', 'UTF8')), 'hex'),
    '{"rodada":21,"jogo_cbf":210,"comunicado":"IMT 310BSA/26","horario_brasilia":"2026-11-14 20:30"}'::jsonb
  );

  update public.jogos
  set situacao_agendamento = 'confirmado',
      fonte_agendamento = 'cbf',
      agendamento_confirmado_em = now()
  where id_jogo = jogo_antes.id_jogo
  returning * into strict jogo_depois;

  if jogo_depois.situacao_agendamento is distinct from 'confirmado'
     or jogo_depois.fonte_agendamento is distinct from 'cbf'
     or jogo_depois.agendamento_confirmado_em is null
     or (to_jsonb(jogo_antes) - campos_agenda)
        is distinct from (to_jsonb(jogo_depois) - campos_agenda) then
    raise exception 'r21_chapecoense_vasco_pos_condicao_divergente';
  end if;
end
$confirmacao$;

commit;
