import assert from "node:assert/strict";
import { FOOTBALL_API_BASE } from "../netlify/functions/_constants.mjs";
import { matchDetailUrl } from "../netlify/functions/_sync-shared.mjs";

assert.equal(
  matchDetailUrl(123456),
  `${FOOTBALL_API_BASE}/matches/123456`,
);
assert.equal(
  matchDetailUrl("789"),
  `${FOOTBALL_API_BASE}/matches/789`,
);

console.log("Fallback de detalhe do resultado final verificado com sucesso.");
