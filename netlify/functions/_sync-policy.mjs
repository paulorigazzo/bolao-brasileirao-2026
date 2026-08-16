export function sanitizeGameForStatus(game, previous = null, repairs = []) {
  const previousHasScore = previous?.gols_casa != null && previous?.gols_fora != null;
  const apiHasScore = game?.gols_casa != null && game?.gols_fora != null;
  const previousFinishedWithScore = previous?.status === "encerrado" && previousHasScore;
  const nonPlayable = ["agendado", "adiado", "cancelado"].includes(game?.status);

  if (nonPlayable) {
    // Um resultado final já consolidado afeta Ranking, Estatísticas e a
    // publicidade dos palpites. Uma regressão isolada da API não pode apagar
    // esse histórico automaticamente; a divergência fica registrada para
    // revisão administrativa e uma eventual correção manual explícita.
    if (previousFinishedWithScore) {
      repairs.push({
        id_jogo: game.id_jogo,
        previousStatus: previous.status,
        apiStatus: game.status,
        previousScore: `${previous.gols_casa} × ${previous.gols_fora}`,
        apiScore: apiHasScore ? `${game.gols_casa} × ${game.gols_fora}` : null,
        action: "resultado_encerrado_preservado",
        reason: "regressão de resultado encerrado bloqueada para revisão",
      });
      return {
        ...game,
        status: "encerrado",
        gols_casa: Number(previous.gols_casa),
        gols_fora: Number(previous.gols_fora),
      };
    }

    if (previousHasScore || apiHasScore) {
      const label = game.status === "agendado" ? "partida futura" : game.status === "adiado" ? "partida adiada" : "partida cancelada";
      repairs.push({
        id_jogo: game.id_jogo,
        previousStatus: previous?.status ?? null,
        apiStatus: game.status,
        previousScore: previousHasScore ? `${previous.gols_casa} × ${previous.gols_fora}` : null,
        apiScore: apiHasScore ? `${game.gols_casa} × ${game.gols_fora}` : null,
        action: "placar_incompativel_removido",
        reason: `placar incompatível removido de ${label}`,
      });
    }
    return { ...game, gols_casa: null, gols_fora: null };
  }

  if (["em_andamento", "intervalo"].includes(game.status) && !apiHasScore && previousHasScore) {
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
