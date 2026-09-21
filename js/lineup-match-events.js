const number = (value) => value === null || value === undefined || value === "" ? null
  : Number.isInteger(Number(value)) ? Number(value) : null;
const minute = (event) => {
  const elapsed = number(event?.elapsed);
  const extra = number(event?.extra);
  if (elapsed === null) return "";
  return extra && extra > 0 ? `${elapsed}+${extra}'` : `${elapsed}'`;
};
const normalized = (value) => String(value || "").trim().toLowerCase();

function playerIndex(side) {
  const index = new Map();
  for (const group of [side?.starters, side?.substitutes]) {
    for (const player of Array.isArray(group) ? group : []) {
      const id = number(player?.id);
      if (id !== null) index.set(id, {
        player: { id, name: String(player?.name || "").trim(), number: player?.number ?? null },
        goals: [], cards: [], substitution: null, substitutions: [], replacedBy: null, replacements: [],
      });
    }
  }
  return index;
}

function connectPitchReplacements(side, lineupSide) {
  for (const starter of Array.isArray(lineupSide?.starters) ? lineupSide.starters : []) {
    const root = side.players.get(number(starter?.id));
    if (!root) continue;
    const visited = new Set([root.player.id]);
    let current = root;
    while (current.replacedBy !== null && !visited.has(current.replacedBy)) {
      const replacement = side.players.get(current.replacedBy);
      if (!replacement) break;
      visited.add(replacement.player.id);
      root.replacements.push({
        player: replacement.player,
        goals: replacement.goals,
        cards: replacement.cards,
        substitution: replacement.substitution,
        substitutions: replacement.substitutions,
      });
      current = replacement;
    }
  }
}

function cardKind(detail) {
  const value = normalized(detail);
  if (value.includes("second yellow")) return "second-yellow";
  if (value.includes("red")) return "red";
  if (value.includes("yellow")) return "yellow";
  return null;
}

function goalKind(detail) {
  const value = normalized(detail);
  if (value === "missed penalty") return null;
  if (value.includes("own goal")) return "own-goal";
  if (value.includes("penalty")) return "penalty";
  return "goal";
}

export function buildLineupMatchEventsModel(game, lineups, projection) {
  const empty = { home: new Map(), away: new Map() };
  if (!lineups || !projection || Number(projection.id_externo) !== Number(game?.api_football_id)) return empty;
  const sides = {
    home: { teamId: number(game?.api_football_time_casa_id), players: playerIndex(lineups.home) },
    away: { teamId: number(game?.api_football_time_fora_id), players: playerIndex(lineups.away) },
  };
  for (const event of Array.isArray(projection.eventos) ? projection.eventos : []) {
    const type = normalized(event?.typeRaw);
    if (type === "goal") {
      const playerId = number(event?.playerProviderId);
      const player = sides.home.players.get(playerId) || sides.away.players.get(playerId);
      const kind = goalKind(event?.detailRaw);
      if (player && kind) player.goals.push({ kind, minute: minute(event) });
      continue;
    }
    const side = Object.values(sides).find((item) => item.teamId !== null && item.teamId === number(event?.teamProviderId));
    if (!side) continue;
    if (type === "card") {
      const player = side.players.get(number(event?.playerProviderId));
      const kind = cardKind(event?.detailRaw);
      if (player && kind) player.cards.push({ kind, minute: minute(event) });
      continue;
    }
    if (type !== "subst") continue;
    const outgoing = side.players.get(number(event?.playerProviderId));
    const incoming = side.players.get(number(event?.relatedPlayerProviderId));
    if (!outgoing || !incoming) continue;
    const at = minute(event);
    outgoing.substitution = { direction: "out", minute: at, counterpart: incoming.player };
    incoming.substitution = { direction: "in", minute: at, counterpart: outgoing.player };
    outgoing.substitutions.push(outgoing.substitution);
    incoming.substitutions.push(incoming.substitution);
    outgoing.replacedBy = incoming.player.id;
  }
  connectPitchReplacements(sides.home, lineups.home);
  connectPitchReplacements(sides.away, lineups.away);
  return { home: sides.home.players, away: sides.away.players };
}
