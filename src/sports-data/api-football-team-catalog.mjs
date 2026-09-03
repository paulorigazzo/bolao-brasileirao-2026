function canonicalTeamName(value) {
  const name = String(value || "").trim();
  if (!name) throw new Error("api_football_canonical_team_name_invalid");
  return name;
}

function providerTeamId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("api_football_canonical_team_id_invalid");
  return id;
}

function addTeam(catalog, idValue, nameValue) {
  if (idValue == null) return;
  const id = providerTeamId(idValue);
  const name = canonicalTeamName(nameValue);
  const existing = catalog.get(id);
  if (existing && existing !== name) throw new Error(`api_football_canonical_team_conflict:${id}`);
  catalog.set(id, name);
}

function assertExactCoverage(catalog, ids) {
  const expectedIds = new Set(ids.map(providerTeamId));
  const missing = [...expectedIds].filter((id) => !catalog.has(id));
  const unexpected = [...catalog.keys()].filter((id) => !expectedIds.has(id));
  if (missing.length) throw new Error(`api_football_canonical_team_missing:${missing.join(",")}`);
  if (unexpected.length) throw new Error(`api_football_canonical_team_unexpected:${unexpected.join(",")}`);
}

export function buildApiFootballCanonicalTeamCatalog(canonicalGames = []) {
  const catalog = new Map();
  for (const game of canonicalGames) {
    addTeam(catalog, game?.api_football_time_casa_id, game?.time_casa);
    addTeam(catalog, game?.api_football_time_fora_id, game?.time_fora);
  }
  return catalog;
}

export function canonicalizeApiFootballStandings(standing, canonicalGames = []) {
  const rows = Array.isArray(standing?.table) ? standing.table : [];
  const catalog = buildApiFootballCanonicalTeamCatalog(canonicalGames);
  assertExactCoverage(catalog, rows.map((row) => row?.providerTeamId));
  return {
    ...standing,
    table: rows.map((row) => ({ ...row, teamName: catalog.get(Number(row.providerTeamId)) })),
  };
}

export function canonicalizeApiFootballClassificationResult(result, canonicalGames = []) {
  const rows = Array.isArray(result?.table) ? result.table : [];
  const catalog = buildApiFootballCanonicalTeamCatalog(canonicalGames);
  assertExactCoverage(catalog, rows.map((row) => row?.teamId));
  return {
    ...result,
    table: rows.map((row) => ({ ...row, team: catalog.get(Number(row.teamId)) })),
  };
}
