export const SPORTS_DATA_CONTRACT_VERSION = "sports-data/v1";

export const NORMALIZED_GAME_STATUSES = Object.freeze([
  "scheduled",
  "live",
  "halftime",
  "postponed",
  "cancelled",
  "finished",
  "unknown",
]);

function scoreKnown(score) {
  return Number.isInteger(score?.home) && Number.isInteger(score?.away);
}

function eventCount(game) {
  return Array.isArray(game?.events) ? game.events.length : 0;
}

function identityChanged(previous, current) {
  return Number(previous?.providerFixtureId) !== Number(current?.providerFixtureId)
    || Number(previous?.home?.providerTeamId) !== Number(current?.home?.providerTeamId)
    || Number(previous?.away?.providerTeamId) !== Number(current?.away?.providerTeamId);
}

function clockValue(clock) {
  if (!Number.isInteger(clock?.elapsed)) return null;
  return clock.elapsed + (Number.isInteger(clock?.extra) ? clock.extra : 0);
}

export function assessGameRegression(previous, current) {
  const errors = [];
  const warnings = [];

  if (!previous || !current) {
    return {
      valid: false,
      errors: ["missing_regression_operand"],
      warnings,
      preservePreviousEvents: false,
    };
  }

  if (identityChanged(previous, current)) errors.push("game_identity_changed");

  if (previous.status?.normalized === "finished" && current.status?.normalized !== "finished") {
    errors.push("finished_status_regression");
  }

  const previousScoreKnown = scoreKnown(previous.score);
  const currentScoreKnown = scoreKnown(current.score);
  if (previousScoreKnown && !currentScoreKnown) {
    errors.push("known_score_became_missing");
  } else if (
    previousScoreKnown
    && currentScoreKnown
    && (current.score.home < previous.score.home || current.score.away < previous.score.away)
  ) {
    errors.push("score_regression");
  }

  const samePeriod = previous.clock?.period != null
    && previous.clock.period === current.clock?.period;
  const previousClock = clockValue(previous.clock);
  const currentClock = clockValue(current.clock);
  if (samePeriod && previousClock != null && currentClock != null && currentClock < previousClock) {
    errors.push("clock_regression");
  }

  const preservePreviousEvents = eventCount(previous) > 0 && eventCount(current) === 0;
  if (preservePreviousEvents) warnings.push("events_temporarily_missing");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    preservePreviousEvents,
  };
}

