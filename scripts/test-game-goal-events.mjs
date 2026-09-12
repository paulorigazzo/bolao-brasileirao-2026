import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGameGoalEventsModel } from "../js/game-goal-events.js";
import { buildApiFootballEventProjection } from "../src/sports-data/api-football-event-projection.mjs";
import { buildGameGoalEventsRoundPreview, isGameGoalEventsPreview } from "../js/game-goal-events-preview.js";

const observedAt = "2026-09-08T19:30:00.000Z";
const canonical = { id_jogo: 1, api_football_id: 9001, api_football_time_casa_id: 10, api_football_time_fora_id: 20 };
const events = [
  { providerEventKey: "a", elapsed: 12, extra: null, teamProviderId: 10, playerName: "JoÃ£o da Casa", typeRaw: "Goal", detailRaw: "Normal Goal" },
  { providerEventKey: "b", elapsed: 45, extra: 3, teamProviderId: 20, playerName: "Visitante com Nome Muito Longo", typeRaw: "Goal", detailRaw: "Penalty" },
  { providerEventKey: "c", elapsed: 77, extra: null, teamProviderId: 10, playerName: "Atacante da Casa", typeRaw: "Goal", detailRaw: "Own Goal" },
  { providerEventKey: "d", elapsed: 80, extra: null, teamProviderId: 20, playerName: "Cartão não exibido", typeRaw: "Card", detailRaw: "Yellow Card" },
  { providerEventKey: "e", elapsed: 90, extra: 1, teamProviderId: 10, playerName: "Pênalti perdido", typeRaw: "Goal", detailRaw: "Missed Penalty" },
];
const provider = { providerFixtureId: 9001, score: { home: 2, away: 1 }, status: { isLive: false, isFinal: true },
  eventObservation: { available: true, valid: true }, events };

const projection = buildApiFootballEventProjection(provider, canonical, observedAt);
assert.equal(projection.eligible, true);
assert.equal(projection.row.eventos.length, 5);
assert.match(projection.row.hash_eventos, /^[0-9a-f]{64}$/);
const model = buildGameGoalEventsModel({ ...canonical, gols_casa: 2, gols_fora: 1 }, projection.row);
assert.equal(model.status, "ready");
assert.deepEqual(model.home.map((goal) => [goal.player, goal.minute, goal.marker]), [
  ["João da Casa", "12'", ""], ["Atacante da Casa", "77'", " (GC)"],
]);
assert.deepEqual(model.away.map((goal) => [goal.minute, goal.marker]), [["45+3'", " (P)"]]);
assert.equal(model.home.some((goal) => goal.player === "Pênalti perdido"), false);
assert.equal(buildGameGoalEventsModel({ ...canonical, gols_casa: 0, gols_fora: 0 }, null).status, "hidden");
assert.equal(buildGameGoalEventsModel({ ...canonical, gols_casa: 1, gols_fora: 0 }, null).status, "updating");
assert.equal(buildApiFootballEventProjection({ ...provider, score: { home: 3, away: 1 } }, canonical, observedAt).reason, "goal_count_mismatch");
assert.equal(buildApiFootballEventProjection({ ...provider, eventObservation: { available: false, valid: false } }, canonical, observedAt).reason, "events_unavailable");
assert.equal(isGameGoalEventsPreview({ hostname: "deploy-preview-211--example.netlify.app", search: "?goalEventsPreview=1" }), true);
assert.equal(isGameGoalEventsPreview({ hostname: "bolaorigazzo2026.netlify.app", search: "?goalEventsPreview=1" }), false);
const roundPreviews=buildGameGoalEventsRoundPreview([
  { ...canonical, id_jogo: 1, rodada: 26, gols_casa: 2, gols_fora: 1 },
  { ...canonical, id_jogo: 2, rodada: 26, gols_casa: 0, gols_fora: 0 },
  { ...canonical, id_jogo: 3, rodada: 26, gols_casa: 1, gols_fora: 1 },
  { ...canonical, id_jogo: 4, rodada: 25, gols_casa: 3, gols_fora: 0 },
]);
assert.deepEqual(roundPreviews.map((item) => item.id_jogo), [1, 3]);
assert.deepEqual(roundPreviews.map((item) => item.eventos.length), [3, 2]);

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const matchup = app.indexOf('<div class="premium-expanded-matchup">');
const goalBlock = app.indexOf("${premiumGoalEvents(g)}", matchup);
const comparison = app.indexOf("${resultComparison}", matchup);
const details = app.indexOf("${premiumGameDetails(g)}", matchup);
assert.ok(matchup >= 0 && comparison > matchup && goalBlock > comparison && details > goalBlock);
assert.match(app, /eventos_partida_cache[\s\S]*Os detalhes dos gols não puderam ser carregados/);

const migration = readFileSync(new URL("../supabase/migrations/20260908193143_add_game_event_projection.sql", import.meta.url), "utf8");
assert.match(migration, /enable row level security/);
assert.match(migration, /to authenticated[\s\S]*auth\.uid\(\)[\s\S]*p\.ativo is true/);
assert.match(migration, /grant select on table public\.eventos_partida_cache to authenticated/);
assert.doesNotMatch(migration, /grant [^;]* to anon/);

console.log("Projeção e apresentação dos autores dos gols verificadas com sucesso.");
