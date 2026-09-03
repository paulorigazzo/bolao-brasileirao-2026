import {
  API_FOOTBALL_BRASILEIRAO_TEAM_IDS,
  apiFootballLocalCrestUrl,
  assessApiFootballCrestCoverage,
  inspectApiFootballCrest,
} from "../../src/sports-data/api-football-local-crests.mjs";

export async function probeApiFootballLocalCrests(origin, fetchImpl = fetch, teamIds = API_FOOTBALL_BRASILEIRAO_TEAM_IDS) {
  const coverage = assessApiFootballCrestCoverage(teamIds);
  if (!coverage.ok) return { ...coverage, failures: [{ errors: ["crest_coverage_invalid"], ...coverage }], results: [] };
  const results = await Promise.all(teamIds.map(async (teamId) => {
    const url = new URL(apiFootballLocalCrestUrl(teamId), origin);
    try {
      const response = await fetchImpl(url, { headers: { Accept: "image/png" }, signal: AbortSignal.timeout(4_000) });
      if (!response.ok) return { teamId, ok: false, status: response.status, errors: ["http_error"] };
      const inspected = inspectApiFootballCrest(await response.arrayBuffer(), response.headers.get("content-type"));
      return { teamId, status: response.status, ...inspected };
    } catch {
      return { teamId, ok: false, errors: ["request_failed"] };
    }
  }));
  const failures = results.filter((result) => !result.ok);
  return { ok: failures.length === 0, clubs: results.length, missing: [], unexpected: [], failures, results };
}
