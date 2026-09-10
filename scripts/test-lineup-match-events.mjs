import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLineupMatchEventsModel } from "../js/lineup-match-events.js";

const player = (id, name) => ({ id, name, number: id, position: "M", grid: "1:1" });
const lineups = {
  home: { starters: [player(1, "Titular casa")], substitutes: [player(2, "Reserva casa")] },
  away: { starters: [player(3, "Titular fora")], substitutes: [player(4, "Reserva fora")] },
};
const game = { api_football_id: 9001, api_football_time_casa_id: 10, api_football_time_fora_id: 20 };
const projection = { id_externo: 9001, eventos: [
  { elapsed: 34, teamProviderId: 10, playerProviderId: 1, typeRaw: "Card", detailRaw: "Yellow Card" },
  { elapsed: 68, extra: 2, teamProviderId: 10, playerProviderId: 1, relatedPlayerProviderId: 2, typeRaw: "subst" },
  { elapsed: 75, teamProviderId: 20, playerProviderId: 4, typeRaw: "Card", detailRaw: "Red Card" },
  { elapsed: 80, teamProviderId: 20, playerProviderId: 999, relatedPlayerProviderId: 4, typeRaw: "subst" },
] };

const model = buildLineupMatchEventsModel(game, lineups, projection);
assert.deepEqual(model.home.get(1).cards, [{ kind: "yellow", minute: "34'" }]);
assert.deepEqual(model.home.get(1).substitution, { direction: "out", minute: "68+2'" });
assert.deepEqual(model.home.get(2).substitution, { direction: "in", minute: "68+2'" });
assert.deepEqual(model.away.get(4).cards, [{ kind: "red", minute: "75'" }]);
assert.equal(model.away.get(4).substitution, null, "substituição parcial não pode ser projetada");
assert.equal(buildLineupMatchEventsModel(game, lineups, { ...projection, id_externo: 8 }).home.size, 0);
const withoutIds = buildLineupMatchEventsModel(game, { home: { starters: [player(null, "Sem ID")], substitutes: [] }, away: lineups.away }, projection);
assert.equal(withoutIds.home.size, 0, "jogador sem identificador não pode entrar no índice");

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(app, /Banco e substituições/);
assert.match(app, /eventos_partida_cache[\s\S]*detailIds/);
assert.match(app, /benchToggle\?\.setAttribute\("aria-expanded","false"\)/);
console.log("Cartões, substituições e banco das escalações verificados com sucesso.");
