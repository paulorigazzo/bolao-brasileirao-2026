export function membershipStatus(authorization){
  if(!authorization) return "missing";
  if(authorization.status && authorization.status!=="approved") return authorization.status;
  if(authorization.ativo===false) return "inactive";
  return authorization.status || "approved";
}

export function isApprovedMembership(authorization){
  return membershipStatus(authorization)==="approved" && authorization?.ativo!==false;
}

export function isAdministrator(authorization){
  return isApprovedMembership(authorization) && authorization?.administrador===true;
}

export function buildParticipantDirectory(participants=[],authorizedParticipants=[]){
  const directory={};
  for(const participant of participants){
    if(participant?.ativo===false) continue;
    const email=String(participant?.email||"").trim().toLowerCase();
    const name=String(participant?.nome||"").trim();
    if(email && name) directory[email]=name;
  }
  for(const authorization of authorizedParticipants){
    if(!isApprovedMembership(authorization)) continue;
    const email=String(authorization?.email||"").trim().toLowerCase();
    const name=String(authorization?.nome||"").trim();
    if(email && name && !directory[email]) directory[email]=name;
  }
  return directory;
}
