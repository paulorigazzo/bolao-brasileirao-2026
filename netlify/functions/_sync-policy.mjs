export function sanitizeGameForStatus(game, previous = null, repairs = []) {
  const previousHasScore = previous?.gols_casa != null && previous?.gols_fora != null;
  const apiHasScore = game?.gols_casa != null && game?.gols_fora != null;
  const nonPlayable = ["agendado", "adiado", "cancelado"].includes(game?.status);

  if (nonPlayable) {
    if (previousHasScore || apiHasScore) {
      const label = game.status === "agendado" ? "partida futura" : game.status === "adiado" ? "partida adiada" : "partida cancelada";
      repairs.push({
        id_jogo: game.id_jogo,
        previousStatus: previous?.status ?? null,
        apiStatus: game.status,
        previousScore: previousHasScore ? `${previous.gols_casa} × ${previous.gols_fora}` : null,
        reason: `placar incompatível removido de ${label}`,
      });
    }
    return { ...game, gols_casa: null, gols_fora: null };
  }

  if (game.status === "em_andamento" && !apiHasScore && previousHasScore) {
    return { ...game, gols_casa: Number(previous.gols_casa), gols_fora: Number(previous.gols_fora) };
  }

  if (game.status === "encerrado" && !apiHasScore) {
    if (previous?.status === "encerrado" && previousHasScore) {
      return { ...game, gols_casa: Number(previous.gols_casa), gols_fora: Number(previous.gols_fora) };
    }
    repairs.push({
      id_jogo: game.id_jogo,
      previousStatus: previous?.status ?? null,
      apiStatus: game.status,
      previousScore: previousHasScore ? `${previous.gols_casa} × ${previous.gols_fora}` : null,
      reason: "placar parcial não promovido a resultado final",
    });
    return { ...game, gols_casa: null, gols_fora: null };
  }

  return game;
}
