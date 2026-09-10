import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20260910162957_backfill_lineup_reserves_round_26.sql", import.meta.url),
  "utf8",
);
const rollback = readFileSync(
  new URL("../supabase/rollback/rollback_backfill_lineup_reserves_round_26.sql", import.meta.url),
  "utf8",
);

const rowPattern = /^\s*\((55499\d), (149236\d), '(.+)'::jsonb, '([0-9a-f]{64})'\)[,;]$/gm;
const rows = [...migration.matchAll(rowPattern)].map((match) => ({
  gameId: Number(match[1]),
  fixtureId: Number(match[2]),
  lineups: JSON.parse(match[3].replaceAll("''", "'")),
  hash: match[4],
}));

assert.equal(rows.length, 10);
assert.deepEqual(rows.map((row) => row.gameId), Array.from({ length: 10 }, (_, index) => 554990 + index));
assert.deepEqual(rows.map((row) => row.fixtureId), Array.from({ length: 10 }, (_, index) => 1492360 + index));
assert.equal(rows.reduce((total, row) => total + row.lineups.home.substitutes.length + row.lineups.away.substitutes.length, 0), 239);

for (const row of rows) {
  assert.equal(row.lineups.home.starters.length, 11);
  assert.equal(row.lineups.away.starters.length, 11);
  assert.ok(row.lineups.home.substitutes.length > 0);
  assert.ok(row.lineups.away.substitutes.length > 0);
  assert.equal(createHash("sha256").update(JSON.stringify(row.lineups)).digest("hex"), row.hash);
}

assert.match(migration, /j\.rodada = 26 and j\.status = 'encerrado'/);
assert.match(migration, /existing_state_changed/);
assert.match(migration, /d\.escalacoes #- '\{home,substitutes\}' #- '\{away,substitutes\}'/);
assert.match(migration, /'preserveStatistics', true/);
assert.doesNotMatch(migration, /set\s+estatisticas\s*=/i);
assert.doesNotMatch(migration, /update\s+public\.jogos/i);
assert.doesNotMatch(migration, /update\s+public\.palpites/i);
assert.match(rollback, /v_audit -> 'backup'/);
assert.match(rollback, /current_state_changed/);
assert.match(rollback, /hash_escalacoes = backup\.item ->> 'hash_escalacoes'/);

console.log("Migração de reservas da Rodada 26 verificada com sucesso.");
