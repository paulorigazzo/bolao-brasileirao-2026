-- Confirma apenas dois horários da R21 já recebidos como provisórios.
-- Fonte: https://credencial.cbf.com.br/competicoes/listar/42/1
-- A aplicação remota exige autorização específica e reconciliação do histórico.
begin;

select pg_advisory_xact_lock(hashtext('bolao_2026_confirmar_agenda_r21'));

create temporary table r21_agenda_antes on commit drop as
select id_jogo, encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex') as hash_total,
  encode(sha256(convert_to(
  (to_jsonb(j) - array['situacao_agendamento','fonte_agendamento','agendamento_confirmado_em']::text[])::text,
  'UTF8')), 'hex') as hash_protegido
from public.jogos j
where id_jogo in (554940,554948,554942);

do $preflight$
begin
  if (select count(*) from r21_agenda_antes) <> 3 then
    raise exception 'r21_agenda_ids_esperados_ausentes';
  end if;
  if (select count(*) from public.jogos where
      ((id_jogo=554948 and rodada=21 and api_football_id=1492318
        and inicio=timestamptz '2026-10-02 23:00:00+00')
      or (id_jogo=554940 and rodada=21 and api_football_id=1492310
        and inicio=timestamptz '2026-10-03 21:30:00+00'))
    and status='agendado' and situacao_agendamento='provisorio'
      and fonte_agendamento='api-football' and agendamento_confirmado_em is null
      and gols_casa is null and gols_fora is null) <> 2 then
    raise exception 'r21_agenda_estado_provisorio_divergente';
  end if;
  if not exists (select 1 from public.jogos where id_jogo=554942
      and rodada=21 and situacao_agendamento='adiado_sem_data') then
    raise exception 'r21_agenda_chapecoense_precondicao_divergente';
  end if;
end
$preflight$;

insert into public.jogos_agendamento_observacoes
  (id_jogo,fonte,inicio_observado,status_observado,situacao_agendamento,
   evidencia_url,hash_evidencia,detalhes)
values
  (554948,'cbf',timestamptz '2026-10-02 23:00:00+00','agendado','confirmado',
   'https://credencial.cbf.com.br/competicoes/listar/42/1',
   encode(sha256(convert_to('554948|cbf|2026-10-02T23:00:00Z|confirmado','UTF8')),'hex'),
   '{"rodada":21,"horario_brasilia":"2026-10-02 20:00","jogo":"Sao Paulo x Santos"}'::jsonb),
  (554940,'cbf',timestamptz '2026-10-03 21:30:00+00','agendado','confirmado',
   'https://credencial.cbf.com.br/competicoes/listar/42/1',
   encode(sha256(convert_to('554940|cbf|2026-10-03T21:30:00Z|confirmado','UTF8')),'hex'),
   '{"rodada":21,"horario_brasilia":"2026-10-03 18:30","jogo":"Atletico Mineiro x Red Bull Bragantino"}'::jsonb);

update public.jogos
set situacao_agendamento='confirmado',
    fonte_agendamento='cbf',
    agendamento_confirmado_em=now()
where id_jogo in (554940,554948);

do $postflight$
begin
  if (select count(*) from public.jogos where id_jogo in (554940,554948)
      and situacao_agendamento='confirmado' and fonte_agendamento='cbf'
      and agendamento_confirmado_em is not null) <> 2 then
    raise exception 'r21_agenda_confirmacao_incompleta';
  end if;
  if exists (select 1 from public.jogos j join r21_agenda_antes a using(id_jogo)
      where encode(sha256(convert_to(
        (to_jsonb(j) - array['situacao_agendamento','fonte_agendamento','agendamento_confirmado_em']::text[])::text,
        'UTF8')),'hex') <> a.hash_protegido) then
    raise exception 'r21_agenda_campo_protegido_alterado';
  end if;
  if exists (select 1 from public.jogos j join r21_agenda_antes a using(id_jogo)
      where j.id_jogo=554942
        and encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex') <> a.hash_total) then
    raise exception 'r21_agenda_chapecoense_alterada';
  end if;
  if (select count(*) from public.jogos_agendamento_observacoes
      where id_jogo in (554940,554948) and fonte='cbf'
        and situacao_agendamento='confirmado'
        and inicio_observado in (timestamptz '2026-10-02 23:00:00+00',timestamptz '2026-10-03 21:30:00+00')) < 2 then
    raise exception 'r21_agenda_evidencia_ausente';
  end if;
end
$postflight$;

commit;
