export function normalizeParticipantEmail(value){
  return String(value||"").trim().toLowerCase();
}

export function resolveAttentionWhatsAppParticipant(progress,authorizedParticipants=[]){
  const email=normalizeParticipantEmail(progress?.email);
  if(!email) return null;
  return authorizedParticipants.find(participant=>normalizeParticipantEmail(participant?.email)===email)||null;
}

export function appendPoolLinkToWhatsAppMessage(message,poolUrl){
  const text=String(message||"").trim();
  const url=String(poolUrl||"").trim();
  if(!text || !url) return text;
  return `${text}\n\nAcesse o bolão:\n${url}`;
}
