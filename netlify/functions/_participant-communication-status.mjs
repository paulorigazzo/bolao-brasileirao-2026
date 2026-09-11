function normalizedEmail(value){
  return String(value||"").trim().toLowerCase();
}

export function buildParticipantCommunicationStatus({authorizations=[],profiles=[],subscriptions=[]}={}){
  const profileByEmail=new Map(profiles.map(profile=>[normalizedEmail(profile.email),profile]));
  const activeDevicesByUser=new Map();
  for(const subscription of subscriptions){
    if(subscription?.ativo===false) continue;
    const userId=String(subscription?.user_id||"");
    if(!userId) continue;
    activeDevicesByUser.set(userId,(activeDevicesByUser.get(userId)||0)+1);
  }
  const participants=authorizations
    .filter(item=>item?.ativo===true && (item?.status??"approved")==="approved")
    .map(item=>{
      const profile=profileByEmail.get(normalizedEmail(item.email));
      const userId=String(profile?.user_id||"");
      return {
        participantId:String(item.id),
        hasAccount:Boolean(userId),
        activeDevices:userId?(activeDevicesByUser.get(userId)||0):0,
      };
    });
  return {
    participants,
    totalParticipants:participants.length,
    enabledParticipants:participants.filter(item=>item.activeDevices>0).length,
  };
}
