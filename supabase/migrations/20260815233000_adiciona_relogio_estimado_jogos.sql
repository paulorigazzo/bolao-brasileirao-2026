alter table public.jogos
  add column if not exists minuto_estimado smallint,
  add column if not exists periodo_estimado text,
  add column if not exists relogio_referencia_em timestamptz;

alter table public.jogos
  drop constraint if exists jogos_minuto_estimado_check,
  add constraint jogos_minuto_estimado_check
    check (minuto_estimado is null or minuto_estimado between 0 and 106),
  drop constraint if exists jogos_periodo_estimado_check,
  add constraint jogos_periodo_estimado_check
    check (periodo_estimado is null or periodo_estimado in ('primeiro_tempo', 'segundo_tempo'));

comment on column public.jogos.minuto_estimado is
  'Minuto-base estimado pelo app; 61 e 106 sinalizam que o limite de exibicao foi ultrapassado.';
comment on column public.jogos.periodo_estimado is
  'Periodo usado exclusivamente pelo relogio informativo estimado.';
comment on column public.jogos.relogio_referencia_em is
  'Instante UTC de referencia para evolucao do minuto estimado.';
