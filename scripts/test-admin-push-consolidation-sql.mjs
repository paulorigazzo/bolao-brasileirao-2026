// PostgreSQL isolado, sem transporte e sem dependência nova no aplicativo.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PUSH_SQL_TEST_MODULE||'.artifacts/push-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db=new PGlite();
try{
  await db.exec(`create schema private;
    create role anon; create role authenticated; create role service_role bypassrls;
    create table participantes(user_id uuid,nome text,email text,ativo boolean);
    create table participantes_autorizados(email text,ativo boolean,status text,administrador boolean);
    create table temporadas(id uuid,ano integer,status text);
    create table ligas(id uuid,temporada_id uuid,status text);
    create table liga_membros(liga_id uuid,user_id uuid,status text);
    create table jogos(id_jogo bigint primary key,temporada integer,rodada integer,inicio timestamptz,status text,gols_casa integer,gols_fora integer);
    create table palpites(user_id uuid,id_jogo bigint,gols_casa integer,gols_fora integer);
    create table push_subscriptions(id uuid primary key,user_id uuid,ativo boolean,endpoint text,p256dh text,auth text,autorizado_em timestamptz default now(),atualizado_em timestamptz default now());
    create function calcular_pontos(integer,integer,integer,integer) returns integer language sql immutable as $$select 0$$;
    grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;`);
  await db.exec(readFileSync('supabase/migrations/20261027172231_add_automatic_round_push.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261027232038_add_admin_push_consolidation.sql','utf8'));
  const rows=async sql=>(await db.query(sql)).rows;
  const scalar=async sql=>Object.values((await rows(sql))[0])[0];
  const worker='00000000-0000-0000-0000-000000000099',other='00000000-0000-0000-0000-000000000098';
  const alice='00000000-0000-0000-0000-000000000001',adm='00000000-0000-0000-0000-000000000002';
  await db.exec(`insert into participantes values('${alice}','Alice','alice@example.test',true),('${adm}','ADM','adm@example.test',true);
    insert into participantes_autorizados values('alice@example.test',true,'approved',false),('adm@example.test',true,'approved',true);
    insert into push_subscriptions(id,user_id,ativo,endpoint,p256dh,auth)
      select gen_random_uuid(),'${alice}',true,'https://push.example.test/'||n,'test','test' from generate_series(1,1207) n;
    insert into push_subscriptions(id,user_id,ativo,endpoint,p256dh,auth) values
      ('00000000-0000-0000-0000-000000000010','${adm}',true,'https://push.example.test/adm-1','test','test'),
      ('00000000-0000-0000-0000-000000000011','${adm}',true,'https://push.example.test/adm-2','test','test');
    -- Grupo antigo: não deve gerar aviso, mesmo se concluído após a ativação.
    insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,criado_em)
      select 2026,31,'summary',id,'sent',now()-interval '1 day' from push_subscriptions where user_id='${alice}' limit 1;
    set role service_role; select preparar_push_automaticos_com_adm(2026);`);
  assert.equal(await scalar("select count(*)::int from push_consolidados_adm where tipo='activation'"),1);
  await db.exec(`update push_automaticos set envio_tentado_em=now() where rodada=31;
    insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,envio_tentado_em)
      select 2026,33,'summary',id,'sent',now() from push_subscriptions where user_id='${alice}';
    update push_automaticos set estado='pending' where id=(select id from push_automaticos where rodada=33 limit 1);`);
  const reserve=async(w=worker)=>rows(`select * from reservar_consolidados_push_adm(2026,'${w}',100)`);
  assert.equal((await reserve()).length,0,'aguarda outros lotes, sem consolidar 1206/1207');
  await db.exec(`update push_automaticos set estado='failed' where rodada=33 and estado='pending';`);
  let jobs=await reserve();assert.equal(jobs.length,2,'um aviso por aparelho do ADM');
  assert.equal((await reserve(other)).length,0,'segundo worker não reserva o mesmo aparelho');
  assert.equal(await scalar("select count(*)::int from push_consolidados_adm where subscription_id is null and rodada=33"),1);
  assert.equal(await scalar("select count(*)::int from push_consolidados_adm where rodada=31"),0,'sem retroativo');
  const content=async(job,w=worker)=>scalar(`select obter_conteudo_consolidado_adm('${job.id}','${w}')`);
  let data=await content(jobs[0]);
  assert.equal(data.participants,1,'1207 aparelhos pertencem a um participante');
  assert.equal(data.accepted,1206);assert.equal(data.failed,1);assert.equal(data.attempted,1207);
  assert(data.ttl>0&&data.ttl<=3600);
  assert.equal(await content(jobs[0],other),null,'worker incorreto não obtém chaves');
  await db.exec(`update push_subscriptions set ativo=false where id=(select subscription_id from push_consolidados_adm where id='${jobs[0].id}');`);
  assert.equal(await content(jobs[0]),null,'preferência desativada após reserva impede envio');
  await db.exec(`update push_subscriptions set ativo=true;
    update participantes_autorizados set administrador=false where email='adm@example.test';`);
  assert.equal(await content(jobs[0]),null,'remoção da permissão ADM impede envio');
  await db.exec(`update participantes_autorizados set administrador=true,status='pending' where email='adm@example.test';`);
  assert.equal(await content(jobs[0]),null,'ADM não aprovado não recebe');
  await db.exec(`update participantes_autorizados set status='approved' where email='adm@example.test';`);
  assert.equal((await content(jobs[0])).accepted,1206);
  const complete=async(job,result,w=worker)=>scalar(`select concluir_consolidado_push_adm('${job.id}','${w}','${result}')`);
  assert.equal(await complete(jobs[0],'sent',other),false,'worker antigo não confirma');
  assert.equal(await complete(jobs[0],'sent'),true);
  assert.equal(await complete(jobs[1],'retry'),true);
  assert.equal((await reserve()).length,0,'retentativa respeita intervalo');
  await db.exec(`update push_consolidados_adm set proxima_tentativa=now() where estado='pending';`);
  let retry=await reserve();assert.equal(retry.length,1);
  assert.equal((await content(retry[0])).accepted,1206,'consolidado permanece estável');
  await complete(retry[0],'retry');
  await db.exec(`update push_consolidados_adm set proxima_tentativa=now() where estado='pending';`);
  retry=await reserve();await complete(retry[0],'retry');
  assert.equal((await reserve()).length,0,'terceira falha não gera outro aviso');
  // Aparelhos novos não recebem eventos já consolidados.
  await db.exec(`insert into push_subscriptions(id,user_id,ativo,endpoint,p256dh,auth) values(gen_random_uuid(),'${adm}',true,'https://push.example.test/new','test','test');`);
  assert.equal((await reserve()).length,0);
  assert.equal(await scalar("select count(*)::int from push_automaticos where rodada=33"),1207,'avisos ADM não geram eventos de participantes');
  // Só reservas/descartes, sem transporte, não geram consolidado.
  await db.exec(`insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,tentativas)
    select 2026,32,'summary',id,'skipped',1 from push_subscriptions where user_id='${alice}' limit 1;`);
  assert.equal((await reserve()).length,0,'sem tentativa real, sem aviso');
  // Lembrete: pode haver novos participantes até terminar a janela de 15 minutos.
  await db.exec(`insert into jogos values(1,2026,34,now()+interval '12 hours','agendado',null,null);
    insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,envio_tentado_em)
      select 2026,34,'12h',id,'sent',now() from push_subscriptions where user_id='${alice}' limit 1;`);
  assert.equal((await reserve()).length,0,'janela aberta impede consolidado prematuro');
  await db.exec(`update jogos set inicio=now()+interval '11 hours 40 minutes' where rodada=34;`);
  jobs=await reserve();assert.equal(jobs.length,3);
  await db.exec(`update push_consolidados_adm set criado_em=now()-interval '2 hours' where rodada=34 and subscription_id is null;`);
  assert.equal(await content(jobs[0]),null,'aviso antigo expira');
  await complete(jobs[0],'skipped');await complete(jobs[1],'expired');await complete(jobs[2],'sent');
  assert.equal(await scalar(`select ativo from push_subscriptions where id=(select subscription_id from push_consolidados_adm where id='${jobs[1].id}')`),false,'410 desativa aparelho');
  // Wrapper preserva o resultado original e só marca tentativa quando houve transporte.
  await db.exec(`insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,worker_id,reserva_ate,tentativas)
    select 2026,35,'summary',id,'processing','${worker}',now()+interval '2 minutes',1 from push_subscriptions where user_id='${alice}' limit 1;`);
  const participant=await scalar('select id from push_automaticos where rodada=35');
  assert.equal(await scalar(`select concluir_push_automatico_com_adm('${participant}','${other}','sent',true)`),false);
  assert.equal(await scalar(`select concluir_push_automatico_com_adm('${participant}','${worker}','retry',true)`),true);
  assert(await scalar(`select envio_tentado_em is not null from push_automaticos where id='${participant}'`));
  assert.equal(await scalar(`select estado from push_automaticos where id='${participant}'`),'pending');
  assert.equal((await reserve()).length,0,'retentativa de participante pendente impede consolidado');
  // Falha sem nenhum aceite e ausência de ADM disponível também fecham o evento uma vez.
  await db.exec(`update participantes_autorizados set administrador=false where email='adm@example.test';
    insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,envio_tentado_em)
      select 2026,36,'summary',id,'failed',now() from push_subscriptions where user_id='${alice}' limit 1;`);
  assert.equal((await reserve()).length,0);
  assert.equal(await scalar("select falhas from push_consolidados_adm where rodada=36 and subscription_id is null"),1);
  await db.exec(`update participantes_autorizados set administrador=true where email='adm@example.test';`);
  assert.equal((await reserve()).length,0,'ativar ADM depois não recebe evento já fechado');
  await db.exec(`insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,envio_tentado_em)
      select 2026,37,'summary',id,'failed',now() from push_subscriptions where user_id='${alice}' limit 1;`);
  const failedJobs=await reserve();assert(failedJobs.length>0);
  assert.equal((await content(failedJobs[0])).accepted,0);assert.equal((await content(failedJobs[0])).failed,1);
  // Reserva abandonada é recuperável; a terceira reserva expirada encerra o trabalho.
  await db.exec(`update push_consolidados_adm set reserva_ate=now()-interval '1 minute',proxima_tentativa=now() where id='${failedJobs[0].id}';`);
  const recovered=await reserve(other);assert.equal(recovered.length,1);
  assert.equal(await complete(recovered[0],'sent'),false,'worker original não conclui reserva recuperada');
  await db.exec(`update push_consolidados_adm set tentativas=3,reserva_ate=now()-interval '1 minute' where id='${recovered[0].id}';`);
  await reserve();assert.equal(await scalar(`select estado from push_consolidados_adm where id='${recovered[0].id}'`),'failed');
  await db.exec(`update push_consolidados_adm set criado_em=now()-interval '30 minutes' where tipo='activation';
    insert into jogos values(2,2026,38,now()+interval '1 hour','cancelado',null,null);
    insert into push_automaticos(temporada,rodada,tipo,subscription_id,estado,envio_tentado_em,criado_em)
      select 2026,38,'2h',id,'sent',now(),now()-interval '20 minutes' from push_subscriptions where user_id='${alice}' limit 1;`);
  assert((await reserve()).length>0,'cancelamento após tentativa não impede consolidado');
  for(const role of ['anon','authenticated']){
    await db.exec(`reset role; set role ${role};`);
    for(const sql of ['select * from push_consolidados_adm',`select reservar_consolidados_push_adm(2026,'${worker}',100)`,
      `select obter_conteudo_consolidado_adm('${jobs[0].id}','${worker}')`,
      `select concluir_push_automatico_com_adm('${participant}','${worker}','sent',true)`]){
      await assert.rejects(db.exec(sql),/permission denied/);
    }
  }
  console.log('Consolidados ADM SQL: 1207 aparelhos, lotes, exclusividade, baseline, opt-in, autorização, janela, expiração, retentativas e isolamento aprovados.');
}finally{await db.close();}
