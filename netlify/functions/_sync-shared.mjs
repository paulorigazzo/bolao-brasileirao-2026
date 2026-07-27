import { serviceClient, isMissingTableError, requireEnv } from "./_api-helpers.mjs";
import { FOOTBALL_API_BASE, COMPETITION_CODE, SEASON_YEAR, MAX_API_CALLS_PER_SYNC } from "./_constants.mjs";
import { sanitizeGameForStatus } from "./_sync-policy.mjs";


const HOME_STADIUMS = [
  [["athletico", "athletico-pr", "athletico paranaense"], "Ligga Arena"],
  [["atletico mineiro", "atlético mineiro", "atletico-mg", "atlético-mg"], "Arena MRV"],
  [["bahia"], "Arena Fonte Nova"],
  [["botafogo"], "Estádio Nilton Santos"],
  [["chapecoense"], "Arena Condá"],
  [["corinthians"], "Neo Química Arena"],
  [["coritiba"], "Estádio Couto Pereira"],
  [["cruzeiro"], "Mineirão"],
  [["flamengo"], "Maracanã"],
  [["fluminense"], "Maracanã"],
  [["gremio", "grêmio"], "Arena do Grêmio"],
  [["internacional"], "Estádio Beira-Rio"],
  [["mirassol"], "Estádio José Maria de Campos Maia (Maião)"],
  [["palmeiras"], "Allianz Parque"],
  [["red bull bragantino", "rb bragantino", "bragantino"], "Estádio Cícero de Souza Marques"],
  [["remo"], "Mangueirão"],
  [["santos"], "Vila Belmiro"],
  [["sao paulo", "são paulo"], "Morumbis"],
  [["vasco", "vasco da gama"], "São Januário"],
  [["vitoria", "vitória"], "Barradão"],
];

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|sc|ec|saf|fr)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fallbackVenue(homeTeam) {
  const name = normalizeName(homeTeam?.shortName || homeTeam?.name);
  const found = HOME_STADIUMS.find(([aliases]) =>
    aliases.some((alias) => name.includes(normalizeName(alias)))
  );
  return found?.[1] || null;
}

function mapStatus(status) {
  const value = String(status || "").toUpperCase();
  if (["FINISHED", "AWARDED"].includes(value)) return "encerrado";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(value)) return "em_andamento";
  if (["POSTPONED", "SUSPENDED"].includes(value)) return "adiado";
  if (["CANCELLED"].includes(value)) return "cancelado";
  return "agendado";
}

function numericScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finalScore(match) {
  const score = match?.score || {};
  // Na football-data.org, fullTime também representa o placar corrente
  // enquanto a partida está em andamento.
  const candidates = [score.fullTime, score.regularTime, score.extraTime].filter(Boolean);

  for (const candidate of candidates) {
    const home = numericScore(candidate.home);
    const away = numericScore(candidate.away);
    if (home != null && away != null) return { home, away };
  }

  // Fallback para respostas com gols expandidos, útil quando a visão em lista
  // demora a preencher score.fullTime. Cada gol traz o placar naquele instante.
  const goals = Array.isArray(match?.goals) ? match.goals : [];
  for (let index = goals.length - 1; index >= 0; index -= 1) {
    const home = numericScore(goals[index]?.score?.home);
    const away = numericScore(goals[index]?.score?.away);
    if (home != null && away != null) return { home, away };
  }

  // Ao entrar em IN_PLAY/PAUSED, um jogo sem gols deve aparecer como 0 × 0.
  const status = String(match?.status || "").toUpperCase();
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return { home: 0, away: 0 };

  return { home: null, away: null };
}

function normalizeMatch(match) {
  const score = finalScore(match);
  return {
    id_jogo: Number(match.id),
    rodada: Number(match.matchday),
    time_casa: match.homeTeam?.shortName || match.homeTeam?.name || "A definir",
    time_fora: match.awayTeam?.shortName || match.awayTeam?.name || "A definir",
    inicio: match.utcDate,
    local_partida: match.venue || fallbackVenue(match.homeTeam),
    gols_casa: score.home,
    gols_fora: score.away,
    status: mapStatus(match.status),
    atualizado_em: new Date().toISOString(),
    time_casa_id: match.homeTeam?.id ?? null,
    time_fora_id: match.awayTeam?.id ?? null,
    time_casa_logo: match.homeTeam?.crest ?? null,
    time_fora_logo: match.awayTeam?.crest ?? null,
    fonte: "football-data.org",
    sincronizado_em: new Date().toISOString(),
  };
}


export async function syncGames(options = {}) {
  const startedAt = Date.now();
  const trigger = options.trigger || "manual";
  const maxApiCalls = Math.max(1, Math.min(Number(options.maxApiCalls) || MAX_API_CALLS_PER_SYNC, MAX_API_CALLS_PER_SYNC));
  let apiCalls = 0;
  let lastRateLimit = null;
  const token = requireEnv("FOOTBALL_DATA_TOKEN");
  const supabase = serviceClient();

  const footballFetch = async (url, init = {}) => {
    if (apiCalls >= maxApiCalls) throw new Error(`Limite interno de ${maxApiCalls} chamadas por sincronização atingido.`);
    apiCalls += 1;
    const response = await fetch(url, init);
    if (response.status === 429) {
      lastRateLimit = response.headers.get("retry-after") || null;
      const text = await response.text();
      const error = new Error(`football-data.org 429: limite de requisições atingido${lastRateLimit ? `; tente novamente em ${lastRateLimit}s` : ""}. ${text.slice(0, 200)}`);
      error.status = 429;
      throw error;
    }
    return response;
  };

  const response = await footballFetch(
    `${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/matches?season=${SEASON_YEAR}`,
    {
      headers: {
        "X-Auth-Token": token,
        "X-Unfold-Goals": "true",
        Accept: "application/json",
      },
    }
  );

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`football-data.org ${response.status}: ${rawText.slice(0, 500)}`);
  }

  const payload = JSON.parse(rawText);
  let matches = Array.isArray(payload.matches) ? payload.matches : [];

  // A listagem completa da competição pode chegar momentaneamente incompleta,
  // sobretudo após alterações de data ou status. Identificamos rodadas com menos
  // de 10 partidas e consultamos o endpoint específico da rodada para recuperar
  // jogos omitidos. Limitamos a 12 rodadas por execução para respeitar limites
  // da API; sincronizações seguintes completam as demais automaticamente.
  const roundCounts = new Map();
  for (const match of matches) {
    const round = Number(match?.matchday);
    if (Number.isFinite(round)) roundCounts.set(round, (roundCounts.get(round) || 0) + 1);
  }
  const incompleteRounds = Array.from({ length: 38 }, (_, index) => index + 1)
    .filter((round) => (roundCounts.get(round) || 0) > 0 && (roundCounts.get(round) || 0) < 10)
    .slice(0, 4);
  const recoveredRounds = [];

  if (incompleteRounds.length) {
    const supplemental = await Promise.allSettled(incompleteRounds.map(async (round) => {
      const roundResponse = await footballFetch(
        `${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/matches?season=${SEASON_YEAR}&matchday=${round}`,
        { headers: { "X-Auth-Token": token, "X-Unfold-Goals": "true", Accept: "application/json" } }
      );
      if (!roundResponse.ok) return [];
      const roundPayload = await roundResponse.json();
      const roundMatches = Array.isArray(roundPayload.matches) ? roundPayload.matches : [];
      if (roundMatches.length > (roundCounts.get(round) || 0)) recoveredRounds.push(round);
      return roundMatches;
    }));

    const byId = new Map(matches.filter((match) => match?.id).map((match) => [Number(match.id), match]));
    for (const result of supplemental) {
      if (result.status !== "fulfilled") continue;
      for (const match of result.value) {
        if (match?.id) byId.set(Number(match.id), match);
      }
    }
    matches = [...byId.values()];
  }

  const normalizedMatches = matches
    .filter((m) => m.id && m.matchday && m.utcDate && m.homeTeam && m.awayTeam)
    .map((raw) => ({ raw, game: normalizeMatch(raw) }));

  // A listagem geral da API pode, por alguns instantes, marcar uma partida como
  // encerrada antes de disponibilizar o placar final. Nesses casos consultamos o
  // detalhe da própria partida para evitar promover um placar parcial a resultado.
  const missingFinals = normalizedMatches.filter(({ game }) =>
    game.status === "encerrado" && (game.gols_casa == null || game.gols_fora == null)
  );

  for (const item of missingFinals.slice(0, Math.max(0, maxApiCalls - apiCalls))) {
    try {
      const detailResponse = await footballFetch(`${API_BASE}/matches/${item.game.id_jogo}`, {
        headers: {
          "X-Auth-Token": token,
          "X-Unfold-Goals": "true",
          Accept: "application/json",
        },
      });
      if (!detailResponse.ok) continue;
      const detail = await detailResponse.json();
      item.game = normalizeMatch(detail);
    } catch (error) {
      console.warn(`Não foi possível confirmar o placar final do jogo ${item.game.id_jogo}.`, error);
    }
  }

  const valid = normalizedMatches.map(({ game }) => game);

  if (!valid.length) {
    return {
      ok: false,
      imported: 0,
      message:
        "A API respondeu sem partidas válidas para a temporada 2026. O calendário pode ainda não estar publicado para essa assinatura.",
    };
  }

  // Não apaga um placar já conhecido quando uma resposta pontual da API vier
  // temporariamente sem os campos de score.
  const ids = valid.map((game) => game.id_jogo);
  const { data: existing, error: existingError } = await supabase
    .from("jogos")
    .select("id_jogo,status,gols_casa,gols_fora")
    .in("id_jogo", ids);
  if (existingError) throw new Error(`Supabase: ${existingError.message}`);
  const existingById = new Map((existing || []).map((game) => [Number(game.id_jogo), game]));
  const repairs = [];
  const merged = valid.map((game) => {
    const previous = existingById.get(Number(game.id_jogo));
    return sanitizeGameForStatus(game, previous, repairs);
  });

  const batchSize = 100;
  for (let i = 0; i < merged.length; i += batchSize) {
    const batch = merged.slice(i, i + batchSize);
    const { error } = await supabase
      .from("jogos")
      .upsert(batch, { onConflict: "id_jogo" });
    if (error) throw new Error(`Supabase: ${error.message}`);
  }

  const report = {
    ok: true,
    imported: merged.length,
    live: merged.filter((g) => g.status === "em_andamento").length,
    liveWithScore: merged.filter((g) => g.status === "em_andamento" && g.gols_casa != null && g.gols_fora != null).length,
    firstMatch: merged[0]?.inicio ?? null,
    lastMatch: merged.at(-1)?.inicio ?? null,
    finishedWithScore: merged.filter((g) => g.gols_casa != null && g.gols_fora != null).length,
    venuesFilled: merged.filter((g) => Boolean(g.local_partida)).length,
    repairedCount: repairs.length,
    repairs: repairs.slice(0, 50),
    atomicUpdate: true,
    recoveredRounds: recoveredRounds.sort((a, b) => a - b),
    incompleteRoundsChecked: incompleteRounds,
    apiCalls,
    apiCallLimit: maxApiCalls,
    trigger,
    durationMs: Date.now() - startedAt,
    rateLimitRetryAfter: lastRateLimit,
    synchronizedAt: new Date().toISOString(),
  };

  try {
    const { error: logError } = await supabase.from("api_sync_log").insert({
      origem: trigger,
      sucesso: true,
      duracao_ms: report.durationMs,
      chamadas_api: apiCalls,
      jogos_atualizados: merged.length,
      detalhes: report,
    });
    if (logError && !isMissingTableError(logError)) console.warn("Falha ao registrar sincronização:", logError.message);
  } catch (logError) {
    console.warn("Falha ao registrar sincronização:", logError);
  }

  return report;
}
