-- Fundação append-only para eventos auxiliares observados na transição da API esportiva.
-- Não altera jogos, resultados, palpites, pontuação nem a fonte oficial.
-- O payload integral do fornecedor não é persistido nesta fase.

create table public.transicao_api_eventos_lotes (
  id bigint generated always as identity primary key,
  execucao_id bigint not null
    references public.transicao_api_execucoes (id) on delete cascade,
  fornecedor text not null
    check (fornecedor in ('football-data.org', 'api-football')),
  id_jogo bigint not null
    references public.jogos (id_jogo) on delete restrict,
  id_externo bigint not null check (id_externo > 0),
  observado_em timestamptz not null,
  lista_disponivel boolean not null,
  quantidade_eventos integer not null check (quantidade_eventos >= 0),
  hash_lista text check (hash_lista is null or hash_lista ~ '^[0-9a-f]{64}$'),
  avisos text[] not null default '{}',
  valido boolean not null,
  erro_normalizacao text,
  constraint transicao_api_eventos_lotes_lista_coerente check (
    (lista_disponivel and hash_lista is not null)
    or (not lista_disponivel and quantidade_eventos = 0 and hash_lista is null)
  ),
  constraint transicao_api_eventos_lotes_execucao_fornecedor_jogo_uid
    unique (execucao_id, fornecedor, id_jogo),
  constraint transicao_api_eventos_lotes_identidade_uid
    unique (id, execucao_id, fornecedor, id_jogo)
);

comment on table public.transicao_api_eventos_lotes is
  'Observações auditáveis de listas de eventos; lista ausente difere de lista disponível e vazia.';

create table public.transicao_api_eventos (
  id bigint generated always as identity primary key,
  lote_id bigint not null,
  execucao_id bigint not null,
  fornecedor text not null,
  id_jogo bigint not null,
  id_externo bigint not null check (id_externo > 0),
  chave_fornecedor text not null check (length(chave_fornecedor) between 1 and 500),
  chave_logica text not null check (length(chave_logica) between 1 and 500),
  hash_conteudo text not null check (hash_conteudo ~ '^[0-9a-f]{64}$'),
  minuto smallint check (minuto is null or minuto between 0 and 130),
  acrescimos smallint check (acrescimos is null or acrescimos between 0 and 30),
  time_id_externo bigint check (time_id_externo is null or time_id_externo > 0),
  time_nome text,
  jogador_id_externo bigint check (jogador_id_externo is null or jogador_id_externo > 0),
  jogador_nome text,
  relacionado_id_externo bigint check (relacionado_id_externo is null or relacionado_id_externo > 0),
  relacionado_nome text,
  tipo_original text not null,
  detalhe_original text,
  comentario text,
  categoria_normalizada text not null
    check (categoria_normalizada in ('gol', 'cartao', 'substituicao', 'var', 'desconhecido')),
  observado_em timestamptz not null,
  constraint transicao_api_eventos_lote_identidade_fk
    foreign key (lote_id, execucao_id, fornecedor, id_jogo)
    references public.transicao_api_eventos_lotes (id, execucao_id, fornecedor, id_jogo)
    on delete cascade,
  constraint transicao_api_eventos_lote_chave_uid
    unique (lote_id, chave_fornecedor)
);

comment on table public.transicao_api_eventos is
  'Eventos auxiliares normalizados e append-only; nunca são autoridade para placar ou estado competitivo.';

create index transicao_api_eventos_lotes_jogo_observado_idx
  on public.transicao_api_eventos_lotes (id_jogo, observado_em desc);
create index transicao_api_eventos_fixture_logica_idx
  on public.transicao_api_eventos (fornecedor, id_externo, chave_logica);
create index transicao_api_eventos_jogo_observado_idx
  on public.transicao_api_eventos (id_jogo, observado_em desc);
create index transicao_api_eventos_categoria_idx
  on public.transicao_api_eventos (categoria_normalizada);

alter table public.transicao_api_eventos_lotes enable row level security;
alter table public.transicao_api_eventos enable row level security;

revoke all on table public.transicao_api_eventos_lotes from public, anon, authenticated, service_role;
revoke all on table public.transicao_api_eventos from public, anon, authenticated, service_role;
revoke all on sequence public.transicao_api_eventos_lotes_id_seq from public, anon, authenticated, service_role;
revoke all on sequence public.transicao_api_eventos_id_seq from public, anon, authenticated, service_role;

grant select, insert on table public.transicao_api_eventos_lotes to service_role;
grant select, insert on table public.transicao_api_eventos to service_role;
grant usage, select on sequence public.transicao_api_eventos_lotes_id_seq to service_role;
grant usage, select on sequence public.transicao_api_eventos_id_seq to service_role;

create function public.registrar_lote_eventos_sombra(
  p_lote jsonb,
  p_eventos jsonb default '[]'::jsonb
) returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_lote_id bigint;
  v_quantidade integer;
begin
  if jsonb_typeof(p_lote) <> 'object' or jsonb_typeof(p_eventos) <> 'array' then
    raise exception 'evento_payload_invalido';
  end if;

  v_quantidade := jsonb_array_length(p_eventos);
  if coalesce((p_lote ->> 'quantidade_eventos')::integer, -1) <> v_quantidade then
    raise exception 'evento_quantidade_inconsistente';
  end if;

  insert into public.transicao_api_eventos_lotes (
    execucao_id, fornecedor, id_jogo, id_externo, observado_em,
    lista_disponivel, quantidade_eventos, hash_lista, avisos, valido, erro_normalizacao
  ) values (
    (p_lote ->> 'execucao_id')::bigint,
    p_lote ->> 'fornecedor',
    (p_lote ->> 'id_jogo')::bigint,
    (p_lote ->> 'id_externo')::bigint,
    (p_lote ->> 'observado_em')::timestamptz,
    (p_lote ->> 'lista_disponivel')::boolean,
    v_quantidade,
    nullif(p_lote ->> 'hash_lista', ''),
    coalesce(array(select jsonb_array_elements_text(p_lote -> 'avisos')), '{}'),
    (p_lote ->> 'valido')::boolean,
    nullif(p_lote ->> 'erro_normalizacao', '')
  ) returning id into v_lote_id;

  insert into public.transicao_api_eventos (
    lote_id, execucao_id, fornecedor, id_jogo, id_externo,
    chave_fornecedor, chave_logica, hash_conteudo, minuto, acrescimos,
    time_id_externo, time_nome, jogador_id_externo, jogador_nome,
    relacionado_id_externo, relacionado_nome, tipo_original, detalhe_original,
    comentario, categoria_normalizada, observado_em
  )
  select
    v_lote_id,
    (p_lote ->> 'execucao_id')::bigint,
    p_lote ->> 'fornecedor',
    (p_lote ->> 'id_jogo')::bigint,
    (p_lote ->> 'id_externo')::bigint,
    evento ->> 'chave_fornecedor',
    evento ->> 'chave_logica',
    evento ->> 'hash_conteudo',
    (evento ->> 'minuto')::smallint,
    (evento ->> 'acrescimos')::smallint,
    (evento ->> 'time_id_externo')::bigint,
    nullif(evento ->> 'time_nome', ''),
    (evento ->> 'jogador_id_externo')::bigint,
    nullif(evento ->> 'jogador_nome', ''),
    (evento ->> 'relacionado_id_externo')::bigint,
    nullif(evento ->> 'relacionado_nome', ''),
    evento ->> 'tipo_original',
    nullif(evento ->> 'detalhe_original', ''),
    nullif(evento ->> 'comentario', ''),
    evento ->> 'categoria_normalizada',
    (p_lote ->> 'observado_em')::timestamptz
  from jsonb_array_elements(p_eventos) as evento;

  return v_lote_id;
end;
$$;

comment on function public.registrar_lote_eventos_sombra(jsonb, jsonb) is
  'Grava atomicamente um lote e seus eventos auxiliares; restrita ao service_role.';

revoke all on function public.registrar_lote_eventos_sombra(jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.registrar_lote_eventos_sombra(jsonb, jsonb)
  to service_role;

-- Rollback antes de qualquer coleta:
-- drop function public.registrar_lote_eventos_sombra(jsonb, jsonb);
-- drop table public.transicao_api_eventos;
-- drop table public.transicao_api_eventos_lotes;
-- Depois de existir evidência, desabilitar o produtor e preservar o histórico.
