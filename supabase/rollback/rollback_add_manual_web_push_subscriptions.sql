-- Remove apenas a fundação de Web Push da v6.31.0.
-- Assinaturas deixam de funcionar; dados competitivos permanecem intactos.

begin;
drop table if exists public.push_subscriptions;
commit;
