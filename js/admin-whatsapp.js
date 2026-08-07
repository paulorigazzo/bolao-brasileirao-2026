export function normalizeParticipantEmail(value){
  return String(value||"").trim().toLowerCase();
}

export function resolveAttentionWhatsAppParticipant(progress,authorizedParticipants=[]){
  const email=normalizeParticipantEmail(progress?.email);
  if(!email) return null;
  return authorizedParticipants.find(participant=>normalizeParticipantEmail(participant?.email)===email)||null;
}
