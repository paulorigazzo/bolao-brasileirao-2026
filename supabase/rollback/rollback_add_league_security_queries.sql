-- Rollback da L03. Restaura o acesso legado e mantém a fundação L02.
begin;

create or replace view public.contagem_palpites_participantes
with (security_invoker = false)
as select p.usuario, count(*)::integer as quantidade
from public.palpites p group by p.usuario;

create or replace view public.progresso_palpites_adm
with (security_invoker = false)
as select p.user_id,p.usuario,p.id_jogo,
  coalesce(p.atualizado_em,p.criado_em,now()) as atualizado_em
from public.palpites p;

drop function if exists public.progresso_palpites_adm_visivel();
drop function if exists public.contagem_palpites_visivel();

drop function if exists public.obter_ranking_provisorio_liga(uuid,integer);
drop function if exists public.obter_ranking_liga(uuid);
drop function if exists public.obter_contagem_palpites_liga(uuid);
drop function if exists public.obter_palpites_encerrados_liga(uuid);
drop function if exists public.listar_membros_liga(uuid);
drop function if exists public.listar_minhas_ligas();

drop policy if exists "membros consultam temporadas de suas ligas" on public.temporadas;
drop policy if exists "membros consultam suas ligas" on public.ligas;
drop policy if exists "membros consultam membros da mesma liga" on public.liga_membros;
revoke select on table public.temporadas, public.ligas, public.liga_membros from authenticated;

drop policy if exists "usuario le seu palpite compartilhado" on public.palpites;
create policy "palpites próprios leitura" on public.palpites for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.jogos j
  where j.id_jogo=palpites.id_jogo and now() >= j.inicio - interval '30 minutes'
));
create policy "participantes leem palpites apos fechamento" on public.palpites for select to authenticated
using (public.email_autorizado() and exists (
  select 1 from public.jogos j
  where j.id_jogo=palpites.id_jogo and now() >= j.inicio - interval '30 minutes'
));
create policy "usuario le seus palpites" on public.palpites for select to authenticated
using (public.email_autorizado() and user_id=auth.uid());
create policy "Participantes consultam palpites encerrados" on public.palpites for select to authenticated
using (exists (
  select 1 from public.jogos j where j.id_jogo=palpites.id_jogo
    and lower(coalesce(j.status,'')) ~ '(encerr|finaliz|awarded)'
    and lower(coalesce(j.status,'')) !~ '(cancel|anulad)'
    and j.gols_casa is not null and j.gols_fora is not null
));
create policy "palpites próprios inserção" on public.palpites for insert to authenticated
with check (user_id=auth.uid());
create policy "palpites próprios atualização" on public.palpites for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "participante consulta perfil proprio ou compartilhado" on public.participantes;
create policy "participante vê próprio cadastro" on public.participantes for select to authenticated
using (user_id=auth.uid());
create policy "participantes podem ler participantes" on public.participantes for select to authenticated
using ((select public.email_autorizado()));

drop policy if exists "participante consulta propria autorizacao ou admin global" on public.participantes_autorizados;
create policy "autorizados leitura autenticados" on public.participantes_autorizados for select to authenticated using (true);
create policy "participante consulta a propria autorizacao" on public.participantes_autorizados for select to authenticated
using (lower(email)=lower(coalesce(auth.jwt()->>'email','')) or public.usuario_atual_e_admin());
create policy "v650_usuario_consulta_proprio_cadastro" on public.participantes_autorizados for select to authenticated
using (lower(email)=lower(coalesce(auth.jwt()->>'email','')) or public.eh_administrador_atual());

grant execute on function public.eh_administrador_atual() to public, anon;

drop function if exists private.usuarios_compartilham_liga(uuid);
drop function if exists private.usuario_membro_ativo(uuid);
drop index if exists public.liga_membros_ativos_usuario_liga_idx;

commit;
