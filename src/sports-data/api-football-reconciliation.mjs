import { createHash } from "node:crypto";

export const RECONCILIATION_TOLERANCE_MINUTES = 30;

const TEAM_ALIASES = new Map([
  ["mineiro", "atletico mineiro"],
  ["atletico mg", "atletico mineiro"],
  ["atletico mineiro", "atletico mineiro"],
  ["paranaense", "athletico paranaense"],
  ["atletico paranaense", "athletico paranaense"],
  ["athletico paranaense", "athletico paranaense"],
  ["bragantino", "red bull bragantino"],
  ["rb bragantino", "red bull bragantino"],
  ["red bull bragantino", "red bull bragantino"],
  ["clube do remo", "remo"],
  ["remo", "remo"],
  ["chapecoense", "chapecoense"],
  ["chapecoense sc", "chapecoense"],
]);

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function instant(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function normalizedTeamKey(value) {
  const basic = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return TEAM_ALIASES.get(basic) || basic;
}

function identityKey(round, home, away) {
  return `${round}|${normalizedTeamKey(home)}|${normalizedTeamKey(away)}`;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicated = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated].sort((a, b) => Number(a) - Number(b));
}

function stableHash(mappings) {
  const relevant = mappings.map((mapping) => ({
    canonicalGameId: mapping.canonicalGameId,
    providerFixtureId: mapping.providerFixtureId,
    providerHomeTeamId: mapping.providerHomeTeamId,
    providerAwayTeamId: mapping.providerAwayTeamId,
  })).sort((a, b) => a.canonicalGameId - b.canonicalGameId);
  return createHash("sha256").update(JSON.stringify(relevant)).digest("hex");
}

export function reconcileApiFootballSeason(canonicalGames, providerGames, options = {}) {
  const toleranceMinutes = Number(options.toleranceMinutes ?? RECONCILIATION_TOLERANCE_MINUTES);
  if (!Number.isFinite(toleranceMinutes) || toleranceMinutes < 0) throw new Error("reconciliation_tolerance_invalid");
  if (!Array.isArray(canonicalGames) || !Array.isArray(providerGames)) throw new Error("reconciliation_input_invalid");

  const canonicalIds = canonicalGames.map((game) => integer(game?.id_jogo)).filter(Boolean);
  const fixtureIds = providerGames.map((game) => integer(game?.providerFixtureId)).filter(Boolean);
  const structuralErrors = [];
  if (canonicalIds.length !== canonicalGames.length) structuralErrors.push("canonical_game_id_invalid");
  if (fixtureIds.length !== providerGames.length) structuralErrors.push("provider_fixture_id_invalid");
  if (duplicateValues(canonicalIds).length) structuralErrors.push("canonical_game_ids_duplicated");
  if (duplicateValues(fixtureIds).length) structuralErrors.push("provider_fixture_ids_duplicated");

  const providerByIdentity = new Map();
  for (const game of providerGames) {
    const key = identityKey(game?.roundNumber, game?.home?.name, game?.away?.name);
    const group = providerByIdentity.get(key) || [];
    group.push(game);
    providerByIdentity.set(key, group);
  }

  const mappings = [];
  const blocked = [];
  const usedFixtures = new Set();
  const aliasUsage = new Map();
  for (const canonical of canonicalGames) {
    const canonicalGameId = integer(canonical?.id_jogo);
    const key = identityKey(canonical?.rodada, canonical?.time_casa, canonical?.time_fora);
    const identityCandidates = providerByIdentity.get(key) || [];
    const canonicalKickoff = instant(canonical?.inicio);
    const withDelta = identityCandidates.map((provider) => ({
      provider,
      deltaMinutes: canonicalKickoff == null || instant(provider?.kickoffAt) == null
        ? null
        : Math.abs(instant(provider.kickoffAt) - canonicalKickoff) / 60000,
    }));
    const candidates = withDelta.filter((candidate) => candidate.deltaMinutes != null && candidate.deltaMinutes <= toleranceMinutes);

    if (candidates.length !== 1) {
      const finiteDeltas = withDelta.map((candidate) => candidate.deltaMinutes).filter(Number.isFinite);
      blocked.push({
        canonicalGameId,
        reason: candidates.length > 1 ? "ambiguous_candidates" : identityCandidates.length ? "kickoff_out_of_tolerance" : "identity_not_found",
        identityCandidates: identityCandidates.length,
        candidatesWithinTolerance: candidates.length,
        minimumKickoffDeltaMinutes: finiteDeltas.length ? Math.min(...finiteDeltas) : null,
      });
      continue;
    }

    const { provider, deltaMinutes } = candidates[0];
    if (usedFixtures.has(provider.providerFixtureId)) {
      blocked.push({ canonicalGameId, reason: "provider_fixture_reused", providerFixtureId: provider.providerFixtureId });
      continue;
    }
    const existing = [canonical.api_football_id, canonical.api_football_time_casa_id, canonical.api_football_time_fora_id];
    const observed = [provider.providerFixtureId, provider.home.providerTeamId, provider.away.providerTeamId];
    if (existing.some((value, index) => value != null && Number(value) !== Number(observed[index]))) {
      blocked.push({ canonicalGameId, reason: "existing_mapping_conflict", providerFixtureId: provider.providerFixtureId });
      continue;
    }

    usedFixtures.add(provider.providerFixtureId);
    for (const [canonicalName, providerName] of [[canonical.time_casa, provider.home.name], [canonical.time_fora, provider.away.name]]) {
      const pair = `${String(canonicalName ?? "")} ↔ ${String(providerName ?? "")}`;
      if (String(canonicalName ?? "") !== String(providerName ?? "")) aliasUsage.set(pair, (aliasUsage.get(pair) || 0) + 1);
    }
    mappings.push({
      canonicalGameId,
      providerFixtureId: provider.providerFixtureId,
      providerHomeTeamId: provider.home.providerTeamId,
      providerAwayTeamId: provider.away.providerTeamId,
      kickoffDeltaMinutes: deltaMinutes,
    });
  }

  const unmatchedProviderFixtureIds = providerGames
    .map((game) => game.providerFixtureId)
    .filter((fixtureId) => !usedFixtures.has(fixtureId))
    .sort((a, b) => a - b);
  const sortedMappings = mappings.sort((a, b) => a.canonicalGameId - b.canonicalGameId);
  const complete = structuralErrors.length === 0
    && blocked.length === 0
    && sortedMappings.length === canonicalGames.length
    && usedFixtures.size === providerGames.length;
  return {
    complete,
    toleranceMinutes,
    canonicalCount: canonicalGames.length,
    providerCount: providerGames.length,
    mappedCount: sortedMappings.length,
    blocked,
    unmatchedProviderFixtureIds,
    structuralErrors,
    aliasesUsed: [...aliasUsage.entries()].map(([pair, count]) => ({ pair, count })).sort((a, b) => a.pair.localeCompare(b.pair)),
    maximumKickoffDeltaMinutes: sortedMappings.length ? Math.max(...sortedMappings.map((mapping) => mapping.kickoffDeltaMinutes)) : null,
    reconciliationHash: stableHash(sortedMappings),
    mappings: sortedMappings,
  };
}
