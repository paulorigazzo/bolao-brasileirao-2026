import {
  NORMALIZED_GAME_STATUSES,
  SPORTS_DATA_CONTRACT_VERSION,
} from "./contract.mjs";

const PROVIDER = "api-football";
const KNOWN_STATUS = new Map([
  ["TBD", ["scheduled", false, false, null]],
  ["NS", ["scheduled", false, false, null]],
  ["1H", ["live", true, false, "firstHalf"]],
  ["2H", ["live", true, false, "secondHalf"]],
  ["ET", ["live", true, false, "extraTime"]],
  ["P", ["live", true, false, "penalties"]],
  ["LIVE", ["live", true, false, null]],
  ["HT", ["halftime", true, false, "halftime"]],
  ["BT", ["halftime", true, false, "extraTimeBreak"]],
  ["PST", ["postponed", false, false, null]],
  ["SUSP", ["postponed", false, false, null]],
  ["INT", ["postponed", false, false, null]],
  ["CANC", ["cancelled", false, false, null]],
  ["ABD", ["cancelled", false, false, null]],
  ["FT", ["finished", false, true, "secondHalf"]],
  ["AET", ["finished", false, true, "extraTime"]],
  ["PEN", ["finished", false, true, "penalties"]],
  ["AWD", ["finished", false, true, null]],
  ["WO", ["finished", false, true, null]],
]);

function integer(value, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : null;
}

function nullableInteger(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  return integer(value, minimum, maximum);
}

function nonEmpty(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function httpsUrl(value, warnings, warningCode) {
  const text = nonEmpty(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol === "https:") return url.toString();
  } catch {}
  warnings.push(warningCode);
  return null;
}

function isoDate(value) {
  const text = nonEmpty(value);
  if (!text) return null;
  const time = new Date(text).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function errorEntries(errors) {
  if (Array.isArray(errors)) return errors.filter(Boolean);
  if (errors && typeof errors === "object") return Object.values(errors).filter(Boolean);
  return errors ? [errors] : [];
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  return entry?.[1] ?? null;
}

function quotaInteger(headers, name) {
  return nullableInteger(headerValue(headers, name), 0, Number.MAX_SAFE_INTEGER);
}

function observation(options, endpoint) {
  const httpStatus = nullableInteger(options.httpStatus, 100, 599);
  const requestSucceeded = httpStatus == null || (httpStatus >= 200 && httpStatus < 300);
  return {
    contractVersion: SPORTS_DATA_CONTRACT_VERSION,
    provider: PROVIDER,
    endpoint,
    observedAt: isoDate(options.observedAt) || new Date(0).toISOString(),
    providerUpdatedAt: null,
    requestSucceeded,
    responseValid: false,
    httpStatus,
    durationMs: nullableInteger(options.durationMs, 0, Number.MAX_SAFE_INTEGER),
    dailyLimit: quotaInteger(options.headers, "x-ratelimit-requests-limit"),
    dailyRemaining: quotaInteger(options.headers, "x-ratelimit-requests-remaining"),
    minuteLimit: quotaInteger(options.headers, "x-ratelimit-limit"),
    minuteRemaining: quotaInteger(options.headers, "x-ratelimit-remaining"),
    errors: [],
    warnings: [],
  };
}

function validateEnvelope(payload, metadata) {
  if (!metadata.requestSucceeded) metadata.errors.push("http_request_failed");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    metadata.errors.push("invalid_response_envelope");
    return [];
  }
  if (errorEntries(payload.errors).length) metadata.errors.push("provider_reported_errors");
  if (!Array.isArray(payload.response)) {
    metadata.errors.push("invalid_response_collection");
    return [];
  }
  const current = integer(payload.paging?.current, 1, Number.MAX_SAFE_INTEGER);
  const total = integer(payload.paging?.total, 1, Number.MAX_SAFE_INTEGER);
  if (current == null || total == null || current !== total) metadata.errors.push("incomplete_pagination");
  const results = integer(payload.results, 0, Number.MAX_SAFE_INTEGER);
  if (results == null || results !== payload.response.length) metadata.errors.push("results_count_mismatch");
  return payload.response;
}

export function normalizeApiFootballStatus(rawStatus = {}) {
  const rawCode = nonEmpty(rawStatus.short)?.toUpperCase() || "";
  const mapped = KNOWN_STATUS.get(rawCode);
  if (!mapped) {
    return {
      rawCode,
      rawLabel: nonEmpty(rawStatus.long),
      normalized: "unknown",
      isLive: false,
      isFinal: false,
      isKnown: false,
      period: null,
    };
  }
  return {
    rawCode,
    rawLabel: nonEmpty(rawStatus.long),
    normalized: mapped[0],
    isLive: mapped[1],
    isFinal: mapped[2],
    isKnown: true,
    period: mapped[3],
  };
}

function normalizeRound(rawRound, competitionId, season, warnings) {
  const roundRaw = nonEmpty(rawRound);
  if (Number(competitionId) !== 71 || Number(season) !== 2026 || !roundRaw) {
    if (roundRaw) warnings.push("round_not_normalized");
    return { roundNumber: null, roundRaw };
  }
  const match = roundRaw.match(/^Regular Season - (\d{1,2})$/);
  const roundNumber = match ? integer(match[1], 1, 38) : null;
  if (roundNumber == null) warnings.push("round_not_normalized");
  return { roundNumber, roundRaw };
}

function normalizeTeam(rawTeam, side, errors, warnings) {
  const providerTeamId = integer(rawTeam?.id, 1, Number.MAX_SAFE_INTEGER);
  const name = nonEmpty(rawTeam?.name);
  if (providerTeamId == null) errors.push(`${side}_team_id_invalid`);
  if (!name) errors.push(`${side}_team_name_invalid`);
  return {
    providerTeamId,
    name,
    shortName: null,
    crestUrl: httpsUrl(rawTeam?.logo, warnings, `${side}_crest_invalid`),
  };
}

function normalizeClock(rawStatus, normalizedStatus, errors) {
  const rawElapsed = rawStatus?.elapsed;
  const rawExtra = rawStatus?.extra;
  const elapsed = nullableInteger(rawElapsed, 0, 130);
  const extra = nullableInteger(rawExtra, 0, 30);
  if (rawElapsed != null && elapsed == null) errors.push("elapsed_invalid");
  if (rawExtra != null && extra == null) errors.push("extra_invalid");
  const displayBase = [45, 90, 105, 120].includes(elapsed) ? elapsed : null;
  return {
    elapsed,
    extra,
    period: normalizedStatus.period,
    isOfficial: elapsed != null,
    displayBase,
  };
}

function scoreInteger(value, code, errors) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = integer(value, 0, 99);
  if (normalized == null) errors.push(code);
  return normalized;
}

function normalizeScore(raw, normalizedStatus, errors) {
  const score = {
    home: scoreInteger(raw?.goals?.home, "home_score_invalid", errors),
    away: scoreInteger(raw?.goals?.away, "away_score_invalid", errors),
    halftimeHome: scoreInteger(raw?.score?.halftime?.home, "halftime_home_invalid", errors),
    halftimeAway: scoreInteger(raw?.score?.halftime?.away, "halftime_away_invalid", errors),
    fulltimeHome: scoreInteger(raw?.score?.fulltime?.home, "fulltime_home_invalid", errors),
    fulltimeAway: scoreInteger(raw?.score?.fulltime?.away, "fulltime_away_invalid", errors),
    extraTimeHome: scoreInteger(raw?.score?.extratime?.home, "extratime_home_invalid", errors),
    extraTimeAway: scoreInteger(raw?.score?.extratime?.away, "extratime_away_invalid", errors),
    penaltyHome: scoreInteger(raw?.score?.penalty?.home, "penalty_home_invalid", errors),
    penaltyAway: scoreInteger(raw?.score?.penalty?.away, "penalty_away_invalid", errors),
  };
  if (normalizedStatus.isLive && (score.home == null || score.away == null)) {
    errors.push("live_score_missing");
  }
  if (normalizedStatus.isFinal && (score.home == null || score.away == null)) {
    errors.push("final_score_missing");
  }
  if (
    normalizedStatus.rawCode === "FT"
    && (score.fulltimeHome == null || score.fulltimeAway == null)
  ) {
    errors.push("final_score_snapshot_missing");
  }
  if (
    normalizedStatus.rawCode === "FT"
    && score.fulltimeHome != null
    && score.fulltimeAway != null
    && (score.home !== score.fulltimeHome || score.away !== score.fulltimeAway)
  ) {
    errors.push("final_score_mismatch");
  }
  return score;
}

function eventKey(fixtureId, event) {
  return [
    fixtureId,
    event.elapsed ?? "",
    event.extra ?? "",
    event.teamProviderId ?? "",
    event.playerProviderId ?? "",
    event.relatedPlayerProviderId ?? "",
    event.typeRaw ?? "",
    event.detailRaw ?? "",
  ].join(":");
}

function normalizeEvents(rawEvents, fixtureId, score, status, warnings) {
  if (!Array.isArray(rawEvents)) {
    warnings.push("events_missing");
    return [];
  }
  const events = rawEvents.map((raw) => {
    const event = {
      providerEventKey: "",
      elapsed: nullableInteger(raw?.time?.elapsed, 0, 130),
      extra: nullableInteger(raw?.time?.extra, 0, 30),
      teamProviderId: nullableInteger(raw?.team?.id, 1, Number.MAX_SAFE_INTEGER),
      teamName: nonEmpty(raw?.team?.name),
      playerProviderId: nullableInteger(raw?.player?.id, 1, Number.MAX_SAFE_INTEGER),
      playerName: nonEmpty(raw?.player?.name),
      relatedPlayerProviderId: nullableInteger(raw?.assist?.id, 1, Number.MAX_SAFE_INTEGER),
      relatedPlayerName: nonEmpty(raw?.assist?.name),
      typeRaw: nonEmpty(raw?.type) || "unknown",
      detailRaw: nonEmpty(raw?.detail),
      comments: nonEmpty(raw?.comments),
    };
    event.providerEventKey = eventKey(fixtureId, event);
    return event;
  });
  if (!events.length && (status.isLive || status.isFinal) && ((score.home || 0) + (score.away || 0) > 0)) {
    warnings.push("events_missing");
  }
  return events;
}

function normalizeFixture(raw, options, metadata) {
  const errors = metadata.errors;
  const warnings = metadata.warnings;
  const providerFixtureId = integer(raw?.fixture?.id, 1, Number.MAX_SAFE_INTEGER);
  const competitionProviderId = integer(raw?.league?.id, 1, Number.MAX_SAFE_INTEGER);
  const season = integer(raw?.league?.season, 1900, 2999);
  const kickoffAt = isoDate(raw?.fixture?.date);
  if (providerFixtureId == null) errors.push("fixture_id_invalid");
  if (competitionProviderId == null) errors.push("competition_id_invalid");
  if (season == null) errors.push("season_invalid");
  if (!kickoffAt) errors.push("kickoff_invalid");

  const status = normalizeApiFootballStatus(raw?.fixture?.status);
  if (!status.isKnown || !NORMALIZED_GAME_STATUSES.includes(status.normalized)) {
    errors.push("unknown_fixture_status");
  }
  if (["AWD", "WO"].includes(status.rawCode)) warnings.push("administrative_result");

  const round = normalizeRound(raw?.league?.round, competitionProviderId, season, warnings);
  const home = normalizeTeam(raw?.teams?.home, "home", errors, warnings);
  const away = normalizeTeam(raw?.teams?.away, "away", errors, warnings);
  const clock = normalizeClock(raw?.fixture?.status, status, errors);
  const score = normalizeScore(raw, status, errors);
  const events = normalizeEvents(raw?.events, providerFixtureId, score, status, warnings);

  return {
    contractVersion: SPORTS_DATA_CONTRACT_VERSION,
    provider: PROVIDER,
    canonicalGameId: nullableInteger(options.canonicalGameId, 1, Number.MAX_SAFE_INTEGER),
    providerFixtureId,
    competitionProviderId,
    season,
    ...round,
    kickoffAt,
    venueName: nonEmpty(raw?.fixture?.venue?.name),
    timezoneRaw: nonEmpty(raw?.fixture?.timezone),
    home,
    away,
    status: {
      rawCode: status.rawCode,
      rawLabel: status.rawLabel,
      normalized: status.normalized,
      isLive: status.isLive,
      isFinal: status.isFinal,
      isKnown: status.isKnown,
    },
    clock,
    score,
    events,
  };
}

export function normalizeApiFootballFixtureEnvelope(payload, options = {}) {
  const metadata = observation(options, "fixtures");
  const response = validateEnvelope(payload, metadata);
  const requestedFixtureId = nullableInteger(options.requestedFixtureId, 1, Number.MAX_SAFE_INTEGER);
  let candidates = response;
  if (requestedFixtureId != null) {
    candidates = response.filter((item) => Number(item?.fixture?.id) === requestedFixtureId);
    if (candidates.length !== 1) metadata.errors.push("requested_fixture_not_unique");
  } else if (response.length !== 1) {
    metadata.errors.push("fixture_not_unique");
  }
  const game = candidates.length === 1 ? normalizeFixture(candidates[0], options, metadata) : null;
  metadata.responseValid = metadata.errors.length === 0;
  return { observation: metadata, game: metadata.responseValid ? game : null };
}

export function normalizeApiFootballFixturesEnvelope(payload, options = {}) {
  const metadata = observation(options, "fixtures");
  const response = validateEnvelope(payload, metadata);
  const games = response.map((raw) => normalizeFixture(raw, options, metadata));
  const fixtureIds = new Set(games.map((game) => game.providerFixtureId));
  if (fixtureIds.size !== games.length) metadata.errors.push("fixture_ids_duplicated");
  const expectedCount = nullableInteger(options.expectedCount, 1, Number.MAX_SAFE_INTEGER);
  if (expectedCount != null && games.length !== expectedCount) metadata.errors.push("fixture_count_unexpected");
  metadata.responseValid = metadata.errors.length === 0;
  return { observation: metadata, games: metadata.responseValid ? games : [] };
}

function normalizeStandingRow(raw, warnings, errors) {
  const position = integer(raw?.rank, 1, 999);
  const providerTeamId = integer(raw?.team?.id, 1, Number.MAX_SAFE_INTEGER);
  const teamName = nonEmpty(raw?.team?.name);
  const played = integer(raw?.all?.played, 0, 999);
  const won = integer(raw?.all?.win, 0, 999);
  const drawn = integer(raw?.all?.draw, 0, 999);
  const lost = integer(raw?.all?.lose, 0, 999);
  const points = integer(raw?.points, 0, 999);
  const goalsFor = integer(raw?.all?.goals?.for, 0, 999);
  const goalsAgainst = integer(raw?.all?.goals?.against, 0, 999);
  const goalDifference = Number(raw?.goalsDiff);

  if (position == null) errors.push("standing_position_invalid");
  if (providerTeamId == null) errors.push("standing_team_id_invalid");
  if (!teamName) errors.push("standing_team_name_invalid");
  if ([played, won, drawn, lost, points, goalsFor, goalsAgainst].some((value) => value == null)) {
    errors.push("standing_totals_invalid");
  }
  if (!Number.isInteger(goalDifference)) errors.push("standing_goal_difference_invalid");

  return {
    position,
    providerTeamId,
    teamName,
    crestUrl: httpsUrl(raw?.team?.logo, warnings, "standing_crest_invalid"),
    played,
    won,
    drawn,
    lost,
    points,
    goalsFor,
    goalsAgainst,
    goalDifference: Number.isInteger(goalDifference) ? goalDifference : null,
    form: nonEmpty(raw?.form),
    description: nonEmpty(raw?.description),
  };
}

function validateStandings(rows, groupCount, errors) {
  if (groupCount !== 1) errors.push("standings_group_count_invalid");
  if (rows.length !== 20) errors.push("standings_team_count_invalid");
  const positions = new Set(rows.map((row) => row.position));
  const teams = new Set(rows.map((row) => row.providerTeamId));
  if (positions.size !== rows.length || !rows.every((row, index) => row.position === index + 1)) {
    errors.push("standings_positions_invalid");
  }
  if (teams.size !== rows.length) errors.push("standings_team_ids_duplicated");
  for (const row of rows) {
    if ([row.played, row.won, row.drawn, row.lost].every(Number.isInteger)
      && row.played !== row.won + row.drawn + row.lost) {
      errors.push("standing_record_inconsistent");
      break;
    }
    if ([row.goalDifference, row.goalsFor, row.goalsAgainst].every(Number.isInteger)
      && row.goalDifference !== row.goalsFor - row.goalsAgainst) {
      errors.push("standing_goal_difference_inconsistent");
      break;
    }
  }
}

export function normalizeApiFootballStandingsEnvelope(payload, options = {}) {
  const metadata = observation(options, "standings");
  const response = validateEnvelope(payload, metadata);
  if (response.length !== 1) metadata.errors.push("standings_response_not_unique");
  const rawLeague = response[0]?.league;
  const groups = Array.isArray(rawLeague?.standings) ? rawLeague.standings : [];
  if (!groups.length || groups.some((group) => !Array.isArray(group))) {
    metadata.errors.push("standings_groups_invalid");
  }
  const rows = groups.flat().map((row) => normalizeStandingRow(row, metadata.warnings, metadata.errors));
  validateStandings(rows, groups.length, metadata.errors);
  const competitionProviderId = integer(rawLeague?.id, 1, Number.MAX_SAFE_INTEGER);
  const season = integer(rawLeague?.season, 1900, 2999);
  const competitionName = nonEmpty(rawLeague?.name);
  if (competitionProviderId == null) metadata.errors.push("competition_id_invalid");
  if (season == null) metadata.errors.push("season_invalid");
  if (!competitionName) metadata.errors.push("competition_name_invalid");

  metadata.responseValid = metadata.errors.length === 0;
  return {
    observation: metadata,
    standings: metadata.responseValid ? {
      contractVersion: SPORTS_DATA_CONTRACT_VERSION,
      provider: PROVIDER,
      competitionProviderId,
      competitionName,
      season,
      currentRound: null,
      observedAt: metadata.observedAt,
      groupCount: groups.length,
      teamCount: rows.length,
      table: rows,
    } : null,
  };
}
