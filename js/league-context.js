const DEFAULT_STORAGE_PREFIX = "bolao-active-league";

const leagueId = league => String(league?.liga_id || league?.id || "").trim();

export function leaguePreferenceKey(userId, prefix = DEFAULT_STORAGE_PREFIX) {
  const id = String(userId || "").trim();
  return id ? `${prefix}:${id}` : prefix;
}

export function chooseActiveLeague(leagues = [], { userId, storage } = {}) {
  const available = leagues.filter(league => leagueId(league));
  if (!available.length) return null;
  let saved = "";
  try { saved = String(storage?.getItem?.(leaguePreferenceKey(userId)) || ""); } catch (_error) {}
  return available.find(league => leagueId(league) === saved)
    || available.find(league => String(league?.liga_tipo || league?.tipo || "") === "standard")
    || available[0];
}

export function persistActiveLeague(league, { userId, storage } = {}) {
  const id = leagueId(league);
  if (!id) return false;
  try {
    storage?.setItem?.(leaguePreferenceKey(userId), id);
    return true;
  } catch (_error) {
    return false;
  }
}

export function createLeagueRequestGate() {
  let current = 0;
  return {
    issue() { current += 1; return current; },
    isCurrent(requestId) { return requestId === current; }
  };
}

export function activeLeagueName(league) {
  return String(league?.liga_nome || league?.nome || "Liga indisponível").trim();
}

export function filterProfilesByMembers(profiles = [], members = []) {
  const ids = new Set(members.map(member => String(member?.user_id || "")).filter(Boolean));
  return profiles.filter(profile => ids.has(String(profile?.user_id || "")));
}
