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

function utcDate(value) {
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) ? instant.toISOString().slice(0, 10) : null;
}

export function sanitizeGameSchedule(game, previous = null, repairs = []) {
  if (!previous) {
    return {
      ...game,
      situacao_agendamento: game?.status === "adiado" ? "adiado_sem_data" : "provisorio",
      fonte_agendamento: "football-data.org",
      agendamento_confirmado_em: null,
      data_base: utcDate(game?.inicio),
    };
  }

  const providerKickoff = new Date(game?.inicio).getTime();
  const canonicalKickoff = new Date(previous?.inicio).getTime();
  const kickoffChanged = Number.isFinite(providerKickoff)
    && Number.isFinite(canonicalKickoff)
    && providerKickoff !== canonicalKickoff;
  const protectedOfficialSchedule = previous?.situacao_agendamento === "confirmado"
    && previous?.fonte_agendamento === "cbf";

  if (protectedOfficialSchedule && kickoffChanged) {
    repairs.push({
      id_jogo: game.id_jogo,
      previousKickoff: previous.inicio,
      apiKickoff: game.inicio,
      action: "agendamento_oficial_preservado",
      reason: "divergência da football-data.org bloqueada diante de horário confirmado pela CBF",
    });
    return {
      ...game,
      inicio: previous.inicio,
      situacao_agendamento: previous.situacao_agendamento,
      fonte_agendamento: previous.fonte_agendamento,
      agendamento_confirmado_em: previous.agendamento_confirmado_em,
      data_base: previous.data_base,
    };
  }

  if (previous?.situacao_agendamento === "adiado_sem_data" && game?.status === "adiado") {
    return {
      ...game,
      inicio: previous.inicio,
      situacao_agendamento: previous.situacao_agendamento,
      fonte_agendamento: previous.fonte_agendamento,
      agendamento_confirmado_em: previous.agendamento_confirmado_em,
      data_base: previous.data_base,
    };
  }

  if (previous?.situacao_agendamento === "adiado_sem_data" && game?.status === "agendado") {
    repairs.push({
      id_jogo: game.id_jogo,
      previousKickoff: previous.inicio,
      apiKickoff: game.inicio,
      action: "nova_agenda_provisoria_observada",
      reason: "nova data do provedor requer confirmação antes de se tornar oficial",
    });
    return {
      ...game,
      situacao_agendamento: "provisorio",
      fonte_agendamento: "football-data.org",
      agendamento_confirmado_em: null,
      data_base: utcDate(game.inicio),
    };
  }

  return {
    ...game,
    situacao_agendamento: previous.situacao_agendamento,
    fonte_agendamento: previous.fonte_agendamento,
    agendamento_confirmado_em: previous.agendamento_confirmado_em,
    data_base: previous.data_base,
  };
}
