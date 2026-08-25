-- Metadados opcionais observados na sombra 5B.3B.2A.
-- Não ativa coleta, não altera public.jogos e não amplia permissões.

select pg_advisory_xact_lock(hashtext('bolao:api-football-shadow-metadata-5b3b2a'));

alter table public.transicao_api_jogos
  add column local_nome text,
  add column local_cidade text,
  add column time_casa_logo text,
  add column time_fora_logo text,
  add column time_casa_codigo text,
  add column time_fora_codigo text;

comment on column public.transicao_api_jogos.local_nome is
  'Nome opcional do local observado pelo fornecedor; não altera o local canônico.';
comment on column public.transicao_api_jogos.local_cidade is
  'Cidade opcional observada pelo fornecedor; ausência não invalida a fotografia.';
comment on column public.transicao_api_jogos.time_casa_logo is
  'URL opcional do escudo do mandante observada pelo fornecedor.';
comment on column public.transicao_api_jogos.time_fora_logo is
  'URL opcional do escudo do visitante observada pelo fornecedor.';
comment on column public.transicao_api_jogos.time_casa_codigo is
  'Código opcional do mandante observado pelo fornecedor; não é sigla canônica.';
comment on column public.transicao_api_jogos.time_fora_codigo is
  'Código opcional do visitante observado pelo fornecedor; não é sigla canônica.';
