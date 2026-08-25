-- Idempotência aditiva para os ciclos agendados da sombra 5B.3B.
-- Não ativa coleta, não altera tabelas competitivas e não amplia permissões.

alter table public.transicao_api_execucoes
  add column chave_idempotencia text,
  add constraint transicao_api_execucoes_chave_idempotencia_formato
    check (
      chave_idempotencia is null
      or chave_idempotencia ~ '^[A-Za-z0-9:_-]{10,160}$'
    );

create unique index transicao_api_execucoes_chave_idempotencia_uidx
  on public.transicao_api_execucoes (chave_idempotencia)
  where chave_idempotencia is not null;

comment on column public.transicao_api_execucoes.chave_idempotencia is
  'Chave opcional e única que impede a repetição de um ciclo de coleta em sombra.';
