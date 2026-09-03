import { createHash } from "node:crypto";
import { normalizeApiFootballFixturesEnvelope, normalizeApiFootballStandingsEnvelope } from "../../src/sports-data/api-football-adapter.mjs";
import { normalizeMatch } from "./_sync-shared.mjs";
import { assertApiFootballQuota, buildApiFootballSyncPlan } from "./_api-football-official.mjs";
import { API_FOOTBALL_LEAGUE_ID, COMPETITION_CODE, FOOTBALL_API_BASE, SEASON_YEAR } from "./_constants.mjs";
import { officialSportsDataProvider, providerClassificationSnapshotId, SPORTS_DATA_PROVIDERS } from "./_sports-data-provider.mjs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const CONFIRMATION = "REHEARSE_API_FOOTBALL_CUTOVER";
const PAGE_SIZE = 1000;

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function readAll(supabase, table, columns, orderColumn) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select(columns).order(orderColumn, { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`rehearsal_${table}_read_failed:${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function requestJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers: { ...headers, Accept: "application/json" } });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function footballDataStandings(payload) {
  const total = (payload?.standings || []).find((item) => String(item?.type || "").toUpperCase() === "TOTAL");
  const table = Array.isArray(total?.table) ? total.table : [];
  if (table.length !== 20 || new Set(table.map((row) => Number(row.position))).size !== 20) throw new Error("football_data_standings_invalid");
  return table.map((row) => ({ position: Number(row.position), teamId: Number(row.team?.id), played: Number(row.playedGames),
    won: Number(row.won), drawn: Number(row.draw), lost: Number(row.lost), points: Number(row.points),
    goalsFor: Number(row.goalsFor), goalsAgainst: Number(row.goalsAgainst), goalDifference: Number(row.goalDifference) }));
}

function competitiveGames(rows) {
  return rows.map((row) => ({ id_jogo: row.id_jogo, inicio: row.inicio, status: row.status, gols_casa: row.gols_casa,
    gols_fora: row.gols_fora, minuto: row.minuto, acrescimos: row.acrescimos, time_casa: row.time_casa,
    time_fora: row.time_fora })).sort((a, b) => Number(a.id_jogo) - Number(b.id_jogo));
}

function competitivePicks(rows) {
  return rows.map((row) => ({ id_jogo: row.id_jogo, user_id: row.user_id, gols_casa: row.gols_casa,
    gols_fora: row.gols_fora })).sort((a, b) =>
    Number(a.id_jogo) - Number(b.id_jogo) || String(a.user_id).localeCompare(String(b.user_id)));
}

export function simulateProviderRollback() {
  const before = officialSportsDataProvider({});
  const promoted = officialSportsDataProvider({ SPORTS_DATA_OFFICIAL_PROVIDER: SPORTS_DATA_PROVIDERS.API_FOOTBALL });
  const restored = officialSportsDataProvider({ SPORTS_DATA_OFFICIAL_PROVIDER: SPORTS_DATA_PROVIDERS.FOOTBALL_DATA });
  return { sequence: [before, promoted, restored], restored: before === restored,
    cacheSequence: [before, promoted, restored].map((provider) => providerClassificationSnapshotId("BSA-2026", provider)) };
}

export async function runApiFootballCutoverRehearsal({ supabase, fetchImpl = fetch, apiFootballKey,
  footballDataToken, round, confirmation, crestProbe, now = () => new Date() }) {
  const roundNumber = Number(round);
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 38) throw new Error("rehearsal_round_invalid");
  if (confirmation !== CONFIRMATION) throw new Error("rehearsal_confirmation_invalid");
  if (!apiFootballKey) throw new Error("api_football_key_missing");
  if (!footballDataToken) throw new Error("football_data_token_missing");
  if (typeof crestProbe !== "function") throw new Error("api_football_local_crest_probe_missing");
  const observedAt = now().toISOString();
  const gameColumns = "id_jogo,rodada,time_casa,time_fora,inicio,status,gols_casa,gols_fora,minuto,acrescimos,minuto_estimado,periodo_estimado,relogio_referencia_em,situacao_agendamento,fonte_agendamento,agendamento_confirmado_em,data_base,local_partida,time_casa_id,time_fora_id,time_casa_logo,time_fora_logo,api_football_id,api_football_time_casa_id,api_football_time_fora_id";
  const pickColumns = "id_jogo,user_id,gols_casa,gols_fora";
  const beforeGames = await readAll(supabase, "jogos", gameColumns, "id_jogo");
  const beforePicks = await readAll(supabase, "palpites", pickColumns, "id_jogo");
  const canonicalRound = beforeGames.filter((game) => Number(game.rodada) === roundNumber);
  if (canonicalRound.length !== 10) throw new Error(`rehearsal_round_game_count_invalid:${canonicalRound.length}`);

  const [apiFixtures, apiStandings, officialFixtures, officialStandings] = await Promise.all([
    requestJson(fetchImpl, `${API_FOOTBALL_BASE}/fixtures?league=${API_FOOTBALL_LEAGUE_ID}&season=${SEASON_YEAR}`, { "x-apisports-key": apiFootballKey }),
    requestJson(fetchImpl, `${API_FOOTBALL_BASE}/standings?league=${API_FOOTBALL_LEAGUE_ID}&season=${SEASON_YEAR}`, { "x-apisports-key": apiFootballKey }),
    requestJson(fetchImpl, `${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/matches?season=${SEASON_YEAR}&matchday=${roundNumber}`, { "X-Auth-Token": footballDataToken, "X-Unfold-Goals": "true" }),
    requestJson(fetchImpl, `${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/standings?season=${SEASON_YEAR}`, { "X-Auth-Token": footballDataToken }),
  ]);
  const normalizedApi = normalizeApiFootballFixturesEnvelope(apiFixtures.payload, { observedAt,
    httpStatus: apiFixtures.response.status, headers: apiFixtures.response.headers });
  if (!normalizedApi.observation.responseValid) throw new Error(normalizedApi.observation.errors[0] || "api_football_fixtures_invalid");
  assertApiFootballQuota(normalizedApi.observation);
  const apiRound = normalizedApi.games.filter((game) => Number(game.roundNumber) === roundNumber);
  const plan = buildApiFootballSyncPlan({ canonicalGames: canonicalRound, providerGames: apiRound,
    requestedMatchIds: canonicalRound.map((game) => game.id_jogo), observedAt });
  const officialRound = (officialFixtures.payload?.matches || []).filter((match) => Number(match.matchday) === roundNumber).map(normalizeMatch);
  if (!officialFixtures.response.ok || officialRound.length !== 10) throw new Error(`football_data_round_invalid:${officialRound.length}`);
  if (!canonicalRound.every((game) => officialRound.some((official) => Number(official.id_jogo) === Number(game.id_jogo)))) throw new Error("football_data_identity_incomplete");
  const normalizedStandings = normalizeApiFootballStandingsEnvelope(apiStandings.payload, { observedAt,
    httpStatus: apiStandings.response.status, headers: apiStandings.response.headers });
  if (!normalizedStandings.observation.responseValid || !normalizedStandings.standings) throw new Error(normalizedStandings.observation.errors[0] || "api_football_standings_invalid");
  assertApiFootballQuota(normalizedStandings.observation);
  const localCrests = await crestProbe(normalizedStandings.standings.table.map((row) => row.providerTeamId));
  if (!localCrests?.ok || localCrests.clubs !== 20) throw new Error("api_football_local_crests_invalid");
  if (!officialStandings.response.ok) throw new Error(`football_data_standings_http_${officialStandings.response.status}`);
  const oldStandings = footballDataStandings(officialStandings.payload);

  const afterGames = await readAll(supabase, "jogos", gameColumns, "id_jogo");
  const afterPicks = await readAll(supabase, "palpites", pickColumns, "id_jogo");
  const hashes = { gamesBefore: sha256(competitiveGames(beforeGames)), gamesAfter: sha256(competitiveGames(afterGames)),
    picksBefore: sha256(competitivePicks(beforePicks)), picksAfter: sha256(competitivePicks(afterPicks)) };
  if (hashes.gamesBefore !== hashes.gamesAfter || hashes.picksBefore !== hashes.picksAfter) throw new Error("rehearsal_competitive_state_changed");
  const rollback = simulateProviderRollback();
  if (!rollback.restored) throw new Error("rehearsal_rollback_failed");
  const reportCore = { observedAt, round: roundNumber, canonicalGames: canonicalRound.length,
    mappedGames: plan.mappedCount, unmappedGames: plan.unmappedCount, apiFootballGames: apiRound.length,
    footballDataGames: officialRound.length, proposedChanges: plan.changedCount, proposedRepairs: plan.repairs.length,
    apiFootballStandings: normalizedStandings.standings.teamCount, footballDataStandings: oldStandings.length,
    quota: { dailyLimit: normalizedApi.observation.dailyLimit, dailyRemaining: normalizedApi.observation.dailyRemaining,
      minuteLimit: normalizedApi.observation.minuteLimit, minuteRemaining: normalizedApi.observation.minuteRemaining },
    localCrests: { ok: localCrests.ok, clubs: localCrests.clubs }, rollback, hashes, writes: 0 };
  return { ok: true, ...reportCore, reportHash: sha256(reportCore) };
}
