export function rankingMovementKey(participant, index = 0) {
  return String(participant?.userId || participant?.key || participant?.name || `position-${index}`);
}

export function buildRankingPositions(ranking = []) {
  return Object.fromEntries(ranking.map((participant, index) => [rankingMovementKey(participant, index), index + 1]));
}

export function evaluateRankingMovement({
  ranking = [],
  persistedPositions = {},
  previousSignature = null,
  previousMovement = {}
} = {}) {
  const positions = buildRankingPositions(ranking);
  const signature = JSON.stringify(positions);

  if (signature === previousSignature) {
    return { positions, signature, movement: previousMovement, reused: true };
  }

  const movement = {};
  ranking.forEach((participant, index) => {
    const key = rankingMovementKey(participant, index);
    const previousPosition = Number(persistedPositions?.[key]);
    movement[key] = Number.isFinite(previousPosition) ? previousPosition - (index + 1) : 0;
  });

  return { positions, signature, movement, reused: false };
}
