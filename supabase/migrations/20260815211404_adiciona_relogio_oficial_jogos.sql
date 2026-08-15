alter table public.jogos
  add column if not exists minuto smallint,
  add column if not exists acrescimos smallint;

alter table public.jogos
  add constraint jogos_minuto_oficial_check
    check (minuto is null or minuto between 0 and 130),
  add constraint jogos_acrescimos_oficiais_check
    check (acrescimos is null or acrescimos between 0 and 30);

comment on column public.jogos.minuto is
  'Minuto oficial informado pela fonte esportiva; nulo quando indisponível.';

comment on column public.jogos.acrescimos is
  'Acréscimos oficiais do período corrente informados pela fonte esportiva; nulo quando indisponível.';
