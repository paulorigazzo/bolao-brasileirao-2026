-- Rollback da 5B.3B.2A, seguro somente antes da coleta de evidência real.
-- Depois da coleta, desative a campanha e preserve/exporte a auditoria antes
-- de considerar a remoção destes campos.

begin;

select pg_advisory_xact_lock(hashtext('bolao:api-football-shadow-metadata-5b3b2a'));

alter table public.transicao_api_jogos
  drop column local_nome,
  drop column local_cidade,
  drop column time_casa_logo,
  drop column time_fora_logo,
  drop column time_casa_codigo,
  drop column time_fora_codigo;

commit;
