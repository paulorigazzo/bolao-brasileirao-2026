export function supportsWebPush(environment=globalThis){
  return Boolean(environment?.isSecureContext
    && environment?.navigator?.serviceWorker
    && environment?.PushManager
    && environment?.Notification);
}

export function base64UrlToUint8Array(value){
  const padding="=".repeat((4-(value.length%4))%4);
  const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

export function subscriptionRow(subscription,userId){
  const json=subscription?.toJSON?.()||{};
  if(!userId || !json.endpoint || !json.keys?.p256dh || !json.keys?.auth){
    throw new Error("O navegador não retornou uma assinatura Web Push válida.");
  }
  return {
    user_id:userId,
    endpoint:json.endpoint,
    p256dh:json.keys.p256dh,
    auth:json.keys.auth,
    ativo:true,
    autorizado_em:new Date().toISOString(),
    atualizado_em:new Date().toISOString(),
  };
}

export async function currentPushSubscription(registration){
  return registration?.pushManager?.getSubscription?.()||null;
}

export async function createPushSubscription(registration,publicKey){
  if(!registration?.pushManager) throw new Error("Service worker indisponível neste navegador.");
  return registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:base64UrlToUint8Array(publicKey),
  });
}
