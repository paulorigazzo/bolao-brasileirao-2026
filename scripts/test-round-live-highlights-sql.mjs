// Optional isolated PostgreSQL test runtime; never connects to a remote database.
// ROUND_HIGHLIGHTS_PGLITE_PATH must point to a separately installed PGlite module.
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";
const runtime=process.env.ROUND_HIGHLIGHTS_PGLITE_PATH;
if(!runtime) throw Error("Defina ROUND_HIGHLIGHTS_PGLITE_PATH para o runtime PostgreSQL isolado de teste.");
const {PGlite}=await import(pathToFileURL(runtime));
const db=new PGlite();
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
await db.exec(`
  create role authenticated; create role anon;
  create schema auth; create schema private;
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated,anon;
  create table public.temporadas(id uuid primary key,ano integer,status text);
  create table public.ligas(id uuid primary key,temporada_id uuid,status text);
  create table public.liga_membros(liga_id uuid,user_id uuid,status text);
  create table public.participantes(user_id uuid primary key,nome text,ativo boolean);
  create table public.jogos(id_jogo bigint primary key,rodada integer,temporada integer,status text,gols_casa integer,gols_fora integer,sincronizado_em timestamptz,atualizado_em timestamptz);
  create table public.palpites(id_jogo bigint,user_id uuid,gols_casa integer,gols_fora integer);
`);
// Load the repository's real official ranking and membership definitions.
const legacy=await read("supabase/migrations/20260904155501_add_league_security_queries.sql");
for(const name of ["private.usuario_membro_ativo","public.obter_ranking_liga"]){
  const start=legacy.indexOf(`create or replace function ${name}(`);
  const end=legacy.indexOf("$$;",legacy.indexOf("as $$",start))+3;
  await db.exec(legacy.slice(start,end).replaceAll("(encerr|finaliz|awarded|finished)","(encerr|finaliz|awarded)"));
}
const migrations=await readdir(new URL("../supabase/migrations/",import.meta.url));
// Snapshot obtained read-only via pg_get_functiondef(public.calcular_pontos).
// Keep it outside the versioned implementation: do not duplicate scoring rules.
const scoring=await readFile(process.env.ROUND_HIGHLIGHTS_SCORING_SQL||new URL("../.artifacts/round-highlights-canonical-scoring.sql",import.meta.url),"utf8");
assert.match(scoring,/FUNCTION public.calcular_pontos/i);
await db.exec(scoring);
const migration=migrations.find(file=>file.endsWith("_add_round_live_highlights.sql"));
await db.exec(await read(`supabase/migrations/${migration}`));
await db.exec("select set_config('round_highlights.test_database','isolated',false)");
await db.exec(await read("supabase/tests/round-live-highlights.sql"));
await db.close();
console.log("SQL isolado: pontuação canônica, mais de mil palpites, estados, correções, zero ponto, desempates e acesso negado aprovados.");
