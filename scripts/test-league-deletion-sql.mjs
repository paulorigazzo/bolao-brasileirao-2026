// Integração destrutiva SOMENTE no PostgreSQL embarcado em memória.
// Requer caminho explícito para uma instalação local já disponível do PGlite.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
const modulePath=process.argv[2];
if(!modulePath)throw new Error("Informe o arquivo de módulo local do PGlite. Este teste nunca aceita uma URL de banco.");
if(/^(?:https?|postgres(?:ql)?):/i.test(modulePath))throw new Error("Somente módulo local; conexão remota proibida.");
const {PGlite}=await import(pathToFileURL(modulePath));
const db=new PGlite();
const root=new URL("../",import.meta.url);
const central=await readFile(new URL("supabase/migrations/20260904194756_centralize_league_administration.sql",root),"utf8");
const migration=await readFile(new URL("supabase/migrations/20261017125914_add_controlled_league_deletion.sql",root),"utf8");
const rollback=await readFile(new URL("supabase/rollback/rollback_add_controlled_league_deletion.sql",root),"utf8");
const guard=central.match(/create or replace function private\.usuario_gestor_central_ligas\(\)[\s\S]*?\$\$;/)?.[0];
assert.ok(guard);
const manager="00000000-0000-0000-0000-000000000001",member="00000000-0000-0000-0000-000000000002";
const standard="10000000-0000-0000-0000-000000000001",target="10000000-0000-0000-0000-000000000002",other="10000000-0000-0000-0000-000000000003",active="10000000-0000-0000-0000-000000000004";
const q=(sql,args=[])=>db.query(sql,args);
const scalar=async(sql,args)=>Object.values((await q(sql,args)).rows[0])[0];
const identity=async(role,id)=>{await db.exec("reset role");await q("select set_config('request.jwt.claim.sub',$1,false)",[id||""]);await db.exec(`set role ${role}`);};
let passed=0;
async function rejects(sql,args,pattern){await assert.rejects(()=>q(sql,args),pattern);passed++;}
try{
  // Contratos mínimos das tabelas existentes, com FKs reais; nenhum dado do projeto.
  await db.exec(`
    create role anon;create role authenticated;create role service_role;
    create schema auth;create schema private;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;
    create table public.temporadas(id uuid primary key,codigo text,status text);
    create table public.participantes(user_id uuid primary key,email text,ativo boolean);
    create table public.participantes_autorizados(id uuid primary key,email text,ativo boolean,status text,administrador boolean);
    create table public.ligas(id uuid primary key,temporada_id uuid references public.temporadas on delete restrict,nome text,tipo text,status text,criado_por uuid,atualizado_em timestamptz default now());
    create table public.liga_membros(liga_id uuid references public.ligas on delete cascade,user_id uuid references public.participantes on delete cascade,status text default 'ativo',primary key(liga_id,user_id));
    create table private.ligas_auditoria(id bigint generated always as identity primary key,liga_id uuid references public.ligas on delete restrict,acao text);
    create table private.liga_membros_auditoria(id bigint generated always as identity primary key,liga_id uuid references public.ligas on delete restrict,user_id uuid,acao text);
    create table private.participante_liga_designacoes(id bigint generated always as identity primary key,liga_id uuid references public.ligas on delete restrict,estado text);
    create table public.jogos(id integer primary key);
    create table public.palpites(user_id uuid references public.participantes,jogo_id integer references public.jogos,pontos integer);
    insert into public.temporadas values('20000000-0000-0000-0000-000000000001','brasileirao-2026','ativa');
    insert into public.participantes values('${manager}','manager@example.invalid',true),('${member}','member@example.invalid',true);
    insert into public.participantes_autorizados values('${manager}','manager@example.invalid',true,'approved',true),('${member}','member@example.invalid',true,'approved',false);
    insert into public.ligas(id,temporada_id,nome,tipo,status,criado_por) values
      ('${standard}','20000000-0000-0000-0000-000000000001','Standard','standard','ativa','${manager}'),
      ('${target}','20000000-0000-0000-0000-000000000001','Nome igual','privada','arquivada','${manager}'),
      ('${other}','20000000-0000-0000-0000-000000000001','Nome igual','privada','arquivada','${manager}'),
      ('${active}','20000000-0000-0000-0000-000000000001','Ativa','privada','ativa','${manager}');
    insert into public.liga_membros(liga_id,user_id) values('${target}','${member}'),('${other}','${member}');
    insert into private.ligas_auditoria(liga_id,acao) values('${target}','criada'),('${other}','criada');
    insert into private.liga_membros_auditoria(liga_id,user_id,acao) values('${target}','${member}','adicionado'),('${other}','${member}','adicionado');
    insert into private.participante_liga_designacoes(liga_id,estado) values('${target}','aplicada'),('${other}','cancelada');
    insert into public.jogos values(1);insert into public.palpites values('${member}',1,10);
  `);
  await db.exec(guard);
  await db.exec(migration);
  await db.exec(`create trigger impedir_mutacao_ligas_auditoria before update or delete on private.ligas_auditoria for each row execute function private.impedir_mutacao_auditoria_liga();
    create trigger impedir_mutacao_liga_membros_auditoria before update or delete on private.liga_membros_auditoria for each row execute function private.impedir_mutacao_auditoria_liga();`);
  await identity("anon",null);
  await rejects("select public.preparar_exclusao_liga($1)",[target],/permission denied/);
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual","x"],/permission denied/);
  await identity("authenticated",null);
  await rejects("select public.preparar_exclusao_liga($1)",[target],/Acesso restrito/);
  await identity("authenticated",member);
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual","x"],/Acesso restrito/);
  await db.exec("reset role");await q("update public.participantes set ativo=false where user_id=$1",[manager]);
  await identity("authenticated",manager);
  await rejects("select public.preparar_exclusao_liga($1)",[target],/Acesso restrito/);
  await db.exec("reset role");await q("update public.participantes set ativo=true where user_id=$1",[manager]);
  await identity("authenticated",manager);
  await rejects("select public.preparar_exclusao_liga($1)",[standard],/Somente ligas privadas arquivadas/);
  await rejects("select public.preparar_exclusao_liga($1)",[active],/Somente ligas privadas arquivadas/);
  await rejects("insert into private.liga_exclusao_contexto values(txid_current(),pg_backend_pid(),$1,$2)",[target,manager],/permission denied/);
  const preview=await scalar("select public.preparar_exclusao_liga($1)",[target]);
  assert.equal(preview.membros,1);assert.equal(preview.historico_liga,1);assert.equal(preview.historico_membros,1);assert.equal(preview.designacoes_resolvidas,1);passed++;
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"nome igual",preview.revisao],/Digite exatamente/);
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual",null],/A liga foi alterada/);
  await db.exec("reset role");
  await rejects("delete from private.ligas_auditoria where liga_id=$1",[target],/imutável/);
  await rejects("update private.liga_membros_auditoria set acao='inativado' where liga_id=$1",[target],/imutável/);
  await q("select set_config('app.excluir_liga',$1,false)",[target]);
  await rejects("delete from private.liga_membros_auditoria where liga_id=$1",[target],/imutável/);
  await q("insert into private.participante_liga_designacoes(liga_id,estado) values($1,'pendente')",[target]);
  await identity("authenticated",manager);
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual",preview.revisao],/designações pendentes/);
  await db.exec("reset role");await q("update private.participante_liga_designacoes set estado='cancelada' where liga_id=$1 and estado='pendente'",[target]);
  await identity("authenticated",manager);
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual",preview.revisao],/A liga foi alterada/);
  const current=await scalar("select public.preparar_exclusao_liga($1)",[target]);
  // Uma FK inesperada força falha após remover auditorias; a transação deve restaurar tudo.
  await db.exec("reset role;create table private.bloqueio_teste(liga_id uuid references public.ligas on delete restrict)");await q("insert into private.bloqueio_teste values($1)",[target]);
  await identity("authenticated",manager);
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual",current.revisao],/foreign key constraint/);
  await db.exec("reset role");
  assert.equal(await scalar("select count(*)::int from private.ligas_auditoria where liga_id=$1",[target]),1);
  assert.equal(await scalar("select count(*)::int from private.liga_membros_auditoria where liga_id=$1",[target]),1);
  assert.equal(await scalar("select count(*)::int from public.liga_membros where liga_id=$1",[target]),1);
  assert.equal(await scalar("select count(*)::int from public.ligas where id=$1",[target]),1);
  assert.equal(await scalar("select count(*)::int from private.participante_liga_designacoes where liga_id=$1",[target]),2);
  assert.equal(await scalar("select count(*)::int from private.liga_exclusao_contexto"),0);passed++;
  await db.exec("drop table private.bloqueio_teste");
  await identity("authenticated",manager);
  assert.equal(await scalar("select public.excluir_liga($1,$2,$3)",[target,"Nome igual",current.revisao]),target);passed++;
  await rejects("select public.excluir_liga($1,$2,$3)",[target,"Nome igual",current.revisao],/Liga não encontrada/);
  await db.exec("reset role");
  for(const table of ["public.liga_membros","private.ligas_auditoria","private.liga_membros_auditoria","private.participante_liga_designacoes"]){
    assert.equal(await scalar(`select count(*)::int from ${table} where liga_id=$1`,[target]),0);
    assert.equal(await scalar(`select count(*)::int from ${table} where liga_id=$1`,[other]),1);
  }
  assert.equal(await scalar("select count(*)::int from public.ligas"),3);
  assert.equal(await scalar("select count(*)::int from public.participantes"),2);
  assert.equal(await scalar("select count(*)::int from public.participantes_autorizados"),2);
  assert.equal(await scalar("select count(*)::int from public.jogos"),1);
  assert.equal(await scalar("select sum(pontos)::int from public.palpites"),10);
  assert.equal(await scalar("select count(*)::int from private.liga_exclusao_contexto"),0);
  assert.equal(await scalar("select count(*)::int from pg_trigger where tgname in ('impedir_mutacao_ligas_auditoria','impedir_mutacao_liga_membros_auditoria') and tgenabled='O'"),2);passed++;
  await rejects("delete from private.ligas_auditoria where liga_id=$1",[other],/imutável/);
  await db.exec(rollback);
  assert.equal(await scalar("select to_regprocedure('public.excluir_liga(uuid,text,text)')"),null);
  await rejects("delete from private.ligas_auditoria where liga_id=$1",[other],/imutável/);
  console.log(`Exclusão SQL: ${passed} verificações aprovadas em PostgreSQL isolado; nenhuma conexão externa.`);
}finally{await db.close();}
