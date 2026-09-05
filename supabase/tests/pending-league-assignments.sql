-- L09 — Ensaio transacional de aprovação, identidade, idempotência e preservação.
begin;
create temporary table l09_contexto on commit drop as
select l.id liga_id,l.criado_por gestor_id,gen_random_uuid() autorizado_id,gen_random_uuid() participante_id,
  'l09-'||replace(gen_random_uuid()::text,'-','')||'@example.test' email
from public.ligas l join public.temporadas t on t.id=l.temporada_id
where l.tipo='standard' and l.status='ativa' and t.codigo='brasileirao-2026';

create temporary table l09_hashes on commit drop as
select (select count(*) from public.palpites) palpites,
  (select md5(coalesce(string_agg(concat_ws('|',id,id_jogo,user_id,gols_casa,gols_fora),'§' order by id),'')) from public.palpites) palpites_hash,
  (select count(*) from public.jogos) jogos;

grant select on l09_contexto,l09_hashes to authenticated;

insert into public.participantes_autorizados(id,nome,email,ativo,administrador,status,solicitado_em)
select autorizado_id,'Participante L09',email,false,false,'pending',now() from l09_contexto;

select set_config('request.jwt.claims',(select json_build_object('sub',gestor_id,'email',(select email from public.participantes where user_id=gestor_id),'role','authenticated')::text from l09_contexto),true);
set local role authenticated;
do $$ begin
  perform * from public.aprovar_participante_com_ligas((select autorizado_id from l09_contexto),array[(select liga_id from l09_contexto)],false);
  if not exists(select 1 from public.listar_designacoes_participantes() where participante_autorizado_id=(select autorizado_id from l09_contexto) and estado='pendente') then raise exception 'L09: designação não registrada.'; end if;
end $$;
reset role;

-- Outro participante não pode assumir a designação.
select set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'email','intruso@example.test','role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin perform * from public.processar_minhas_designacoes_liga();raise exception 'L09: identidade estranha processou designações.';
  exception when no_data_found or insufficient_privilege then null;end;
end $$;
reset role;

insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select participante_id,'authenticated','authenticated',email,now(),'{}'::jsonb,'{}'::jsonb,now(),now() from l09_contexto;
select set_config('request.jwt.claims',(select json_build_object('sub',participante_id,'email',email,'role','authenticated')::text from l09_contexto),true);
set local role authenticated;
do $$ declare v_result record; begin
  select * into v_result from public.processar_minhas_designacoes_liga();
  if v_result.aplicadas<>1 then raise exception 'L09: associação não aplicada.'; end if;
  select * into v_result from public.processar_minhas_designacoes_liga();
  if v_result.aplicadas<>0 or v_result.reativadas<>0 then raise exception 'L09: processamento não idempotente.'; end if;
end $$;
reset role;

do $$ begin
  if (select count(*) from public.liga_membros lm join l09_contexto c on lm.liga_id=c.liga_id and lm.user_id=c.participante_id)<>1 then raise exception 'L09: associação duplicada.'; end if;
  if (select count(*) from private.liga_membros_auditoria a join l09_contexto c on a.liga_id=c.liga_id and a.user_id=c.participante_id and a.acao='adicionado')<>1 then raise exception 'L09: auditoria duplicada ou ausente.'; end if;
  if (select palpites from l09_hashes)<>(select count(*) from public.palpites) or (select palpites_hash from l09_hashes)<>(select md5(coalesce(string_agg(concat_ws('|',id,id_jogo,user_id,gols_casa,gols_fora),'§' order by id),'')) from public.palpites) then raise exception 'L09: palpites alterados.'; end if;
  if (select jogos from l09_hashes)<>(select count(*) from public.jogos) then raise exception 'L09: jogos alterados.'; end if;
end $$;
rollback;
select 'L09_OK: aprovação, identidade, idempotência e preservação verificadas.' resultado;
