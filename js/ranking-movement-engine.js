export function rankingMovementKey(participant, index = 0) {
  return String(participant?.userId || participant?.key || participant?.name || `position-${index}`);
}

export function buildRankingMovementFromHistory({ ranking = [], rounds = [] } = {}) {
  const latestRounds = rounds.slice(-2);
  const previousByName = new Map((latestRounds[0]?.ranking || []).map(item => [String(item?.name || ""), Number(item?.position)]));
  const currentByName = new Map((latestRounds[1]?.ranking || []).map(item => [String(item?.name || ""), Number(item?.position)]));
  const movement = {};
  ranking.forEach((participant, index) => {
    const key = rankingMovementKey(participant, index);
    const name = String(participant?.name || "");
    const previousPosition = previousByName.get(name);
    const currentPosition = currentByName.get(name);
    movement[key] = Number.isFinite(previousPosition) && Number.isFinite(currentPosition)
      ? previousPosition - currentPosition
      : 0;
  });
  return movement;
}
