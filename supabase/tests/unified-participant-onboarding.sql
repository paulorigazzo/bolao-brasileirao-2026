-- L10 — Ensaio transacional da jornada manual, primeiro acesso e inclusão idempotente.
begin;
create temporary table l10_contexto on commit drop as select l.id liga_id,l.criado_por gestor_id,gen_random_uuid() participante_id,'l10-'||replace(gen_random_uuid()::text,'-','')||'@example.test' email from public.ligas l join public.temporadas t on t.id=l.temporada_id where l.tipo='standard' and l.status='ativa' and t.codigo='brasileirao-2026' limit 1;
create temporary table l10_hashes on commit drop as select (select count(*) from public.palpites) palpites,(select count(*) from public.jogos) jogos;
grant select on l10_contexto,l10_hashes to authenticated;
select set_config('request.jwt.claims',(select json_build_object('sub',gestor_id,'email',(select email from public.participantes where user_id=gestor_id),'role','authenticated')::text from l10_contexto),true);
set local role authenticated;
do $$ declare v record;begin
  select * into v from public.salvar_participante_autorizado_com_ligas('Participante L10',(select email from l10_contexto),array[(select liga_id from l10_contexto)],false);
  if v.designacoes_pendentes<>1 then raise exception 'L10: cadastro manual não criou designação.';end if;
  if not exists(select 1 from public.listar_situacao_participantes_ligas() where participante_autorizado_id=v.participante_autorizado_id and not perfil_consolidado) then raise exception 'L10: situação anterior ao acesso inválida.';end if;
end $$;
reset role;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) select participante_id,'authenticated','authenticated',email,now(),'{}'::jsonb,'{}'::jsonb,now(),now() from l10_contexto;
select set_config('request.jwt.claims',(select json_build_object('sub',participante_id,'email',email,'role','authenticated')::text from l10_contexto),true);
set local role authenticated;
do $$ declare v record;begin select * into v from public.processar_minhas_designacoes_liga();if v.aplicadas<>1 then raise exception 'L10: liga não aplicada no primeiro acesso.';end if;end $$;
reset role;
select set_config('request.jwt.claims',(select json_build_object('sub',gestor_id,'email',(select email from public.participantes where user_id=gestor_id),'role','authenticated')::text from l10_contexto),true);
set local role authenticated;
do $$ declare v record;v_id uuid;begin select id into v_id from public.participantes_autorizados where email=(select email from l10_contexto);select * into v from public.adicionar_ligas_participante_autorizado(v_id,array[(select liga_id from l10_contexto)]);if v.ja_ativas<>1 then raise exception 'L10: inclusão rápida não foi idempotente.';end if;end $$;
reset role;
do $$ begin if (select palpites from l10_hashes)<>(select count(*) from public.palpites) or (select jogos from l10_hashes)<>(select count(*) from public.jogos) then raise exception 'L10: dados competitivos alterados.';end if;end $$;
rollback;
select 'L10_OK: cadastro manual, primeiro acesso, idempotência e preservação verificados.' resultado;
