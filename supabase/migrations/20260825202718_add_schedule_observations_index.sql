create index jogos_agendamento_observacoes_id_jogo_idx
  on public.jogos_agendamento_observacoes (id_jogo);

comment on index public.jogos_agendamento_observacoes_id_jogo_idx is
  'Acelera consultas e manutenção da chave estrangeira das evidências por jogo.';
