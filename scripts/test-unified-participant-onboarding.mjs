import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const root=new URL("../",import.meta.url);
const [app,html,css,migration,test]=await Promise.all([
  readFile(new URL("js/app.js",root),"utf8"),readFile(new URL("index.html",root),"utf8"),readFile(new URL("css/styles.css",root),"utf8"),
  readFile(new URL("supabase/migrations/20260905030000_unify_participant_onboarding.sql",root),"utf8"),readFile(new URL("supabase/tests/unified-participant-onboarding.sql",root),"utf8")
]);
assert.match(html,/id="registrationForm"[\s\S]*id="heroLoginBtn"[^>]*type="submit"/);
assert.ok(html.indexOf('id="registrationNameInput"')<html.indexOf('id="heroLoginBtn"'));
assert.match(html,/id="registrationFavoriteTeamFieldset" class="registration-favorite-team hidden"/);
assert.match(html,/id="activationFailureStatus"/);
assert.match(html,/id="newParticipantLeagueOptions"/);
assert.match(app,/startMembershipStatusPolling/);
assert.match(app,/salvar_participante_autorizado_com_ligas/);
assert.match(app,/adicionar_ligas_participante_autorizado/);
assert.match(app,/listar_situacao_participantes_ligas/);
for(const fn of ["salvar_participante_autorizado_com_ligas","adicionar_ligas_participante_autorizado","listar_situacao_participantes_ligas"])assert.match(migration,new RegExp(`function public\\.${fn}`));
assert.match(migration,/security definer set search_path=''/g);
assert.match(migration,/revoke all on function[\s\S]*from public,anon/);
assert.match(migration,/array_agg\(x\.id order by x\.id\)/);
assert.doesNotMatch(migration,/(?:insert|update|delete)[\s\S]{0,35}public\.(?:palpites|jogos)/i);
assert.match(css,/\.field-error/);
assert.match(test,/L10_OK/);
console.log("Jornada unificada de novos participantes verificada com sucesso.");
