import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLineupPitchModel } from "../js/lineup-pitch.js";
import { lineupShirtTheme, LINEUP_SHIRT_THEME_KEYS } from "../js/lineup-shirt-themes.js";

const side = (formation, rows) => ({
  formation,
  coach: "Técnico",
  starters: rows.flatMap((count, row) => Array.from({ length: count }, (_, column) => ({
    id: `${formation}-${row}-${column}`,
    name: `Jogador ${row}-${column}`,
    number: row * 10 + column + 1,
    position: row === 0 ? "G" : "M",
    grid: `${row + 1}:${column + 1}`,
  }))),
});

const model = buildLineupPitchModel({ home: side("4-3-3", [1, 4, 3, 3]), away: side("4-2-3-1", [1, 4, 2, 3, 1]) });
assert.equal(model.available, true);
assert.equal(model.home.players.length, 11);
assert.equal(model.away.players.length, 11);
assert.equal(model.home.players[0].x, 50);
assert.equal(model.home.players[0].y, 8);
assert.equal(model.away.players[0].y, 92);
assert.ok(model.home.players.every((player) => player.x >= 12 && player.x <= 88 && player.y >= 8 && player.y <= 44));
assert.ok(model.away.players.every((player) => player.x >= 12 && player.x <= 88 && player.y >= 56 && player.y <= 92));
assert.equal(model.home.players.find((player) => player.x === 12)?.edge, "left");
assert.equal(model.home.players.find((player) => player.x === 88)?.edge, "right");

const invalid = side("4-3-3", [1, 4, 3, 3]);
invalid.starters[2].grid = "";
assert.equal(buildLineupPitchModel({ home: invalid, away: side("4-3-3", [1, 4, 3, 3]) }).available, false);

const duplicate = side("4-3-3", [1, 4, 3, 3]);
duplicate.starters[2].grid = duplicate.starters[1].grid;
assert.equal(buildLineupPitchModel({ home: duplicate, away: side("4-3-3", [1, 4, 3, 3]) }).available, false);

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../css/styles.css", import.meta.url), "utf8");
assert.match(app, /data-lineup-view="list"/);
assert.match(app, /data-lineup-view="pitch"/);
assert.match(app, /pitch\.available\?"":"disabled"/);
assert.match(app, /ArrowLeft.*ArrowRight/);
assert.match(styles, /premium-pitch-surface/);
assert.match(styles, /premium-pitch-shirt/);
assert.ok(LINEUP_SHIRT_THEME_KEYS.length >= 20);
for (const club of ["Fluminense", "São Paulo", "Grêmio", "Bahia", "Fortaleza"]) {
  assert.match(lineupShirtTheme(club).pattern, /gradient/);
}
assert.notEqual(lineupShirtTheme("Fluminense").pattern, lineupShirtTheme("São Paulo").pattern);
assert.equal(lineupShirtTheme("Clube do Remo").pattern, lineupShirtTheme("Remo").pattern);
assert.equal(lineupShirtTheme("Paranaense").pattern, lineupShirtTheme("Athletico-PR").pattern);
assert.match(lineupShirtTheme("Clube futuro").pattern, /linear-gradient/);
assert.match(app, /lineupShirtTheme\(teamName\)/);
assert.match(app, /is-edge-\$\{player\.edge\}/);
assert.match(styles, /premium-pitch-player\.is-edge-left/);
assert.match(styles, /premium-pitch-player\.is-edge-right/);

console.log("Campo tático das escalações verificado com sucesso.");
