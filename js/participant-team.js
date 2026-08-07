const normalizeEmail=value=>String(value||"").trim().toLowerCase();
const normalizeName=value=>String(value||"").trim().toLocaleLowerCase("pt-BR");

export function resolveParticipantFavoriteTeam(participant,{profiles=[],authorizations=[]}={}){
  const identity=typeof participant==="string"?{name:participant}:participant||{};
  const userId=String(identity.userId||identity.user_id||"");
  const email=normalizeEmail(identity.email);
  const name=normalizeName(identity.name||identity.nome);
  const profile=profiles.find(item=>userId && String(item?.user_id||"")===userId)
    || profiles.find(item=>email && normalizeEmail(item?.email)===email)
    || profiles.find(item=>name && normalizeName(item?.nome)===name)
    || null;
  const authorizationEmail=email || normalizeEmail(profile?.email);
  const authorization=authorizations.find(item=>authorizationEmail && normalizeEmail(item?.email)===authorizationEmail)
    || authorizations.find(item=>name && normalizeName(item?.nome)===name)
    || null;
  return profile?.time_favorito || authorization?.time_favorito || null;
}
