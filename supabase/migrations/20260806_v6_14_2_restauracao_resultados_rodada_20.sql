begin;

create temporary table resultados_rodada_20_confirmados (
  id_jogo bigint primary key,
  gols_casa integer not null,
  gols_fora integer not null
) on commit drop;

insert into resultados_rodada_20_confirmados (id_jogo, gols_casa, gols_fora) values
  (554930, 2, 0),
  (554938, 2, 2),
  (554939, 1, 1),
  (554931, 1, 1),
  (554933, 0, 1),
  (554932, 0, 0),
  (554934, 1, 1),
  (554935, 1, 1);

do $$
declare
  divergencias integer;
begin
  select count(*)
    into divergencias
    from resultados_rodada_20_confirmados esperado
    left join public.jogos atual using (id_jogo)
   where atual.id_jogo is null
      or atual.rodada <> 20
      or not (
        (atual.status = 'agendado' and atual.gols_casa is null and atual.gols_fora is null)
        or
        (atual.status = 'encerrado' and atual.gols_casa = esperado.gols_casa and atual.gols_fora = esperado.gols_fora)
      );

  if divergencias > 0 then
    raise exception 'Restauração interrompida: % jogo(s) não atendem às precondições', divergencias;
  end if;
end
$$;

update public.jogos atual
   set status = 'encerrado',
       gols_casa = esperado.gols_casa,
       gols_fora = esperado.gols_fora,
       atualizado_em = now()
  from resultados_rodada_20_confirmados esperado
 where atual.id_jogo = esperado.id_jogo
   and (
     atual.status <> 'encerrado'
     or atual.gols_casa is distinct from esperado.gols_casa
     or atual.gols_fora is distinct from esperado.gols_fora
   );

do $$
declare
  divergencias integer;
begin
  select count(*)
    into divergencias
    from resultados_rodada_20_confirmados esperado
    join public.jogos atual using (id_jogo)
   where atual.status <> 'encerrado'
      or atual.gols_casa is distinct from esperado.gols_casa
      or atual.gols_fora is distinct from esperado.gols_fora;

  if divergencias > 0 then
    raise exception 'Restauração não confirmada para % jogo(s)', divergencias;
  end if;
end
$$;

commit;
