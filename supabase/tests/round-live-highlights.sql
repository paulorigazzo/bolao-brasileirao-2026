-- Synthetic fixtures only. Run through scripts/test-round-live-highlights-sql.mjs.
-- Deliberately refuses execution outside the isolated test harness.
begin;
do $$ begin
  if current_setting('round_highlights.test_database',true) is distinct from 'isolated' then
    raise exception 'Teste permitido somente no banco isolado.';
  end if;
end $$;
insert into public.temporadas values ('00000000-0000-0000-0000-000000000001',2026,'ativa');
insert into public.ligas values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','ativa'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','ativa');
insert into public.participantes values
 ('00000000-0000-0000-0000-000000000011','Ana',true),
 ('00000000-0000-0000-0000-000000000012','Bia',true),
 ('00000000-0000-0000-0000-000000000013','Zero',true),
 ('00000000-0000-0000-0000-000000000014','Outra liga',true);
insert into public.liga_membros select '00000000-0000-0000-0000-000000000001',user_id,'ativo'
from public.participantes where nome<>'Outra liga';
insert into public.liga_membros values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000014','ativo');
-- >1000 historical picks cannot contaminate the round totals.
insert into public.jogos select id,1,2026,'encerrado',1,0,now(),now() from generate_series(1,1100) id;
insert into public.palpites select id_jogo,'00000000-0000-0000-0000-000000000011',1,0 from public.jogos;
insert into public.jogos values
 (2001,27,2026,'encerrado',1,0,now(),now()),
 (2002,27,2026,'ao vivo',2,1,now(),now()),
 (2003,27,2026,'agendado',0,0,now(),now()),
 (2004,27,2026,'cancelado',2,1,now(),now()),
 (2005,27,2026,'adiado',2,1,now(),now()),
 (2006,27,2026,'ao vivo',null,null,now(),now());
insert into public.palpites select id_jogo,'00000000-0000-0000-0000-000000000011',2,1 from public.jogos where rodada=27;
insert into public.palpites select id_jogo,'00000000-0000-0000-0000-000000000012',1,0 from public.jogos where rodada=27;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$ declare result jsonb; a jsonb; begin
  result:=public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
  if jsonb_array_length(result->'ranking')<>3 then raise exception 'Isolamento ou zero ponto incorreto'; end if;
  select value into a from jsonb_array_elements(result->'ranking') where value->>'nome'='Ana';
  if (a->>'confirmed')::int<>5 or (a->>'provisional')::int<>10 or (a->>'total')::int<>15 then raise exception 'Pontuação por rodada incorreta: %',a; end if;
  if a ? 'gols_casa' or a ? 'gols_fora' or a ? 'id_jogo' then raise exception 'Resposta expõe palpite'; end if;
  if result->'ranking'->0->>'nome'<>'Ana' then raise exception 'Desempate por nome incorreto'; end if;
  begin
    perform public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000002',27);
    raise exception 'Outra liga permitida';
  exception when insufficient_privilege then null; end;
  begin
    perform public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',39);
    raise exception 'Rodada inválida permitida';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
-- Goal reversal changes leader; a suspended valid score remains provisional.
-- Equal totals are decided by exact scores before names.
update public.palpites set gols_casa=3,gols_fora=2 where id_jogo=2002 and user_id='00000000-0000-0000-0000-000000000011';
update public.palpites set gols_casa=0,gols_fora=1 where id_jogo=2002 and user_id='00000000-0000-0000-0000-000000000012';
do $$ declare result jsonb; begin
  result:=public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
  if result->'ranking'->0->>'nome'<>'Bia' or (result->'ranking'->0->>'total')::int<>10 then raise exception 'Desempate por exatos incorreto'; end if;
end $$;
update public.palpites set gols_casa=2,gols_fora=1 where id_jogo=2002 and user_id='00000000-0000-0000-0000-000000000011';
update public.palpites set gols_casa=1,gols_fora=0 where id_jogo=2002 and user_id='00000000-0000-0000-0000-000000000012';
update public.participantes set nome='Mesmo nome' where nome in ('Ana','Bia');
do $$ declare result jsonb; begin
  result:=public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
  if result->'ranking'->0->>'user_id'<>'00000000-0000-0000-0000-000000000011' then raise exception 'Identidade estável incorreta'; end if;
end $$;
update public.participantes set nome='Ana' where user_id='00000000-0000-0000-0000-000000000011';
update public.participantes set nome='Bia' where user_id='00000000-0000-0000-0000-000000000012';
update public.jogos set gols_casa=1,gols_fora=0,status='suspenso' where id_jogo=2002;
set local role authenticated;
do $$ declare result jsonb; begin
  result:=public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
  if result->'ranking'->0->>'nome'<>'Bia' then raise exception 'Gol anulado não alterou líder'; end if;
  if (result->'lifecycle'->>'suspendedWithScore')::int<>1 then raise exception 'Suspensão incorreta'; end if;
end $$;
reset role;
update public.jogos set status='encerrado' where id_jogo=2002;
update public.jogos set status='cancelado' where id_jogo in (2003,2005,2006);
set local role authenticated;
do $$ declare result jsonb; begin
  result:=public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
  if (result->'ranking'->0->>'total')::int<>20 or (result->'ranking'->0->>'provisional')::int<>0 then raise exception 'Dupla contagem no encerramento'; end if;
  if not (result->'lifecycle'->>'complete')::boolean then raise exception 'Conclusão incorreta'; end if;
  if exists(select 1 from jsonb_array_elements(result->'ranking') row where (row->>'officialPosition')::int<>(row->>'projectedPosition')::int) then raise exception 'Posição final diverge da oficial'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin
  begin
    perform public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
    raise exception 'Sem identidade permitido';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform public.obter_destaques_rodada_liga('00000000-0000-0000-0000-000000000001',27);
    raise exception 'Acesso anônimo permitido';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
