export const PUSH_ACTIVATION_PROMPT_DELAY_MS = 700;
export const PUSH_ACTIVATION_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function isPushActivationPromptPreview(location) {
  const hostname = String(location?.hostname || "").toLowerCase();
  const allowed = hostname === "localhost" || hostname === "127.0.0.1"
    || /^deploy-preview-\d+--bolaorigazzo2026\.netlify\.app$/.test(hostname);
  return allowed && new URLSearchParams(location?.search || "").get("pushActivationPreview") === "1";
}

export function shouldOfferPushActivation({
  supported,
  permission,
  activeDeviceCount,
  dismissedUntil,
  now = Date.now(),
  homeVisible,
  shownThisSession,
}) {
  return Boolean(supported)
    && permission !== "denied"
    && Number(activeDeviceCount || 0) === 0
    && Number(dismissedUntil || 0) <= now
    && Boolean(homeVisible)
    && !shownThisSession;
}

export function nextPushActivationPromptDate(now = Date.now()) {
  return now + PUSH_ACTIVATION_PROMPT_SNOOZE_MS;
}
