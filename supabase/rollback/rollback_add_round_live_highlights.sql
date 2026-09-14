-- Run only after reverting the client that consumes this API.
begin;
drop function if exists public.obter_destaques_rodada_liga(uuid,integer);
drop function if exists private.obter_destaques_rodada_liga(uuid,integer);
-- Preserve schema privileges: other existing private functions may need them.
commit;
