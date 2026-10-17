// Somente cluster temporário local desta tarefa. Não aceita URL ou host remoto.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
const modulePath=process.argv[2];
if(!modulePath||/^(?:https?|postgres(?:ql)?):/i.test(modulePath))throw new Error("Informe o módulo pg local.");
const {default:pg}=await import(pathToFileURL(modulePath));
const config={host:"127.0.0.1",port:55439,user:"postgres",database:"postgres"};
const admin=new pg.Client(config);await admin.connect();
const database=`league_deletion_test_${Date.now()}`;
let created=false;const clients=[];
try{
  const directory=(await admin.query("show data_directory")).rows[0].data_directory.replaceAll("\\","/");
  assert.equal(directory,"C:/Users/user/Documents/Codex/exclusao-controlada-ligas/postgres-data");
  await admin.query(`create database ${database}`);created=true;
  const connect=async()=>{const client=new pg.Client({...config,database});await client.connect();await client.query("set statement_timeout='10s'");clients.push(client);return client;};
  const setup=await connect(),a=await connect(),b=await connect();
  const root=new URL("../",import.meta.url);
  const test=await readFile(new URL("scripts/test-league-deletion-sql.mjs",root),"utf8");
  const central=await readFile(new URL("supabase/migrations/20260904194756_centralize_league_administration.sql",root),"utf8");
  const migration=await readFile(new URL("supabase/migrations/20261017125914_add_controlled_league_deletion.sql",root),"utf8");
  const ids={manager:"00000000-0000-0000-0000-000000000001",member:"00000000-0000-0000-0000-000000000002",standard:"10000000-0000-0000-0000-000000000001",target:"10000000-0000-0000-0000-000000000002",other:"10000000-0000-0000-0000-000000000003",active:"10000000-0000-0000-0000-000000000004"};
  let bootstrap=test.match(/await db\.exec\(`(\s*create role anon;[\s\S]*?)`\);/)?.[1];assert.ok(bootstrap);
  bootstrap=bootstrap.replaceAll(/create role (anon|authenticated|service_role);/g,(_,role)=>`do $$begin if not exists(select 1 from pg_roles where rolname='${role}') then create role ${role};end if;end$$;`);
  for(const [key,value] of Object.entries(ids))bootstrap=bootstrap.replaceAll(`\u0024{${key}}`,value);
  await setup.query(bootstrap);
  await setup.query(central.match(/create or replace function private\.usuario_gestor_central_ligas\(\)[\s\S]*?\$\$;/)[0]);
  await setup.query(migration);
  await setup.query("create trigger impedir_mutacao_ligas_auditoria before update or delete on private.ligas_auditoria for each row execute function private.impedir_mutacao_auditoria_liga(); create trigger impedir_mutacao_liga_membros_auditoria before update or delete on private.liga_membros_auditoria for each row execute function private.impedir_mutacao_auditoria_liga()");
  for(const client of [a,b]){await client.query("select set_config('request.jwt.claim.sub',$1,false)",[ids.manager]);await client.query("set role authenticated");}
  const preview=async id=>(await b.query("select public.preparar_exclusao_liga($1) as preview",[id])).rows[0].preview;
  const remove=(id,revision)=>b.query("select public.excluir_liga($1,'Nome igual',$2)",[id,revision]).then(value=>({value}),error=>({error}));
  const waitLock=async()=>{
    for(let i=0;i<100;i++){
      await setup.query("select pg_stat_clear_snapshot()");
      const row=(await setup.query("select wait_event_type from pg_stat_activity where pid=$1",[b.processID])).rows[0];
      if(row?.wait_event_type==="Lock")return;
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    throw new Error("A segunda sessão não aguardou o bloqueio esperado.");
  };
  // Duas exclusões da mesma liga: apenas a primeira pode concluir.
  let current=await preview(ids.target);
  await a.query("begin");await a.query("select public.excluir_liga($1,'Nome igual',$2)",[ids.target,current.revisao]);
  let pending=remove(ids.target,current.revisao);await waitLock();await a.query("commit");
  assert.match((await pending).error?.message||"",/Liga não encontrada/);
  assert.equal((await setup.query("select count(*)::int as n from public.ligas where id=$1",[ids.target])).rows[0].n,0);
  // Reativação concorrente invalida uma confirmação anterior.
  current=await preview(ids.other);
  await setup.query("begin");await setup.query("update public.ligas set status='ativa' where id=$1",[ids.other]);
  pending=remove(ids.other,current.revisao);await waitLock();await setup.query("commit");
  assert.match((await pending).error?.message||"",/Somente ligas privadas arquivadas/);
  // Entrada pendente concorrente: a FK bloqueia a exclusão até a nova leitura.
  await setup.query("update public.ligas set status='arquivada' where id=$1",[ids.other]);
  current=await preview(ids.other);
  await setup.query("begin");await setup.query("insert into private.participante_liga_designacoes(liga_id,estado) values($1,'pendente')",[ids.other]);
  pending=remove(ids.other,current.revisao);await waitLock();await setup.query("commit");
  assert.match((await pending).error?.message||"",/designações pendentes/);
  for(const table of ["public.liga_membros","private.ligas_auditoria","private.liga_membros_auditoria"]){assert.equal((await setup.query(`select count(*)::int as n from ${table} where liga_id=$1`,[ids.other])).rows[0].n,1);}
  assert.equal((await setup.query("select count(*)::int as n from private.liga_exclusao_contexto")).rows[0].n,0);
  assert.equal((await setup.query("select sum(pontos)::int as n from public.palpites")).rows[0].n,10);
  console.log("Concorrência PostgreSQL nativa: exclusão dupla, reativação e nova pendência serializadas; outra liga e palpites preservados.");
}finally{
  await Promise.allSettled(clients.map(async client=>{try{await client.query("rollback");}finally{await client.end();}}));
  if(created)await admin.query(`drop database ${database}`);
  await admin.end();
}
