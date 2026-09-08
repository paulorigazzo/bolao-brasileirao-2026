export function isGameGoalEventsPreview(locationLike) {
  const host = String(locationLike?.hostname || "").toLowerCase();
  const allowed = host === "localhost" || host === "127.0.0.1" || host.startsWith("deploy-preview-");
  return allowed && new URLSearchParams(locationLike?.search || "").get("goalEventsPreview") === "1";
}

export function buildGameGoalEventsPreview(game) {
  const home = Math.max(0, Number(game?.gols_casa) || 0);
  const away = Math.max(0, Number(game?.gols_fora) || 0);
  if (home + away === 0) return null;
  const events = [];
  for (let index = 0; index < Math.max(home, away); index += 1) {
    if (index < home) events.push({ typeRaw: "Goal", detailRaw: index === home - 1 && home > 1 ? "Penalty" : "Normal Goal",
      teamProviderId: Number(game.api_football_time_casa_id), playerName: index ? "Gabriel Barbosa" : "Atacante da Casa com Nome Longo", elapsed: 14 + index * 31, extra: index ? 2 : null });
    if (index < away) events.push({ typeRaw: "Goal", detailRaw: index === 0 && away > 1 ? "Own Goal" : "Normal Goal",
      teamProviderId: Number(game.api_football_time_fora_id), playerName: index ? "Meia Visitante" : "Camisa 9 Visitante", elapsed: 27 + index * 34, extra: null });
  }
  return { id_jogo: game.id_jogo, id_externo: game.api_football_id, eventos: events };
}

export function buildGameGoalEventsRoundPreview(games, round = 26) {
  return (games || [])
    .filter((game) => Number(game?.rodada) === Number(round) && game?.api_football_id)
    .map(buildGameGoalEventsPreview)
    .filter(Boolean);
}
