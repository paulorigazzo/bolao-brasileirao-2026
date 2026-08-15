import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOOTBALL_API_BASE, COMPETITION_CODE, SEASON_YEAR } from "../netlify/functions/_constants.mjs";
import { matchesListUrl } from "../netlify/functions/_sync-shared.mjs";
import { selectNearbyMatchIds } from "../netlify/functions/sincronizar-jogos-agendado.mjs";

assert.deepEqual(selectNearbyMatchIds([
  { id_jogo: 101, status: "agendado" },
  { id_jogo: 102, status: "em_andamento" },
  { id_jogo: 102, status: "em_andamento" },
  { id_jogo: 106, status: "intervalo" },
  { id_jogo: 103, status: "encerrado" },
  { id_jogo: 104, status: "adiado" },
  { id_jogo: 105, status: "cancelado" },
  { id_jogo: "inválido", status: "agendado" },
]), [101, 102, 106]);

assert.equal(
  matchesListUrl([102, 101, 102, "inválido"]),
  `${FOOTBALL_API_BASE}/matches?ids=102,101`,
);
assert.equal(
  matchesListUrl(),
  `${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/matches?season=${SEASON_YEAR}`,
);

const netlifyConfig = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(netlifyConfig, /schedule\s*=\s*"\* \* \* \* \*"/);
assert.match(app, /setInterval\(refreshLiveScoresSilently,60\*1000\)/);

console.log("Janela e frequência da sincronização ao vivo verificadas com sucesso.");
