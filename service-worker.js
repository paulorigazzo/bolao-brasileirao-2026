self.addEventListener("push",event=>{
  let payload={};
  try{ payload=event.data?.json?.()||{}; }catch{ payload={body:event.data?.text?.()||""}; }
  const title=payload.title||"Bolão Brasileirão 2026";
  event.waitUntil(self.registration.showNotification(title,{
    body:payload.body||"Você ainda tem palpites pendentes.",
    icon:"/assets/brand/jarvis-approved.png",
    badge:"/assets/favicon.png",
    tag:payload.tag||"lembrete-palpites",
    data:{url:payload.url||"/"},
  }));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/",self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing){ await existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  })());
});
